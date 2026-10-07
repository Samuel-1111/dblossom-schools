import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidLocalAdminToken, LOCAL_ADMIN_COOKIE } from "../../../../utils/local-admin";
import { createServiceClient } from "../../../../utils/supabase/service";

export const dynamic = "force-dynamic";
type Row = Record<string, any>;

async function authorize() {
  return isValidLocalAdminToken((await cookies()).get(LOCAL_ADMIN_COOKIE)?.value);
}

export async function GET(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < 2) return NextResponse.json({ data: [] });
  const pattern = `%${query.replace(/[%_]/g, "\\$&")}%`;
  const service = createServiceClient();
  const { data, error } = await service.from("students")
    .select("id, admission_number, full_name, class_id, classes(name)")
    .or(`full_name.ilike.${pattern},admission_number.ilike.${pattern}`)
    .order("full_name").limit(25);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: (data ?? []).map((row: Row) => ({ ...row, class_name: Array.isArray(row.classes) ? row.classes[0]?.name : row.classes?.name })) });
}

export async function POST(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const type = body.type === "teacher" ? "teacher" : body.type === "parent" ? "parent" : "";
  const studentId = String(body.student_id ?? "").trim();
  if (!type || !studentId) return NextResponse.json({ error: "Choose a link type and student." }, { status: 400 });

  const service = createServiceClient();
  const { data: student } = await service.from("students").select("id").eq("id", studentId).maybeSingle();
  if (!student) return NextResponse.json({ error: "Student was not found." }, { status: 404 });

  if (type === "teacher") {
    const teacherId = String(body.teacher_id ?? "").trim();
    if (!teacherId) return NextResponse.json({ error: "Choose a teacher." }, { status: 400 });
    const { error } = await service.from("teacher_student_links").upsert(
      { teacher_id: teacherId, student_id: studentId, relationship: "Teacher" },
      { onConflict: "teacher_id,student_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: { message: "Teacher linked to student." } });
  }

  const fullName = String(body.parent_name ?? "").trim();
  const email = String(body.parent_email ?? "").trim() || null;
  const phone = String(body.parent_phone ?? "").trim() || null;
  if (!fullName) return NextResponse.json({ error: "Enter the parent name." }, { status: 400 });

  let parent: Row | null = null;
  if (email) {
    const { data } = await service.from("parent_profiles").select("id,profile_id").eq("email", email).maybeSingle();
    parent = data;
  }
  if (parent?.id) {
    const { error } = await service.from("parent_profiles").update({ full_name: fullName, phone, status: "Active" }).eq("id", parent.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { data, error } = await service.from("parent_profiles")
      .insert({ full_name: fullName, email, phone, status: "Active" })
      .select("id,profile_id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    parent = data;
  }
  if (!parent?.id) return NextResponse.json({ error: "Parent could not be created." }, { status: 400 });

  const { error: linkError } = await service.from("parent_student_links").upsert(
    { parent_id: parent.id, student_id: studentId, relationship: String(body.relationship ?? "Parent").trim() || "Parent" },
    { onConflict: "parent_id,student_id" }
  );
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 });

  let portalMessage = "Parent linked to student.";
  if (email && !parent.profile_id) {
    const invited = await service.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } });
    if (invited.error) return NextResponse.json({ error: invited.error.message }, { status: 400 });
    const user = invited.data.user;
    await service.from("profiles").upsert({ id: user.id, full_name: fullName, role: "parent" }, { onConflict: "id" });
    await service.from("parent_profiles").update({ profile_id: user.id }).eq("id", parent.id);
    portalMessage = "Parent linked and a secure portal invitation was sent.";
  } else if (email && parent.profile_id) {
    portalMessage = "Parent linked to the existing portal account.";
  }

  return NextResponse.json({ data: { message: "Parent linked to student.", portal_message: portalMessage } });
}
