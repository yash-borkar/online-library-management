import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

type NavUser = {
  name: string;
  email: string;
  role: string;
};

export function DashboardNav({ user }: { user: NavUser }) {
  const links =
    user.role === "ADMIN"
      ? [{ href: "/dashboard/admin", label: "Admin" }]
      : user.role === "LIBRARIAN"
        ? [{ href: "/dashboard/librarian", label: "Librarian" }]
        : [{ href: "/dashboard/member", label: "Member" }];

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-white"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 text-sm font-black text-slate-950">
              L
            </span>
            LibraryM
          </Link>
          <nav className="hidden items-center gap-2 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
