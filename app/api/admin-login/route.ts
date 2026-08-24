import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createLocalAdminToken, isLocalAdminCredential, LOCAL_ADMIN_COOKIE, normalizeLocalAdminIdentifier } from "../../../utils/local-admin";
import { ADMIN_PASSWORD_OVERRIDE_COOKIE, isAdminPasswordOverride } from "../../../utils/admin-password-override";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { identifier?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const identifier = body.identifier ?? "";
  const password = body.password ?? "";
  const overrideToken = (await cookies()).get(ADMIN_PASSWORD_OVERRIDE_COOKIE)?.value;
  const validPassword = isLocalAdminCredential(identifier, password) || (normalizeLocalAdminIdentifier(identifier) === "divineblossom" && await isAdminPasswordOverride(overrideToken, password));
  if (!validPassword) {
    return NextResponse.json({ error: "Invalid administrator username or password. Please try again." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOCAL_ADMIN_COOKIE, await createLocalAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
