"use client";

import { useCallback, useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
  createdAt: string;
};

export default function AdminPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"MEMBER" | "LIBRARIAN" | "ADMIN">("MEMBER");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/users");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "Failed to load users");
      setLoading(false);
      return;
    }
    setUsers(data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password, role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "Could not create user");
      return;
    }
    setMsg("User created");
    setEmail("");
    setName("");
    setPassword("");
    setRole("MEMBER");
    await load();
  }

  async function removeUser(id: string) {
    if (!confirm("Remove this user? Active loans will be returned automatically.")) {
      return;
    }
    setErr(null);
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-white">Administration</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Create librarians and members, or remove accounts. Changes sync
          instantly with the database.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="glass rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-white">Add user</h2>
          <form onSubmit={createUser} className="mt-4 space-y-3">
            <input
              className="input"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="Temporary password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <select
              className="input"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "MEMBER" | "LIBRARIAN" | "ADMIN")
              }
            >
              <option value="MEMBER">Member</option>
              <option value="LIBRARIAN">Librarian</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button type="submit" className="btn-primary w-full py-2.5">
              Create account
            </button>
          </form>
          {msg && <p className="mt-3 text-sm text-emerald-300">{msg}</p>}
          {err && (
            <p className="mt-3 text-sm text-rose-300" role="alert">
              {err}
            </p>
          )}
        </section>

        <section className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Directory</h2>
            <button type="button" className="btn-ghost text-xs" onClick={() => load()}>
              Refresh
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Email</th>
                  <th className="pb-2 pr-3">Role</th>
                  <th className="pb-2 pr-3">MFA</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="align-middle">
                      <td className="py-3 pr-3 font-medium text-white">
                        {u.name}
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-400">
                        {u.email}
                      </td>
                      <td className="py-3 pr-3 text-xs">{u.role}</td>
                      <td className="py-3 pr-3 text-xs">
                        {u.mfaEnabled ? (
                          <span className="text-emerald-300">On</span>
                        ) : (
                          <span className="text-slate-500">Off</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          className="text-xs text-rose-300 hover:underline"
                          onClick={() => removeUser(u.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
