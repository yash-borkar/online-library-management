import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
export function generateTotpSecret() {
    return generateSecret();
}
export function totpAuthUrl(params) {
    return generateURI({
        issuer: params.issuer,
        label: params.email,
        secret: params.secret,
    });
}
export async function totpQrDataUrl(otpauthUrl) {
    return QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
}
export function verifyTotp(secret, token) {
    const result = verifySync({
        secret,
        token: token.replace(/\s/g, ""),
        epochTolerance: 30,
    });
    return result.valid === true;
}
//# sourceMappingURL=mfa.js.map