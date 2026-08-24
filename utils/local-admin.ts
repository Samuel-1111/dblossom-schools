import { jwtVerify, SignJWT } from "jose";

export const LOCAL_ADMIN_COOKIE = "local_admin_session";
const LOCAL_ADMIN_USERNAME = "DivineBlossom";
const LOCAL_ADMIN_PASSWORD = "DBMS";

export function normalizeLocalAdminIdentifier(value: string) {
  return value.trim().toLowerCase();
}

export function isLocalAdminCredential(identifier: string, password: string) {
  return normalizeLocalAdminIdentifier(identifier) === normalizeLocalAdminIdentifier(LOCAL_ADMIN_USERNAME) && password.trim() === LOCAL_ADMIN_PASSWORD;
}

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for local administrator sessions");
  return new TextEncoder().encode(secret);
}

export async function createLocalAdminToken() {
  return new SignJWT({ role: "admin", username: LOCAL_ADMIN_USERNAME })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("local-admin")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function isValidLocalAdminToken(token: string | undefined) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.sub === "local-admin" && payload.role === "admin";
  } catch {
    return false;
  }
}
