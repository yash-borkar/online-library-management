import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function totpAuthUrl(params: {
  email: string;
  issuer: string;
  secret: string;
}): string {
  return generateURI({
    issuer: params.issuer,
    label: params.email,
    secret: params.secret,
  });
}

export async function totpQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
}

export function verifyTotp(secret: string, token: string): boolean {
  const result = verifySync({
    secret,
    token: token.replace(/\s/g, ""),
    epochTolerance: 30,
  });
  return result.valid === true;
}
