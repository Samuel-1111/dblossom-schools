import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AMOUNT_KOBO = 100000;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    const reference = new URL(request.url).searchParams.get("reference")?.trim();
    if (!token || !reference) return json({ error: "Student session and payment reference are required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Invalid student session" }, 401);
    const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", authData.user.id).maybeSingle();
    if (!profile || profile.role !== "student") return json({ error: "Student session required" }, 403);

    const { data: student } = await supabase.from("students").select("id, admission_number").eq("profile_id", authData.user.id).maybeSingle();
    if (!student) return json({ error: "Student record was not found" }, 404);

    const { data: payment } = await supabase.from("result_access_payments")
      .select("id, student_id, amount_kobo, currency, status")
      .eq("reference", reference).maybeSingle();
    if (!payment || payment.student_id !== student.id || payment.amount_kobo !== AMOUNT_KOBO || payment.currency !== "NGN") {
      return json({ error: "This payment does not belong to the signed-in student" }, 403);
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}` }
    });
    const payload = await response.json().catch(() => ({}));
    const transaction = payload.data;
    const success = response.ok && payload.status && transaction?.status === "success" &&
      Number(transaction.amount) === AMOUNT_KOBO && transaction.currency === "NGN";

    if (!success) {
      await supabase.from("result_access_payments").update({
        status: "failed", paystack_status: transaction?.status ?? "verification_failed"
      }).eq("id", payment.id);
      return json({ error: "Payment was not verified" }, 400);
    }

    await supabase.from("result_access_payments").update({
      status: "success", paystack_status: transaction.status,
      paid_at: transaction.paid_at ?? new Date().toISOString()
    }).eq("id", payment.id);

    const { error } = await supabase.from("result_access_grants")
      .upsert({ student_id: payment.student_id, payment_id: payment.id }, { onConflict: "student_id,payment_id" });
    if (error) return json({ error: error.message }, 400);
    return json({ data: { verified: true } });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to verify payment" }, 500);
  }
});
