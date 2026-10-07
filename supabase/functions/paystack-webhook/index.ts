import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

async function hmacSha512(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return Array.from(signature).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret || !signature) return json({ error: "Webhook configuration error" }, 500);

  const expected = await hmacSha512(secret, rawBody);
  if (!timingSafeEqual(new TextEncoder().encode(expected), new TextEncoder().encode(signature))) {
    return json({ error: "Invalid signature" }, 401);
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return json({ error: "Invalid JSON" }, 400); }

  // We only grant result access for successful transactions created by this application.
  if (event?.event !== "charge.success") return json({ received: true });

  const transaction = event.data;
  const reference = String(transaction?.reference ?? "").trim();
  const amount = Number(transaction?.amount);
  const currency = String(transaction?.currency ?? "");
  if (!reference || amount !== 100000 || currency !== "NGN" || transaction?.status !== "success") {
    return json({ received: true });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: payment, error: paymentError } = await supabase
    .from("result_access_payments")
    .select("id,student_id,status,amount_kobo,currency")
    .eq("reference", reference)
    .maybeSingle();

  if (paymentError) return json({ error: "Payment lookup failed" }, 500);
  if (!payment || payment.amount_kobo !== 100000 || payment.currency !== "NGN") return json({ received: true });

  const { error: updateError } = await supabase
    .from("result_access_payments")
    .update({
      status: "success",
      paystack_status: "success",
      paid_at: transaction.paid_at ?? new Date().toISOString()
    })
    .eq("id", payment.id)
    .neq("status", "success");

  if (updateError) return json({ error: "Payment update failed" }, 500);

  const { error: grantError } = await supabase
    .from("result_access_grants")
    .upsert({ student_id: payment.student_id, payment_id: payment.id }, { onConflict: "student_id,payment_id" });

  if (grantError) return json({ error: "Result access grant failed" }, 500);

  return json({ received: true });
});
