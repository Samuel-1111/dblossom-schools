import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AMOUNT_KOBO = 100000;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Student session required" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Invalid student session" }, 401);

    const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", authData.user.id).maybeSingle();
    if (!profile || profile.role !== "student") return json({ error: "Student session required" }, 403);

    const { data: student } = await supabase.from("students").select("id, admission_number, parent_email").eq("profile_id", authData.user.id).maybeSingle();
    if (!student) return json({ error: "Student record was not found" }, 404);

    const idempotencyKey = (request.headers.get("x-idempotency-key") ?? "").trim();
    if (!idempotencyKey || idempotencyKey.length > 100) return json({ error: "A valid payment request key is required." }, 400);

    const { data: existing } = await supabase.from("result_access_payments")
      .select("reference, authorization_url, status, created_at")
      .eq("idempotency_key", idempotencyKey)
      .eq("student_id", student.id)
      .maybeSingle();
    if (existing?.authorization_url && existing.status === "initialized") {
      return json({ data: { authorization_url: existing.authorization_url, reference: existing.reference } });
    }

    const reference = `result-${student.id}-${crypto.randomUUID()}`;
    const { data: createdPayment, error: paymentError } = await supabase.from("result_access_payments").insert({
      student_id: student.id, reference, amount_kobo: AMOUNT_KOBO, currency: "NGN", status: "initialized", idempotency_key: idempotencyKey
    }).select("id").single();
    if (paymentError) {
      const { data: concurrent } = await supabase.from("result_access_payments")
        .select("reference, authorization_url, status")
        .eq("idempotency_key", idempotencyKey)
        .eq("student_id", student.id)
        .maybeSingle();
      if (concurrent?.authorization_url) return json({ data: { authorization_url: concurrent.authorization_url, reference: concurrent.reference } });
      return json({ error: "Payment could not be initialized." }, 409);
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: authData.user.email ?? student.parent_email ?? `${student.admission_number}@students.dblossom.local`,
        amount: String(AMOUNT_KOBO),
        currency: "NGN",
        reference,
        callback_url: `${Deno.env.get("PUBLIC_SITE_URL") ?? "http://localhost:3000"}/student-dashboard?payment=verify&reference=${encodeURIComponent(reference)}`,
        metadata: { purpose: "result_access" }
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.status || !payload.data?.authorization_url) {
      await supabase.from("result_access_payments").update({ status: "failed" }).eq("id", createdPayment.id);
      return json({ error: payload.message ?? "Paystack could not initialize the payment." }, 502);
    }
    await supabase.from("result_access_payments").update({ authorization_url: payload.data.authorization_url }).eq("id", createdPayment.id);
    return json({ data: { authorization_url: payload.data.authorization_url, reference } });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to initialize payment" }, 500);
  }
});
