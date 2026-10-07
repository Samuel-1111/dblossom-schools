import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Student session required" }, { status: 401 });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const response = await fetch(`${base}/functions/v1/paystack-result-access`, { method: "POST", headers: { Authorization: `Bearer ${((await supabase.auth.getSession()).data.session?.access_token ?? "")}`, "Content-Type": "application/json", "X-Idempotency-Key": request.headers.get("x-idempotency-key") ?? "" }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
