// Lightweight admin auth shared by middleware (Edge runtime) and Server Actions
// (Node runtime). Uses the Web Crypto API so the same code runs in both.
//
// The admin_token cookie holds an HMAC-SHA256 signature of a fixed payload,
// keyed by ADMIN_SECRET. Middleware can verify it without any DB/state, and it
// can't be forged without the secret.

export const ADMIN_COOKIE = "admin_token";

// Fixed payload we sign. (No per-session data is needed for a single shared
// admin login; rotate ADMIN_SECRET to invalidate all existing sessions.)
const TOKEN_PAYLOAD = "spatialcart-admin-v1";

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SECRET is not set");
  }
  return secret;
}

const encoder = new TextEncoder();

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  // hex-encode
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Produce the signed cookie value to store after a successful login. */
export async function createAdminToken(): Promise<string> {
  return hmac(TOKEN_PAYLOAD, getSecret());
}

/** Constant-time-ish comparison to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Validate a cookie value. Returns false on any error (missing secret, etc.). */
export async function verifyAdminToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  try {
    const expected = await hmac(TOKEN_PAYLOAD, getSecret());
    return safeEqual(token, expected);
  } catch {
    return false;
  }
}
