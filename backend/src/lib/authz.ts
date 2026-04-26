import type { Request, Response } from "express";
import type { Role, User } from "@prisma/client";
import { parse } from "cookie";
import { prisma } from "./prisma.js";
import { verifySessionToken } from "./jwt.js";

const SESSION_COOKIE = "library_session";

async function getSessionPayload(req: Request) {
  const raw = parse(req.headers.cookie || "")[SESSION_COOKIE];
  if (!raw) return null;
  return verifySessionToken(raw);
}

export async function getCurrentUser(req: Request): Promise<User | null> {
  const session = await getSessionPayload(req);
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.sub } });
}

/** Returns user or sends JSON error and returns null. */
export async function requireUser(
  req: Request,
  res: Response,
  allowed?: Role[],
): Promise<User | null> {
  const user = await getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  if (allowed && !allowed.includes(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return user;
}
