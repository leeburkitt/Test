import { createHash, createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "fitness_session";
const TOKEN = "authenticated";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set. Copy .env.local.example to .env.local and fill it in.");
  }
  return secret;
}

export function signSessionCookie(): string {
  const signature = createHmac("sha256", getSecret()).update(TOKEN).digest("hex");
  return `${TOKEN}.${signature}`;
}

export function verifySessionCookie(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const [token, signature] = cookieValue.split(".");
  if (token !== TOKEN || !signature) return false;

  const expected = createHmac("sha256", getSecret()).update(TOKEN).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyPasscode(submitted: string): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) {
    throw new Error("APP_PASSCODE is not set. Copy .env.local.example to .env.local and fill it in.");
  }
  const a = createHash("sha256").update(submitted).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
