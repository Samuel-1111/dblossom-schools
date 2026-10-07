import { NextResponse } from "next/server";
import { requireAdmin } from "../../../utils/supabase/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  if (newPassword !== confirmPassword) return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });

  const { error } = await auth.supabase.auth.updateUser({ password: newPassword });
  if (error) return NextResponse.json({ error: "Administrator password could not be updated." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
