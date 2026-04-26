import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { verifyPassword, hashPassword } from "../lib/password.js";
import { signMfaChallengeToken, verifyMfaChallengeToken, } from "../lib/jwt.js";
import { setSessionCookieOnResponse, clearSessionCookieOnResponse, } from "../cookie-session.js";
import { getCurrentUser, requireUser } from "../lib/authz.js";
import { jsonError } from "../lib/api-errors.js";
import { openLibraryCoverUrl } from "../lib/book-cover.js";
import { whereBorrowIsActive } from "../lib/borrow-queries.js";
import { generateTotpSecret, totpAuthUrl, totpQrDataUrl, verifyTotp, } from "../lib/mfa.js";
const LOAN_DAYS = 15;
function paramId(value) {
    if (value === undefined)
        return undefined;
    return Array.isArray(value) ? value[0] : value;
}
export const apiRouter = Router();
apiRouter.post("/auth/login", async (req, res) => {
    const bodySchema = z.object({
        email: z.string().email().max(320),
        password: z.string().min(1).max(200),
    });
    let body;
    try {
        body = bodySchema.parse(req.body);
    }
    catch {
        return jsonError(res, "Invalid request", 400);
    }
    const user = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
    });
    if (!user) {
        return jsonError(res, "Invalid email or password", 401);
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
        return jsonError(res, "Invalid email or password", 401);
    }
    if (user.mfaEnabled && user.mfaSecret) {
        const challengeToken = await signMfaChallengeToken(user.id);
        return res.json({
            mfaRequired: true,
            challengeToken,
        });
    }
    await setSessionCookieOnResponse(res, { sub: user.id, role: user.role });
    return res.json({
        mfaRequired: false,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mfaEnabled: user.mfaEnabled,
        },
    });
});
apiRouter.post("/auth/mfa", async (req, res) => {
    const bodySchema = z.object({
        challengeToken: z.string().min(10),
        code: z.string().min(6).max(12),
    });
    let body;
    try {
        body = bodySchema.parse(req.body);
    }
    catch {
        return jsonError(res, "Invalid request", 400);
    }
    const userId = await verifyMfaChallengeToken(body.challengeToken);
    if (!userId) {
        return jsonError(res, "Invalid or expired challenge", 401);
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaEnabled || !user.mfaSecret) {
        return jsonError(res, "MFA not configured", 400);
    }
    if (!verifyTotp(user.mfaSecret, body.code.replace(/\s/g, ""))) {
        return jsonError(res, "Invalid code", 401);
    }
    await setSessionCookieOnResponse(res, { sub: user.id, role: user.role });
    return res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mfaEnabled: user.mfaEnabled,
        },
    });
});
apiRouter.post("/auth/logout", (_req, res) => {
    clearSessionCookieOnResponse(res);
    return res.json({ ok: true });
});
apiRouter.get("/auth/me", async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
        return res.json({ user: null });
    }
    return res.setHeader("Cache-Control", "no-store").json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mfaEnabled: user.mfaEnabled,
        },
    });
});
apiRouter.post("/auth/register", async (req, res) => {
    const bodySchema = z.object({
        email: z.string().email().max(320),
        name: z.string().min(1).max(120),
        password: z.string().min(8).max(128),
        role: z.enum(["MEMBER", "LIBRARIAN"]),
    });
    let body;
    try {
        body = bodySchema.parse(req.body);
    }
    catch {
        return jsonError(res, "Invalid request", 400);
    }
    const email = body.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
        return jsonError(res, "An account with this email already exists", 409);
    }
    const passwordHash = await hashPassword(body.password);
    const role = body.role === "LIBRARIAN" ? Role.LIBRARIAN : Role.MEMBER;
    await prisma.user.create({
        data: {
            email,
            name: body.name.trim(),
            passwordHash,
            role,
            mfaEnabled: false,
        },
        select: { id: true },
    });
    return res.status(201).json({ ok: true });
});
apiRouter.get("/books", async (req, res) => {
    const u = await requireUser(req, res, [
        Role.ADMIN,
        Role.LIBRARIAN,
        Role.MEMBER,
    ]);
    if (!u)
        return;
    const category = typeof req.query.category === "string" ? req.query.category : null;
    const where = category && category.trim().length > 0
        ? { category: category.trim() }
        : {};
    const books = await prisma.book.findMany({
        where,
        orderBy: [{ category: "asc" }, { title: "asc" }],
    });
    return res.json({ books });
});
apiRouter.post("/books", async (req, res) => {
    const u = await requireUser(req, res, [Role.LIBRARIAN]);
    if (!u)
        return;
    const createSchema = z.object({
        title: z.string().min(1).max(300),
        author: z.string().min(1).max(200),
        isbn: z.string().max(32).optional().nullable(),
        category: z.string().min(1).max(80).optional(),
        coverImageUrl: z.string().max(2000).optional().nullable(),
        copiesTotal: z.number().int().min(1).max(500).optional(),
    });
    let body;
    try {
        body = createSchema.parse(req.body);
    }
    catch {
        return jsonError(res, "Invalid request", 400);
    }
    const copies = body.copiesTotal ?? 1;
    const isbn = body.isbn && body.isbn.trim().length > 0 ? body.isbn.trim() : null;
    const category = (body.category?.trim() || "General").slice(0, 80);
    let coverImageUrl = body.coverImageUrl && body.coverImageUrl.trim().length > 0
        ? body.coverImageUrl.trim()
        : null;
    if (coverImageUrl) {
        try {
            const url = new URL(coverImageUrl);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return jsonError(res, "Cover image URL must be http(s)", 400);
            }
        }
        catch {
            return jsonError(res, "Invalid cover image URL", 400);
        }
    }
    if (!coverImageUrl && isbn) {
        coverImageUrl = openLibraryCoverUrl(isbn);
    }
    if (isbn) {
        const dup = await prisma.book.findUnique({ where: { isbn } });
        if (dup)
            return jsonError(res, "ISBN already exists", 409);
    }
    const book = await prisma.book.create({
        data: {
            title: body.title.trim(),
            author: body.author.trim(),
            isbn,
            category,
            coverImageUrl,
            copiesTotal: copies,
            copiesAvailable: copies,
        },
    });
    return res.status(201).json({ book });
});
apiRouter.delete("/books/:id", async (req, res) => {
    const u = await requireUser(req, res, [Role.LIBRARIAN]);
    if (!u)
        return;
    const id = paramId(req.params.id);
    if (!id)
        return jsonError(res, "Invalid id", 400);
    const active = await prisma.borrow.count({
        where: { bookId: id, ...whereBorrowIsActive },
    });
    if (active > 0) {
        return jsonError(res, "Cannot remove book with active loans", 409);
    }
    try {
        await prisma.book.delete({ where: { id } });
    }
    catch {
        return jsonError(res, "Book not found", 404);
    }
    return res.json({ ok: true });
});
apiRouter.get("/borrows", async (req, res) => {
    const u = await requireUser(req, res, [
        Role.ADMIN,
        Role.LIBRARIAN,
        Role.MEMBER,
    ]);
    if (!u)
        return;
    if (u.role === Role.MEMBER) {
        const borrows = await prisma.borrow.findMany({
            where: { userId: u.id },
            include: { book: true },
            orderBy: { borrowedAt: "desc" },
        });
        return res
            .setHeader("Cache-Control", "no-store, max-age=0")
            .json({ borrows });
    }
    const borrows = await prisma.borrow.findMany({
        where: whereBorrowIsActive,
        include: {
            book: true,
            user: {
                select: { id: true, name: true, email: true, mfaEnabled: true },
            },
        },
        orderBy: { borrowedAt: "desc" },
    });
    return res
        .setHeader("Cache-Control", "no-store, max-age=0")
        .json({ borrows });
});
apiRouter.post("/borrows", async (req, res) => {
    const u = await requireUser(req, res, [Role.MEMBER]);
    if (!u)
        return;
    if (!u.mfaEnabled) {
        return jsonError(res, "Members must enable MFA before borrowing books", 403);
    }
    const borrowSchema = z.object({
        bookId: z.string().min(1),
    });
    let body;
    try {
        body = borrowSchema.parse(req.body);
    }
    catch {
        return jsonError(res, "Invalid request", 400);
    }
    const result = await prisma.$transaction(async (tx) => {
        const book = await tx.book.findUnique({ where: { id: body.bookId } });
        if (!book)
            return { err: "not_found" };
        if (book.copiesAvailable < 1)
            return { err: "unavailable" };
        const existing = await tx.borrow.findFirst({
            where: {
                userId: u.id,
                bookId: book.id,
                ...whereBorrowIsActive,
            },
        });
        if (existing)
            return { err: "already" };
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + LOAN_DAYS);
        const borrow = await tx.borrow.create({
            data: {
                userId: u.id,
                bookId: book.id,
                dueAt,
                returnedAt: null,
            },
            include: { book: true },
        });
        await tx.book.update({
            where: { id: book.id },
            data: { copiesAvailable: { decrement: 1 } },
        });
        return { borrow };
    });
    if (result.err === "not_found")
        return jsonError(res, "Book not found", 404);
    if (result.err === "unavailable")
        return jsonError(res, "No copies available", 409);
    if (result.err === "already")
        return jsonError(res, "You already have this book on loan", 409);
    return res.status(201).json({ borrow: result.borrow });
});
apiRouter.post("/borrows/:id/return", async (req, res) => {
    const u = await requireUser(req, res, [Role.MEMBER, Role.LIBRARIAN]);
    if (!u)
        return;
    const id = paramId(req.params.id);
    if (!id)
        return jsonError(res, "Invalid id", 400);
    const borrow = await prisma.borrow.findUnique({
        where: { id },
        include: { book: true },
    });
    if (!borrow || borrow.returnedAt) {
        return jsonError(res, "Loan not found or already returned", 404);
    }
    if (u.role === Role.MEMBER && borrow.userId !== u.id) {
        return jsonError(res, "Forbidden", 403);
    }
    await prisma.$transaction([
        prisma.borrow.update({
            where: { id },
            data: { returnedAt: new Date() },
        }),
        prisma.book.update({
            where: { id: borrow.bookId },
            data: { copiesAvailable: { increment: 1 } },
        }),
    ]);
    return res.json({ ok: true });
});
apiRouter.get("/users", async (req, res) => {
    const u = await requireUser(req, res, [Role.ADMIN]);
    if (!u)
        return;
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            mfaEnabled: true,
            createdAt: true,
        },
    });
    return res.json({ users });
});
apiRouter.post("/users", async (req, res) => {
    const u = await requireUser(req, res, [Role.ADMIN]);
    if (!u)
        return;
    const createSchema = z.object({
        email: z.string().email().max(320),
        name: z.string().min(1).max(120),
        password: z.string().min(8).max(128),
        role: z.enum(["ADMIN", "LIBRARIAN", "MEMBER"]),
    });
    let body;
    try {
        body = createSchema.parse(req.body);
    }
    catch {
        return jsonError(res, "Invalid request", 400);
    }
    const email = body.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
        return jsonError(res, "Email already in use", 409);
    }
    const passwordHash = await hashPassword(body.password);
    const created = await prisma.user.create({
        data: {
            email,
            name: body.name,
            passwordHash,
            role: body.role,
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            mfaEnabled: true,
            createdAt: true,
        },
    });
    return res.status(201).json({ user: created });
});
apiRouter.delete("/users/:id", async (req, res) => {
    const admin = await requireUser(req, res, [Role.ADMIN]);
    if (!admin)
        return;
    const id = paramId(req.params.id);
    if (!id)
        return jsonError(res, "Invalid id", 400);
    if (id === admin.id) {
        return jsonError(res, "You cannot delete your own account", 400);
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
        return jsonError(res, "User not found", 404);
    }
    const active = await prisma.borrow.findMany({
        where: { userId: id, ...whereBorrowIsActive },
        select: { id: true, bookId: true },
    });
    await prisma.$transaction(async (tx) => {
        for (const b of active) {
            await tx.borrow.update({
                where: { id: b.id },
                data: { returnedAt: new Date() },
            });
            await tx.book.update({
                where: { id: b.bookId },
                data: { copiesAvailable: { increment: 1 } },
            });
        }
        await tx.user.delete({ where: { id } });
    });
    return res.json({ ok: true });
});
apiRouter.post("/mfa/setup", async (req, res) => {
    const u = await requireUser(req, res, [Role.MEMBER]);
    if (!u)
        return;
    const secret = generateTotpSecret();
    await prisma.user.update({
        where: { id: u.id },
        data: { mfaSecret: secret, mfaEnabled: false },
    });
    const issuer = "LibraryM";
    const otpauthUrl = totpAuthUrl({
        email: u.email,
        issuer,
        secret,
    });
    const qrDataUrl = await totpQrDataUrl(otpauthUrl);
    return res.json({
        secret,
        otpauthUrl,
        qrDataUrl,
    });
});
apiRouter.post("/mfa/confirm", async (req, res) => {
    const u = await requireUser(req, res, [Role.MEMBER]);
    if (!u)
        return;
    const bodySchema = z.object({
        code: z.string().min(6).max(12),
    });
    let body;
    try {
        body = bodySchema.parse(req.body);
    }
    catch {
        return jsonError(res, "Invalid request", 400);
    }
    if (!u.mfaSecret) {
        return jsonError(res, "Run MFA setup first", 400);
    }
    const ok = verifyTotp(u.mfaSecret, body.code.replace(/\s/g, ""));
    if (!ok) {
        return jsonError(res, "Invalid code", 401);
    }
    await prisma.user.update({
        where: { id: u.id },
        data: { mfaEnabled: true },
    });
    return res.json({ ok: true, mfaEnabled: true });
});
//# sourceMappingURL=api.js.map