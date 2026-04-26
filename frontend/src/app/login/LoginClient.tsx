"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Sign-in failed");
        return;
      }
      if (data.mfaRequired && data.challengeToken) {
        setChallengeToken(data.challengeToken);
        return;
      }
      router.replace(from);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken,
          code: mfaCode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Invalid code");
        return;
      }
      router.replace(from);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
            LibraryM
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            {challengeToken ? "Authenticator code" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {challengeToken
              ? "Enter the 6-digit code from your app."
              : "Use your workspace credentials."}
          </p>
          {justRegistered && !challengeToken && (
            <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Account created. Sign in with your new email and password.
            </p>
          )}
        </div>

        {!challengeToken ? (
          <form onSubmit={onPasswordSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Email</label>
              <input
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Password
              </label>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            )}
            <button className="btn-primary mt-2 w-full py-3" disabled={loading}>
              {loading ? "Signing in…" : "Continue"}
            </button>
            <p className="pt-2 text-center text-sm text-slate-500">
              New here?{" "}
              <Link href="/signup" className="text-cyan-300/90 hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={onMfaSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                One-time code
              </label>
              <input
                className="input text-center font-mono text-lg tracking-[0.3em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            )}
            <button className="btn-primary w-full py-3" disabled={loading}>
              {loading ? "Verifying…" : "Verify & enter"}
            </button>
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => {
                setChallengeToken(null);
                setMfaCode("");
                setError(null);
              }}
            >
              Back
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          <Link href="/" className="text-cyan-300/90 hover:underline">
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
