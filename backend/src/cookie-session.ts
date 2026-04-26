import type { Response } from "express";
import { signSessionToken, type SessionPayload } from "./lib/jwt.js";

const COOKIE = "library_session";
const MAX_AGE_SEC = 60 * 60 * 8;

function cookieSecure(): boolean {
  return process.env.COOKIE_SECURE === "true";
}

function sessionCookieHeader(token: string, maxAge: number): string {
  const parts = [
    `${COOKIE}=${token}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
  ];
  if (cookieSecure()) parts.push("Secure");
  return parts.join("; ");
}

export async function setSessionCookieOnResponse(
  res: Response,
  payload: SessionPayload,
): Promise<void> {
  const token = await signSessionToken(payload, MAX_AGE_SEC);
  res.append("Set-Cookie", sessionCookieHeader(token, MAX_AGE_SEC));
}

export function clearSessionCookieOnResponse(res: Response): void {
  const parts = [
    `${COOKIE}=`,
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
  ];
  if (cookieSecure()) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}
