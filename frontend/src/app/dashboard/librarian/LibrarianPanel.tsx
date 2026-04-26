"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookCover } from "@/components/BookCover";

type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string;
  coverImageUrl: string | null;
  copiesTotal: number;
  copiesAvailable: number;
};

type ActiveBorrow = {
  id: string;
  borrowedAt: string;
  dueAt: string;
  book: Book;
  user: { id: string; name: string; email: string; mfaEnabled: boolean };
};

const CATEGORIES = [
  "General",
  "Fiction",
  "Literary Fiction",
  "Fantasy",
  "Science Fiction",
  "Mystery",
  "Thriller",
  "Romance",
  "Young Adult",
  "Classics",
  "Biography",
  "History",
  "Science",
  "Technology",
  "Business",
  "Self-Help",
  "Psychology",
  "Health",
  "Philosophy",
  "Poetry",
  "Art & Design",
  "Politics",
];

export default function LibrarianPanel() {
  const [books, setBooks] = useState<Book[]>([]);
  const [borrows, setBorrows] = useState<ActiveBorrow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [category, setCategory] = useState("General");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [copies, setCopies] = useState(1);

  const refresh = useCallback(async () => {
    setErr(null);
    const [bRes, brRes] = await Promise.all([
      fetch("/api/books", { cache: "no-store" }),
      fetch("/api/borrows", { cache: "no-store" }),
    ]);
    const bJson = await bRes.json().catch(() => ({}));
    const brJson = await brRes.json().catch(() => ({}));
    if (!bRes.ok) setErr(bJson.error || "Books failed");
    else setBooks(bJson.books || []);
    if (!brRes.ok) setErr(brJson.error || "Loans failed");
    else setBorrows(brJson.borrows || []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addBook(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const payload: Record<string, unknown> = {
      title,
      author,
      isbn: isbn.trim() || null,
      category,
      copiesTotal: copies,
    };
    if (coverImageUrl.trim()) {
      payload.coverImageUrl = coverImageUrl.trim();
    }
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "Could not add book");
      return;
    }
    setTitle("");
    setAuthor("");
    setIsbn("");
    setCategory("General");
    setCoverImageUrl("");
    setCopies(1);
    await refresh();
  }

  async function removeBook(id: string) {
    if (!confirm("Remove this title from the catalog?")) return;
    setErr(null);
    const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "Could not remove");
      return;
    }
    await refresh();
  }

  async function returnLoan(id: string) {
    setErr(null);
    const res = await fetch(`/api/borrows/${id}/return`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "Return failed");
      return;
    }
    await refresh();
  }

  const categoryOptions = useMemo(() => {
    const fromBooks = new Set(books.map((b) => b.category));
    const merged = [...CATEGORIES];
    fromBooks.forEach((c) => {
      if (c && !merged.includes(c)) merged.push(c);
    });
    return merged.sort((a, b) => a.localeCompare(b));
  }, [books]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Librarian desk</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Add titles with category and cover art (HTTPS URL or leave blank to
            use Open Library when ISBN is set).
          </p>
        </div>
        <button type="button" className="btn-ghost self-start" onClick={() => refresh()}>
          Sync data
        </button>
      </div>

      {err && (
        <p className="text-sm text-rose-300" role="alert">
          {err}
        </p>
      )}

      <section className="glass rounded-3xl p-6">
        <h2 className="text-lg font-semibold text-white">Add title</h2>
        <form onSubmit={addBook} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            className="input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="ISBN (optional — enables auto cover)"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className="input md:col-span-2"
            placeholder="Cover image URL (https://… optional)"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <input
              className="input max-w-[120px]"
              type="number"
              min={1}
              max={500}
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
            />
            <span className="text-xs text-slate-500">copies</span>
            <button type="submit" className="btn-primary px-6 py-2">
              Add to catalog
            </button>
          </div>
        </form>
      </section>

      <section className="glass rounded-3xl p-6">
        <h2 className="text-lg font-semibold text-white">Active loans</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2 pr-3">Member</th>
                <th className="pb-2 pr-3">Book</th>
                <th className="pb-2 pr-3">Borrowed</th>
                <th className="pb-2 pr-3">Due</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {borrows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-slate-500">
                    No active loans.
                  </td>
                </tr>
              ) : (
                borrows.map((b) => (
                  <tr key={b.id}>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-white">{b.user.name}</p>
                      <p className="text-xs text-slate-500">{b.user.email}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10">
                          <BookCover
                            title={b.book.title}
                            src={b.book.coverImageUrl}
                            className="h-12 w-9"
                          />
                        </div>
                        <span className="text-sm">{b.book.title}</span>
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
                        onClick={() => returnLoan(b.id)}
                      >
                        Check in
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass rounded-3xl p-6">
        <h2 className="text-lg font-semibold text-white">Catalog</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {books.map((book) => (
            <article
              key={book.id}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 shadow-lg shadow-black/20 transition hover:border-cyan-400/25"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                <BookCover
                  title={book.title}
                  src={book.coverImageUrl}
                  className="h-full w-full transition duration-300 group-hover:scale-[1.02]"
                />
                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100 backdrop-blur-sm">
                  {book.category}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold leading-snug text-white">
                      {book.title}
                    </h3>
                    <p className="text-sm text-slate-400">{book.author}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-rose-300 hover:underline"
                    onClick={() => removeBook(book.id)}
                  >
                    Remove
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Available{" "}
                  <span className="font-semibold text-cyan-200">
                    {book.copiesAvailable}
                  </span>{" "}
                  / {book.copiesTotal}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
