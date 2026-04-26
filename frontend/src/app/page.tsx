import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-80" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-lg font-black text-slate-950 shadow-lg shadow-cyan-500/25">
            L
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-slate-200">
              LibraryM
            </p>
            <p className="text-xs text-slate-500">Online library management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/signup" className="btn-ghost">
            Sign up
          </Link>
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/login" className="btn-primary">
            Open console
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 pb-24 pt-10 md:flex-row md:items-center md:pt-4">
        <section className="flex-1 space-y-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />
            MFA-guarded borrowing · 15-day loans · Live catalog
          </p>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            A modern control room for your{" "}
            <span className="bg-gradient-to-r from-cyan-200 to-violet-200 bg-clip-text text-transparent">
              entire library
            </span>
            .
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-slate-400">
            Members and librarians can self-register. Admins manage accounts.
            Librarians curate inventory with rich covers; members browse by
            category and borrow when copies are free — only after enabling
            authenticator-based MFA.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary px-6 py-3 text-base">
              Launch workspace
            </Link>
            <a
              href="#roles"
              className="btn-ghost px-6 py-3 text-base text-slate-200"
            >
              Explore roles
            </a>
          </div>
          <dl
            id="roles"
            className="grid max-w-xl gap-4 pt-4 sm:grid-cols-3"
          >
            {[
              ["Admin", "Users & access"],
              ["Librarian", "Books & loans"],
              ["Member", "Borrow with MFA"],
            ].map(([t, s]) => (
              <div key={t} className="glass rounded-2xl p-4">
                <dt className="text-sm font-semibold text-white">{t}</dt>
                <dd className="mt-1 text-xs text-slate-500">{s}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex-1">
          <div className="glass relative overflow-hidden rounded-3xl p-8">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative space-y-6">
              <h2 className="text-lg font-semibold text-white">
                Demo credentials
              </h2>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-slate-500">Admin</span>
                  <span className="font-mono text-xs text-cyan-100">
                    admin@library.local
                  </span>
                </li>
                <li className="flex justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-slate-500">Librarian</span>
                  <span className="font-mono text-xs text-cyan-100">
                    librarian@library.local
                  </span>
                </li>
                <li className="flex justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-slate-500">Member</span>
                  <span className="font-mono text-xs text-cyan-100">
                    member@library.local
                  </span>
                </li>
              </ul>
              <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
                Password for all seeded accounts:{" "}
                <span className="font-mono font-semibold">Demo12345!</span>
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                With Docker, the backend container runs migrations and seed on
                start. Locally, from{" "}
                <code className="rounded bg-black/40 px-1">backend/</code> use{" "}
                <code className="rounded bg-black/40 px-1">
                  npx prisma db seed
                </code>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
