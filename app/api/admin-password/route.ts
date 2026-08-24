import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminPasswordOverrideToken, ADMIN_PASSWORD_OVERRIDE_COOKIE, isAdminPasswordOverride } from "../../../utils/admin-password-override";
import { isLocalAdminCredential, LOCAL_ADMIN_COOKIE, isValidLocalAdminToken } from "../../../utils/local-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get(LOCAL_ADMIN_COOKIE)?.value;
  if (!(await isValidLocalAdminToken(adminSession))) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });

  let body: { currentPassword?: string; newPassword?: string; confirmPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";
  const confirmPassword = body.confirmPassword ?? "";
  const overrideToken = cookieStore.get(ADMIN_PASSWORD_OVERRIDE_COOKIE)?.value;
  const currentIsValid = isLocalAdminCredential("DivineBlossom", currentPassword) || await isAdminPasswordOverride(overrideToken, currentPassword);
  if (!currentIsValid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  if (newPassword.length < 4) return NextResponse.json({ error: "New password must be at least 4 characters." }, { status: 400 });
  if (newPassword !== confirmPassword) return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_PASSWORD_OVERRIDE_COOKIE, await createAdminPasswordOverrideToken(newPassword), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
