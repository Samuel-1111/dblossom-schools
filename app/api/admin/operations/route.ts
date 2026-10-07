import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../utils/supabase/service";
import { requireAdmin } from "../../../../utils/supabase/admin-auth";

export const dynamic = "force-dynamic";

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const type = clean(body.type);
  const db = createServiceClient();

  if (type === "invoice") {
    const studentId = clean(body.student_id);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!studentId || !items.length) return NextResponse.json({ error: "Student and at least one fee item are required." }, { status: 400 });
    const total = items.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.amount || 0)), 0);
    const invoiceNumber = clean(body.invoice_number) || `INV-${new Date().getFullYear()}-${Date.now()}`;
    const { data: invoice, error } = await db.from("fee_invoices").insert({
      student_id: studentId, invoice_number: invoiceNumber, due_date: clean(body.due_date) || null,
      status: "Unpaid", total_amount: total, amount_paid: 0, balance: total, notes: clean(body.notes) || null, created_by: auth.user?.id ?? null
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

    const reference = clean(body.reference) || `MANUAL-${crypto.randomUUID()}`;
    const { data, error } = await db.rpc("record_fee_payment", {
      p_invoice_id: invoiceId,
      p_amount: amount,
      p_method: clean(body.method) || "Manual",
      p_reference: reference,
      p_parent_id: clean(body.parent_id) || null,
    });

    if (error) {
      const message = /exceed|outstanding|invoice not found|amount/i.test(error.message)
        ? error.message
        : "Payment could not be recorded.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (data?.duplicate) return NextResponse.json({ data, duplicate: true }, { status: 200 });
    return NextResponse.json({ data }, { status: 201 });
  }

  if (type === "announcement") {
    const title = clean(body.title), announcementBody = clean(body.body);
    if (!title || !announcementBody) return NextResponse.json({ error: "Announcement title and body are required." }, { status: 400 });
    const { data, error } = await db.from("announcements").insert({
      title, body: announcementBody, posted_by: auth.user?.id ?? null,
      audience: clean(body.audience) || "all", target_class_id: clean(body.target_class_id) || null,
      target_student_id: clean(body.target_student_id) || null,
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
    const { data, error } = await db.from("parent_messages").insert({ parent_id: parent.id, sender_profile_id: auth.user?.id ?? null, recipient_profile_id: parent.profile_id, subject: clean(body.subject) || "School message", body: bodyText }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  }

  if (type === "calendar") {
    const title = clean(body.title);
    if (!title || !body.event_date) return NextResponse.json({ error: "Calendar title and date are required." }, { status: 400 });
    const { data, error } = await db.from("parent_calendar_events").insert({ title, description: clean(body.description) || null, event_date: body.event_date, start_time: body.start_time || null, end_time: body.end_time || null, audience: clean(body.audience) || "all", class_id: clean(body.class_id) || null }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  }

  return NextResponse.json({ error: "Unsupported operation." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const type = clean(body.type), id = clean(body.id);
  const db = createServiceClient();
  if (type === "admission") {
    const allowed = ["Pending","Under Review","Interview","Approved","Rejected","Converted"];
    if (!allowed.includes(clean(body.status))) return NextResponse.json({ error: "Invalid admission status." }, { status: 400 });
    const { data: application } = await db.from("admission_applications").select("*").eq("id", id).maybeSingle();
    if (!application) return NextResponse.json({ error: "Admission application not found." }, { status: 404 });

    let studentId = application.student_id;
    if (clean(body.status) === "Converted" && !studentId) {
      const { data: classRow } = application.class_applied
        ? await db.from("classes").select("id").ilike("name", application.class_applied).limit(1).maybeSingle()
        : { data: null };
      const admissionNumber = "DBMS-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
      const { data: student, error: studentError } = await db.from("students").insert({
        admission_number: admissionNumber,
        full_name: application.applicant_name,
        class_id: classRow?.id ?? null,
        date_of_birth: application.date_of_birth ?? null,
        gender: application.gender ?? null,
        guardian_name: application.parent_name ?? null,
        guardian_contact: application.parent_phone ?? null,
        status: "active"
      }).select("id, admission_number").single();
      if (studentError) return NextResponse.json({ error: studentError.message }, { status: 400 });
      studentId = student.id;
    }

    const { data, error } = await db.from("admission_applications").update({
      status: clean(body.status), notes: clean(body.notes) || null, interview_date: body.interview_date || null,
      interview_notes: clean(body.interview_notes) || null, student_id: studentId, updated_at: new Date().toISOString()
    }).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data, student_id: studentId });
  }
  if (type === "announcement") {
    const { data, error } = await db.from("announcements").update({ pinned: Boolean(body.pinned), status: clean(body.status) || "Published" }).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }
  return NextResponse.json({ error: "Unsupported update." }, { status: 400 });
}
