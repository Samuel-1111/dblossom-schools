import { NextResponse } from "next/server";
import { createLocalAdminToken, isLocalAdminCredential, LOCAL_ADMIN_COOKIE } from "../../../utils/local-admin";

export async function POST(request: Request) {
  let body: { identifier?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isLocalAdminCredential(body.identifier ?? "", body.password ?? "")) {
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
