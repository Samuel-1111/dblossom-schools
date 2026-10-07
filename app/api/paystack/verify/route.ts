import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim();
  if (!reference) return NextResponse.json({ error: "Payment reference is required." }, { status: 400 });
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return NextResponse.json({ error: "Student session required" }, { status: 401 });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const response = await fetch(`${base}/functions/v1/paystack-result-verify?reference=${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
