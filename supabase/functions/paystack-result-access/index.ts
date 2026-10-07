import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AMOUNT_KOBO = 100000;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Student session required" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: authData } = await supabase.auth.getUser(token);
    const identifier = authData.user?.user_metadata?.portal_identifier;
    if (!identifier) return json({ error: "Student identity is not available in the Supabase session" }, 401);
    const { data: student } = await supabase.from("students").select("id, admission_number, parent_email").ilike("admission_number", String(identifier)).maybeSingle();
    if (!student) return json({ error: "Student record was not found" }, 404);
    const reference = `result-${student.id}-${Date.now()}`;
    const { error: paymentError } = await supabase.from("result_access_payments").insert({ student_id: student.id, reference, amount_kobo: AMOUNT_KOBO, currency: "NGN", status: "initialized" });
    if (paymentError) return json({ error: paymentError.message }, 400);
    const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: authData.user.email ?? student.parent_email ?? `${student.admission_number}@students.dblossom.local`, amount: String(AMOUNT_KOBO), currency: "NGN", reference, callback_url: `${Deno.env.get("PUBLIC_SITE_URL") ?? "http://localhost:3000"}/student-dashboard?payment=verify&reference=${encodeURIComponent(reference)}`, metadata: { student_id: student.id, purpose: "result_access" } }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.status || !payload.data?.authorization_url) { await supabase.from("result_access_payments").update({ status: "failed" }).eq("reference", reference); return json({ error: payload.message ?? "Paystack could not initialize the payment." }, 502); }
    return json({ data: { authorization_url: payload.data.authorization_url, reference } });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Unable to initialize payment" }, 500); }
});
