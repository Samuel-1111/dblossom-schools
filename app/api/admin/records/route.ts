import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../utils/supabase/service";
import { requireAdmin } from "../../../../utils/supabase/admin-auth";

export const dynamic = "force-dynamic";

type AdminTable = "students" | "teachers" | "results";
type AdminMediaTable = "events" | "gallery_images";
type AdminReadTable = AdminTable | "classes" | AdminMediaTable | "payments" | "complaints" | "subjects" | "announcements";

function requestedTable(request: Request): AdminReadTable | null {
  const table = new URL(request.url).searchParams.get("table") ?? "";
  if (table === "students" || table === "teachers" || table === "results" || table === "classes" || table === "events" || table === "gallery_images" || table === "payments" || table === "complaints" || table === "subjects" || table === "announcements") return table;
  return null;
}

function cleanMediaPayload(table: AdminMediaTable, body: Record<string, unknown>) {
  if (table === "events") return {
    ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
    ...(typeof body.description === "string" || body.description === null ? { description: body.description } : {}),
    ...(typeof body.event_date === "string" ? { event_date: body.event_date } : {}),
    ...(typeof body.category === "string" ? { category: body.category.trim() } : {}),
    ...(typeof body.status === "string" ? { status: body.status.trim() } : {}),
    ...(typeof body.image_url === "string" || body.image_url === null ? { image_url: body.image_url } : {}),
  };
  return {
    ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
    ...(typeof body.category === "string" ? { category: body.category.trim() } : {}),
    ...(typeof body.alt_text === "string" || body.alt_text === null ? { alt_text: body.alt_text } : {}),
    ...(typeof body.image_url === "string" ? { image_url: body.image_url } : {}),
  };
}

function cleanAnnouncementPayload(body: Record<string, unknown>) {
  return {
    ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
    ...(typeof body.body === "string" ? { body: body.body.trim() } : {}),
  };
}

function cleanSubjectPayload(body: Record<string, unknown>) {
  return {
    ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
    ...(typeof body.class_id === "string" || typeof body.class_id === "number" ? { class_id: body.class_id } : {}),
  };
}

function cleanPayload(table: AdminTable, body: Record<string, unknown>) {
  if (table === "students") {
    return {
      ...(typeof body.admission_number === "string" ? { admission_number: body.admission_number.trim() } : {}),
      ...(typeof body.full_name === "string" ? { full_name: body.full_name.trim() } : {}),
      ...(typeof body.class_id === "string" || typeof body.class_id === "number" || body.class_id === null ? { class_id: body.class_id } : {}),
      ...(typeof body.date_of_birth === "string" || body.date_of_birth === null ? { date_of_birth: body.date_of_birth } : {}),
      ...(typeof body.gender === "string" || body.gender === null ? { gender: typeof body.gender === "string" ? body.gender.trim() : null } : {}),
      ...(typeof body.parent_name === "string" || body.parent_name === null ? { parent_name: typeof body.parent_name === "string" ? body.parent_name.trim() : null } : {}),
      ...(typeof body.parent_phone === "string" || body.parent_phone === null ? { parent_phone: typeof body.parent_phone === "string" ? body.parent_phone.trim() : null } : {}),
      ...(typeof body.parent_email === "string" || body.parent_email === null ? { parent_email: typeof body.parent_email === "string" ? body.parent_email.trim() : null } : {}),
      ...(typeof body.boarding_status === "string" ? { boarding_status: body.boarding_status.trim() } : {}),
      ...(typeof body.guardian_name === "string" || body.guardian_name === null ? { guardian_name: body.guardian_name } : {}),
      ...(typeof body.guardian_contact === "string" || body.guardian_contact === null ? { guardian_contact: body.guardian_contact } : {}),
      ...(typeof body.password === "string" && body.password.length > 0 ? { password: body.password } : {}),
      ...(typeof body.status === "string" ? { status: body.status.toLowerCase() } : {}),
    };
  }
  if (table === "teachers") {
    return {
      ...(typeof body.full_name === "string" ? { full_name: body.full_name.trim() } : {}),
      ...(typeof body.email === "string" || body.email === null ? { email: body.email } : {}),
      ...(typeof body.phone === "string" || body.phone === null ? { phone: body.phone } : {}),
      ...(typeof body.staff_id === "string" || body.staff_id === null ? { staff_id: typeof body.staff_id === "string" ? body.staff_id.trim() : null } : {}),
      ...(typeof body.subject === "string" || body.subject === null ? { subject: typeof body.subject === "string" ? body.subject.trim() : null } : {}),
      ...(typeof body.role === "string" ? { role: body.role.trim() } : {}),
      ...(typeof body.assigned_class === "string" || body.assigned_class === null ? { assigned_class: typeof body.assigned_class === "string" ? body.assigned_class.trim() : null } : {}),
      ...(typeof body.password === "string" && body.password.length > 0 ? { password: body.password } : {}),
      ...(typeof body.status === "string" ? { status: body.status.toLowerCase() } : {}),
    };
  }
  return {
    ...(typeof body.ca_score === "number" ? { ca_score: body.ca_score } : {}),
    ...(typeof body.exam_score === "number" ? { exam_score: body.exam_score } : {}),
    ...(typeof body.total_score === "number" ? { total_score: body.total_score } : {}),
    ...(typeof body.grade === "string" ? { grade: body.grade.trim() } : {}),
    ...(typeof body.teacher_comment === "string" || body.teacher_comment === null ? { teacher_comment: body.teacher_comment } : {}),
    ...(typeof body.principal_comment === "string" || body.principal_comment === null ? { principal_comment: body.principal_comment } : {}),
  };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  if (!table) return NextResponse.json({ error: "Unsupported Admin table" }, { status: 400 });
  if (table === "results") {
    const { data: resultRows, error: resultError } = await createServiceClient().from("results").select("id, student_id, subject_id, term_id, ca_score, exam_score, total_score, grade, teacher_comment, principal_comment, approved, recorded_by, created_at, students(full_name, admission_number, class_id, classes(name)), subjects(name), terms(name, session_id, academic_sessions(name))").order("created_at", { ascending: false });
    if (resultError) return NextResponse.json({ error: resultError.message }, { status: 400 });
    const grouped = new Map<string, Record<string, any>>();
    for (const item of resultRows ?? []) {
      const student = Array.isArray((item as any).students) ? (item as any).students[0] : (item as any).students;
      const subject = Array.isArray((item as any).subjects) ? (item as any).subjects[0] : (item as any).subjects;
      const term = Array.isArray((item as any).terms) ? (item as any).terms[0] : (item as any).terms;
      const academicSession = Array.isArray(term?.academic_sessions) ? term.academic_sessions[0] : term?.academic_sessions;
      const key = `${item.student_id}:${item.term_id}`;
      const current = grouped.get(key) ?? { id: item.id, result_ids: [], student_id: item.student_id, student_name: student?.full_name ?? student?.admission_number ?? "Student", admission_number: student?.admission_number ?? null, class_id: student?.class_id ?? null, class_name: student?.classes?.name ?? "Class not recorded", term_id: item.term_id, term: term?.name ?? "Term not recorded", session: academicSession?.name ?? "Session not recorded", subjects: [], teacher_comment: item.teacher_comment ?? null, principal_comment: item.principal_comment ?? null, approved: item.approved ?? false, created_at: item.created_at, total_score: 0, average: 0 };
      current.result_ids.push(item.id);
      current.subjects.push({ name: subject?.name ?? "Subject", subject_id: item.subject_id, ca_score: item.ca_score, exam_score: item.exam_score, total: item.total_score, grade: item.grade });
      current.total_score += Number(item.total_score ?? 0);
      current.average = current.subjects.length ? Math.round(current.total_score / current.subjects.length) : 0;
      if (!current.teacher_comment && item.teacher_comment) current.teacher_comment = item.teacher_comment;
      if (!current.principal_comment && item.principal_comment) current.principal_comment = item.principal_comment;
      grouped.set(key, current);
    }
    return NextResponse.json({ data: [...grouped.values()] });
  }
  const query = createServiceClient().from(table).select("*");
  const { data, error } = table === "classes" ? await query.order("name", { ascending: true }) : table === "events" ? await query.order("event_date", { ascending: true }) : await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  if (!table) return NextResponse.json({ error: "Unsupported Admin table" }, { status: 400 });
  if (table !== "students" && table !== "teachers" && table !== "events" && table !== "gallery_images" && table !== "subjects" && table !== "announcements") return NextResponse.json({ error: "This Admin table is read-only here" }, { status: 400 });
  const body = await request.json();
  const payload = table === "events" || table === "gallery_images" ? cleanMediaPayload(table, body) : table === "subjects" ? cleanSubjectPayload(body) : table === "announcements" ? cleanAnnouncementPayload(body) : cleanPayload(table, body);
  const { data, error } = await createServiceClient().from(table).insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  const id = new URL(request.url).searchParams.get("id");
  if (!table || !id) return NextResponse.json({ error: "Table and record id are required" }, { status: 400 });
  if (table === "payments" || table === "complaints") {
    const body = await request.json();
    const allowed = table === "payments" ? ["Confirmed", "Rejected", "Pending"] : ["New", "Reviewed", "Resolved"];
    if (typeof body.status !== "string" || !allowed.includes(body.status)) return NextResponse.json({ error: `${table === "payments" ? "Payment" : "Complaint"} status is invalid` }, { status: 400 });
    const { data, error } = await createServiceClient().from(table).update({ status: body.status }).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }
  if (table !== "students" && table !== "teachers" && table !== "results" && table !== "events" && table !== "gallery_images") return NextResponse.json({ error: "This Admin table is read-only here" }, { status: 400 });
  const body = await request.json();
  const payload = table === "events" || table === "gallery_images" ? cleanMediaPayload(table, body) : cleanPayload(table, body);
  const { data, error } = await createServiceClient().from(table).update(payload).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  const id = new URL(request.url).searchParams.get("id");
  if (!table || !id) return NextResponse.json({ error: "Table and record id are required" }, { status: 400 });
  if (table !== "students" && table !== "teachers" && table !== "results" && table !== "events" && table !== "gallery_images" && table !== "subjects") return NextResponse.json({ error: "This Admin table is read-only here" }, { status: 400 });
  const { error } = await createServiceClient().from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
