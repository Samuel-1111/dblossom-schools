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


async function provisionPortalUser(db: ReturnType<typeof createServiceClient>, role: "student" | "teacher", record: Record<string, any>, password: string) {
  if (!password || password.length < 8) throw new Error("Portal password must be at least 8 characters.");
  const identifier = role === "student" ? String(record.admission_number ?? record.id) : String(record.staff_id ?? record.id);
  const safeIdentifier = identifier.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || String(record.id);
  const email = role === "teacher"
    ? String(record.email ?? "").trim() || `teacher-${safeIdentifier}@auth.dblossom.school`
    : `student-${safeIdentifier}@auth.dblossom.school`;

  if (record.profile_id) {
    const { error } = await db.auth.admin.updateUserById(record.profile_id, {
      password,
      user_metadata: { full_name: record.full_name, portal_identifier: identifier }
    });
    if (error) throw new Error("Portal account could not be updated.");
    await db.from("profiles").upsert({ id: record.profile_id, full_name: record.full_name, role }, { onConflict: "id" });
    return record.profile_id;
  }

  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: record.full_name, portal_identifier: identifier }
  });
  if (created.error || !created.data.user) throw new Error(created.error?.message ?? "Portal account could not be created.");

  await db.from("profiles").upsert({ id: created.data.user.id, full_name: record.full_name, role }, { onConflict: "id" });
  const { error: linkError } = await db.from(role === "student" ? "students" : "teachers").update({ profile_id: created.data.user.id }).eq("id", record.id);
  if (linkError) {
    await db.auth.admin.deleteUser(created.data.user.id, false);
    throw new Error("Portal account could not be linked.");
  }
  return created.data.user.id;
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

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, Number(params.get("pageSize") ?? "50")));
  const search = (params.get("q") ?? "").trim();

  const db = createServiceClient();

  if (table === "results") {
    const [{ data, error }, { data: totalCount, error: countError }] = await Promise.all([
      db.rpc("admin_result_groups", { p_page: page, p_page_size: pageSize }),
      db.rpc("admin_result_group_count"),
    ]);
    if (error || countError) return NextResponse.json({ error: "Unable to load result records." }, { status: 500 });
    return NextResponse.json({ data: data ?? [], page, pageSize, total: Number(totalCount ?? 0) });
  }

  const select = table === "students"
    ? "id,admission_number,full_name,class_id,date_of_birth,gender,parent_name,parent_phone,parent_email,boarding_status,guardian_name,guardian_contact,status,profile_id,created_at"
    : table === "teachers"
      ? "id,full_name,email,phone,staff_id,subject,role,assigned_class,status,profile_id,created_at"
      : "*";

  let query = db.from(table).select(select, { count: "exact" });
  if (search && (table === "students" || table === "teachers")) {
    const safe = search.replace(/[%_]/g, "\\$&");
    query = table === "students"
      ? query.or(`full_name.ilike.%${safe}%,admission_number.ilike.%${safe}%`)
      : query.or(`full_name.ilike.%${safe}%,staff_id.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  const ordered = table === "classes"
    ? query.order("name", { ascending: true })
    : table === "events"
      ? query.order("event_date", { ascending: true })
      : query.order("created_at", { ascending: false });

  const { data, error, count } = await ordered.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) return NextResponse.json({ error: "Unable to load Admin records." }, { status: 500 });
  return NextResponse.json({ data: data ?? [], page, pageSize, total: count ?? 0 });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  if (!table) return NextResponse.json({ error: "Unsupported Admin table" }, { status: 400 });
  if (table !== "students" && table !== "teachers" && table !== "events" && table !== "gallery_images" && table !== "subjects" && table !== "announcements") return NextResponse.json({ error: "This Admin table is read-only here" }, { status: 400 });
  const body = await request.json();
  const db = createServiceClient();
  const payload = table === "events" || table === "gallery_images" ? cleanMediaPayload(table, body) : table === "subjects" ? cleanSubjectPayload(body) : table === "announcements" ? cleanAnnouncementPayload(body) : cleanPayload(table, body);
  const password = typeof body.password === "string" ? body.password : "";
  if ((table === "students" || table === "teachers") && password.length < 8) return NextResponse.json({ error: "Portal password must be at least 8 characters." }, { status: 400 });
  const { data, error } = await db.from(table).insert(payload).select().single();
  if (error) return NextResponse.json({ error: "Unable to save the record. Check required fields and duplicate identifiers." }, { status: 400 });
  if (table === "students" || table === "teachers") {
    try { await provisionPortalUser(db, table === "students" ? "student" : "teacher", data, password); }
    catch (error) { await db.from(table).delete().eq("id", data.id); return NextResponse.json({ error: error instanceof Error ? error.message : "Portal account could not be created." }, { status: 400 }); }
  }
  const safeData = { ...data };
  delete safeData.password;
  return NextResponse.json({ data: safeData }, { status: 201 });
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
  const db = createServiceClient();
  const payload = table === "events" || table === "gallery_images" ? cleanMediaPayload(table, body) : cleanPayload(table, body);
  const password = typeof body.password === "string" ? body.password : "";
  const { data: existing } = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  const { data, error } = await db.from(table).update(payload).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: "Unable to update the record." }, { status: 400 });
  if ((table === "students" || table === "teachers") && password) {
    try { await provisionPortalUser(db, table === "students" ? "student" : "teacher", { ...existing, ...data }, password); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Portal password could not be updated." }, { status: 400 }); }
  }
  const safeData = { ...data }; delete safeData.password;
  return NextResponse.json({ data: safeData });
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
