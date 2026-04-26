import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  sub: string;
  role: "ADMIN" | "LIBRARIAN" | "MEMBER";
};

export async function signSessionToken(
  payload: SessionPayload,
  maxAgeSec: number,
): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const role = payload.role;
    if (
      !sub ||
      (role !== "ADMIN" && role !== "LIBRARIAN" && role !== "MEMBER")
    ) {
      return null;
    }
    return { sub, role };
  } catch {
    return null;
  }
}

export async function signMfaChallengeToken(userId: string): Promise<string> {
  return new SignJWT({ typ: "mfa_challenge" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("300s")
    .sign(getSecret());
}

export async function verifyMfaChallengeToken(
  token: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.typ !== "mfa_challenge") return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
