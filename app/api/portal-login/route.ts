import { NextResponse } from "next/server";
import { createServiceClient } from "../../../utils/supabase/service";

export const dynamic = "force-dynamic";

type PortalRole = "student" | "teacher";

type PortalRecord = {
  id: number;
  full_name?: string | null;
  email?: string | null;
  admission_number?: string | null;
  student_number?: string | null;
  password: string | null;
  status: string | null;
  profile_id: string | null;
  staff_id?: string | null;
  role?: string | null;
  assigned_class?: string | null;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function localLoginEmail(role: PortalRole, identifier: string) {
  const safe = normalize(identifier).replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "user";
  return `${role}-${safe}@local.dblossom.school`;
}

async function getOrCreateAuthUser(supabase: ReturnType<typeof createServiceClient>, email: string, password: string, fullName: string, role: PortalRole, identifier: string) {
  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  const existing = listed.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    const updated = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: { full_name: fullName, role, portal_identifier: identifier },
    });
    if (updated.error) throw updated.error;
    return updated.data.user;
  }
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, portal_identifier: identifier },
  });
  if (created.error) throw created.error;
  return created.data.user;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { role?: PortalRole; identifier?: string; password?: string };
    const role = body.role;
    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if ((role !== "student" && role !== "teacher") || !identifier || !password) {
      return NextResponse.json({ error: "Role, identifier, and password are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const table = role === "student" ? "students" : "teachers";
    const identifierColumn = role === "student" ? "admission_number" : "staff_id";
    const selectColumns = role === "student" ? "id,admission_number,full_name,password,status,profile_id" : "id,full_name,email,password,status,profile_id,staff_id,role,assigned_class";
    let data: unknown = null;
    let error: { message?: string } | null = null;
    const primaryResult = await supabase.from(table).select(selectColumns).ilike(identifierColumn, identifier).limit(1).maybeSingle();
    data = primaryResult.data;
    error = primaryResult.error;
    if (error) {
      const legacyColumns = role === "student" ? "id,admission_number,full_name,password,status" : "id,full_name,email,password,status,staff_id,role,assigned_class";
      const legacyResult = await supabase.from(table).select(legacyColumns).ilike(identifierColumn, identifier).limit(1).maybeSingle();
      data = legacyResult.data;
      error = legacyResult.error;
    }
    if (error && role === "student") {
      const legacyStudent = await supabase.from(table).select("id,student_number,full_name,password,status").ilike("student_number", identifier).limit(1).maybeSingle();
      data = legacyStudent.data;
      error = legacyStudent.error;
    }
    if (error) return NextResponse.json({ error: "Portal records are not configured yet" }, { status: 503 });
    const record = data as PortalRecord | null;
    if (!record || (record.status && !["active", "enabled"].includes(normalize(record.status))) || record.password !== password) {
      return NextResponse.json({ error: "Invalid portal credentials" }, { status: 401 });
    }

    const email = record.email?.trim() || localLoginEmail(role, identifier);
    const fullName = record.full_name?.trim() || (role === "student" ? `Student ${record.admission_number ?? record.student_number ?? identifier}` : "Teacher");
    const user = await getOrCreateAuthUser(supabase, email, password, fullName, role, identifier);
    if (!user) return NextResponse.json({ error: "Unable to create portal identity" }, { status: 503 });

    await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, role }, { onConflict: "id" });
    if (role === "teacher") await supabase.auth.admin.updateUserById(user.id, { user_metadata: { full_name: fullName, role, portal_role: (record as PortalRecord & { role?: string | null }).role ?? "Teaching Staff", assigned_class: (record as PortalRecord & { assigned_class?: string | null }).assigned_class ?? null, portal_identifier: identifier } });
    if (record.profile_id !== user.id) await supabase.from(table).update({ profile_id: user.id }).eq("id", record.id);

    return NextResponse.json({ login_email: email });
  } catch {
    return NextResponse.json({ error: "Unable to sign in right now" }, { status: 503 });
  }
}
