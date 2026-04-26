import { headers } from "next/headers";
import type { Role } from "./roles";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  mfaEnabled: boolean;
};

function backendBaseUrl(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    (process.env.NODE_ENV !== "production"
      ? "http://127.0.0.1:4000"
      : "")
  );
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const base = backendBaseUrl();
  if (!base) {
    return null;
  }
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const res = await fetch(`${base.replace(/\/$/, "")}/api/auth/me`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as { user: SessionUser | null };
  return data.user;
}
