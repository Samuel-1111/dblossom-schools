import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidLocalAdminToken, LOCAL_ADMIN_COOKIE } from "../../../../utils/local-admin";
import { createServiceClient } from "../../../../utils/supabase/service";

export const dynamic = "force-dynamic";

async function authorize() {
  return isValidLocalAdminToken((await cookies()).get(LOCAL_ADMIN_COOKIE)?.value);
}
function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

export async function GET(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const type = new URL(request.url).searchParams.get("type");
  const db = createServiceClient();
  const table = type === "invoices" ? "fee_invoices" : type === "payments" ? "fee_payments" : type === "admissions" ? "admission_applications" : type === "messages" ? "parent_messages" : type === "calendar" ? "parent_calendar_events" : type === "categories" ? "fee_categories" : type === "audit" ? "audit_logs" : "announcements";
  const query = db.from(table).select("*");
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const type = clean(body.type);
  const db = createServiceClient();

  if (type === "invoice") {
    const studentId = Number(body.student_id);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!Number.isInteger(studentId) || !items.length) return NextResponse.json({ error: "Student and at least one fee item are required." }, { status: 400 });
    const total = items.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.amount || 0)), 0);
    const invoiceNumber = clean(body.invoice_number) || `INV-${new Date().getFullYear()}-${Date.now()}`;
    const { data: invoice, error } = await db.from("fee_invoices").insert({
      student_id: studentId, invoice_number: invoiceNumber, due_date: clean(body.due_date) || null,
      status: "Unpaid", total_amount: total, amount_paid: 0, balance: total, notes: clean(body.notes) || null
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const rows = items.map((item: any) => ({ invoice_id: invoice.id, category_id: clean(item.category_id) || null, description: clean(item.description) || "School fee", amount: Math.max(0, Number(item.amount || 0)) }));
    const { error: itemError } = await db.from("fee_invoice_items").insert(rows);
    if (itemError) return NextResponse.json({ error: itemError.message }, { status: 400 });
    return NextResponse.json({ data: invoice }, { status: 201 });
  }

  if (type === "payment") {
    const invoiceId = clean(body.invoice_id);
    const amount = Number(body.amount);
    if (!invoiceId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Invoice and a valid payment amount are required." }, { status: 400 });
    const { data: invoice } = await db.from("fee_invoices").select("id,student_id,total_amount,amount_paid,balance").eq("id", invoiceId).maybeSingle();
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (amount > Number(invoice.balance)) return NextResponse.json({ error: "Payment cannot exceed the outstanding balance." }, { status: 400 });
    const nextPaid = Number(invoice.amount_paid) + amount;
    const nextBalance = Number(invoice.total_amount) - nextPaid;
    const status = nextBalance <= 0 ? "Paid" : "Partially Paid";
    const reference = clean(body.reference) || `MANUAL-${Date.now()}`;
    const { data: payment, error } = await db.from("fee_payments").insert({ invoice_id: invoice.id, student_id: invoice.student_id, amount, method: clean(body.method) || "Manual", reference, status: "Confirmed", paid_at: new Date().toISOString() }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await db.from("fee_invoices").update({ amount_paid: nextPaid, balance: Math.max(0, nextBalance), status }).eq("id", invoice.id);
    const receiptNumber = `RCP-${new Date().getFullYear()}-${Date.now()}`;
    await db.from("fee_receipts").insert({ payment_id: payment.id, receipt_number: receiptNumber });
    return NextResponse.json({ data: { payment, receipt_number: receiptNumber } }, { status: 201 });
  }

  if (type === "announcement") {
    const title = clean(body.title), announcementBody = clean(body.body);
    if (!title || !announcementBody) return NextResponse.json({ error: "Announcement title and body are required." }, { status: 400 });
    const { data: admin } = await db.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();
    const { data, error } = await db.from("announcements").insert({
      title, body: announcementBody, posted_by: admin?.id ?? null,
      audience: clean(body.audience) || "all", target_class_id: body.target_class_id ? Number(body.target_class_id) : null,
      target_student_id: body.target_student_id ? Number(body.target_student_id) : null,
      pinned: Boolean(body.pinned), status: "Published", publish_at: body.publish_at || null
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  }

  if (type === "message") {
    const parentId = clean(body.parent_id);
    const bodyText = clean(body.body);
    if (!parentId || !bodyText) return NextResponse.json({ error: "Parent and message are required." }, { status: 400 });
    const { data: parent } = await db.from("parent_profiles").select("id,profile_id").eq("id", parentId).maybeSingle();
    if (!parent) return NextResponse.json({ error: "Parent not found." }, { status: 404 });
    const { data: admin } = await db.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();
    const { data, error } = await db.from("parent_messages").insert({ parent_id: parent.id, sender_profile_id: admin?.id ?? null, recipient_profile_id: parent.profile_id, subject: clean(body.subject) || "School message", body: bodyText }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  }

  if (type === "calendar") {
    const title = clean(body.title);
    if (!title || !body.event_date) return NextResponse.json({ error: "Calendar title and date are required." }, { status: 400 });
    const { data, error } = await db.from("parent_calendar_events").insert({ title, description: clean(body.description) || null, event_date: body.event_date, start_time: body.start_time || null, end_time: body.end_time || null, audience: clean(body.audience) || "all", class_id: body.class_id ? Number(body.class_id) : null }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  }

  return NextResponse.json({ error: "Unsupported operation." }, { status: 400 });
}

export async function PATCH(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const type = clean(body.type), id = clean(body.id);
  const db = createServiceClient();
  if (type === "admission") {
    const allowed = ["Pending","Under Review","Interview","Approved","Rejected","Converted"];
    if (!allowed.includes(clean(body.status))) return NextResponse.json({ error: "Invalid admission status." }, { status: 400 });
    const { data, error } = await db.from("admission_applications").update({ status: clean(body.status), notes: clean(body.notes) || null, interview_date: body.interview_date || null, interview_notes: clean(body.interview_notes) || null, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }
  if (type === "announcement") {
    const { data, error } = await db.from("announcements").update({ pinned: Boolean(body.pinned), status: clean(body.status) || "Published" }).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }
  return NextResponse.json({ error: "Unsupported update." }, { status: 400 });
}
