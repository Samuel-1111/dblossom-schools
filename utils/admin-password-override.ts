import { createHash } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

export const ADMIN_PASSWORD_OVERRIDE_COOKIE = "admin_password_override";

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for administrator password overrides");
  return new TextEncoder().encode(secret);
}

function passwordHash(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export async function createAdminPasswordOverrideToken(password: string) {
  return new SignJWT({ role: "admin-password", passwordHash: passwordHash(password) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("local-admin-password")
    .setIssuedAt()
    .setExpirationTime("1y")
    .sign(secretKey());
}

export async function isAdminPasswordOverride(token: string | undefined, password: string) {
  if (!token || !password) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.sub === "local-admin-password" && payload.role === "admin-password" && payload.passwordHash === passwordHash(password);
  } catch {
    return false;
  }
}
