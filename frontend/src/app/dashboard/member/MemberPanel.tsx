"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookCover } from "@/components/BookCover";

type Me = {
  mfaEnabled: boolean;
};

type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  coverImageUrl: string | null;
  copiesAvailable: number;
};

type Borrow = {
  id: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  book: Book;
};

export default function MemberPanel() {
  const [me, setMe] = useState<Me | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [category, setCategory] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");

  const refresh = useCallback(async () => {
    setErr(null);
    const [meRes, bRes, brRes] = await Promise.all([
      fetch("/api/auth/me", { cache: "no-store" }),
      fetch("/api/books", { cache: "no-store" }),
      fetch("/api/borrows", { cache: "no-store" }),
    ]);
    const meJson = await meRes.json().catch(() => ({}));
    const bJson = await bRes.json().catch(() => ({}));
    const brJson = await brRes.json().catch(() => ({}));
    if (meJson.user) setMe({ mfaEnabled: meJson.user.mfaEnabled });
    if (!bRes.ok) setErr(bJson.error || "Books failed");
    else setBooks(bJson.books || []);
    if (!brRes.ok) setErr(brJson.error || "Loans failed");
    else setBorrows(brJson.borrows || []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => set.add(b.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [books]);

  const displayedBooks = useMemo(() => {
    if (!category) return books;
    return books.filter((b) => b.category === category);
  }, [books, category]);

  async function startMfa() {
    setErr(null);
    setInfo(null);
    const res = await fetch("/api/mfa/setup", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "MFA setup failed");
      return;
    }
    setQr(data.qrDataUrl || null);
    setSecret(data.secret || null);
  }

  async function confirmMfa(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/mfa/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: confirmCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "Invalid code");
      return;
    }
    setInfo("MFA enabled. You can borrow books now.");
    setQr(null);
    setSecret(null);
    setConfirmCode("");
    await refresh();
  }

  async function borrow(bookId: string) {
    setErr(null);
    setInfo(null);
    const res = await fetch("/api/borrows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "Borrow failed");
      return;
    }
    setInfo("Book borrowed for 15 days.");
    await refresh();
  }

  async function returnBook(id: string) {
    setErr(null);
    const res = await fetch(`/api/borrows/${id}/return`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "Return failed");
      return;
    }
    await refresh();
  }

  const mfaOn = me?.mfaEnabled;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-white">Member lounge</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Borrowing is unlocked only after MFA. Each loan lasts{" "}
          <span className="text-cyan-200">15 days</span> and updates the shared
          catalog for everyone.
        </p>
      </div>

      {err && (
        <p className="text-sm text-rose-300" role="alert">
          {err}
        </p>
      )}
      {info && <p className="text-sm text-emerald-300">{info}</p>}

      <section className="glass rounded-3xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Authenticator MFA</h2>
            <p className="mt-1 text-sm text-slate-500">
              Scan the QR with Google Authenticator, Authy, or 1Password.
            </p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
              mfaOn
                ? "bg-emerald-500/15 text-emerald-200"
                : "bg-amber-500/15 text-amber-100"
            }`}
          >
            {mfaOn ? "MFA enabled" : "Action required"}
          </span>
        </div>

        {!mfaOn && (
          <div className="mt-6 space-y-4">
            {!qr ? (
              <button type="button" className="btn-primary" onClick={() => startMfa()}>
                Start MFA setup
              </button>
            ) : (
              <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt="MFA QR code"
                  className="rounded-2xl border border-white/10 bg-white p-2"
                />
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Manual secret (base32):
                  </p>
                  <code className="block break-all rounded-xl bg-black/40 p-3 text-xs text-cyan-100">
                    {secret}
                  </code>
                  <form onSubmit={confirmMfa} className="space-y-2">
                    <input
                      className="input font-mono"
                      placeholder="6-digit code"
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn-primary w-full py-2">
                      Confirm & enable
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">My loans</h2>
          <button type="button" className="btn-ghost text-xs" onClick={() => refresh()}>
            Refresh
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2 pr-3">Book</th>
                <th className="pb-2 pr-3">Borrowed</th>
                <th className="pb-2 pr-3">Due</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {borrows.filter((b) => !b.returnedAt).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-slate-500">
                    No active loans.
                  </td>
                </tr>
              ) : (
                borrows
                  .filter((b) => !b.returnedAt)
                  .map((b) => (
                    <tr key={b.id}>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10">
                            <BookCover
                              title={b.book.title}
                              src={b.book.coverImageUrl}
                              className="h-14 w-10"
                            />
                          </div>
                          <span className="font-medium text-white">
                            {b.book.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-400">
                        {new Date(b.borrowedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-3 text-xs text-amber-200">
                        {new Date(b.dueAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          className="text-xs text-cyan-300 hover:underline"
                          onClick={() => returnBook(b.id)}
                        >
                          Return
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold text-white">Browse catalog</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Category</span>
            <select
              className="input max-w-[220px] py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayedBooks.map((book) => {
            const disabled = !mfaOn || book.copiesAvailable < 1;
            return (
              <article
                key={book.id}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900/35 shadow-xl shadow-black/25 transition hover:border-cyan-400/30"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden">
                  <BookCover
                    title={book.title}
                    src={book.coverImageUrl}
                    className="h-full w-full transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-100 ring-1 ring-white/10 backdrop-blur-md">
                    {book.category}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-semibold leading-tight text-white drop-shadow">
                      {book.title}
                    </h3>
                    <p className="text-sm text-cyan-100/90">{book.author}</p>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <p className="text-xs text-slate-400">
                    {book.copiesAvailable} copy
                    {book.copiesAvailable === 1 ? "" : "ies"} on shelf
                  </p>
                  <button
                    type="button"
                    disabled={disabled}
                    className="btn-primary w-full py-2.5 text-sm"
                    onClick={() => borrow(book.id)}
                  >
                    {!mfaOn
                      ? "Enable MFA to borrow"
                      : book.copiesAvailable < 1
                        ? "Unavailable"
                        : "Borrow (15 days)"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
