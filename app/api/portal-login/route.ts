import { NextResponse } from "next/server";
import { createServiceClient } from "../../../utils/supabase/service";

export const dynamic = "force-dynamic";

type PortalRole = "student" | "teacher" | "parent";

type PortalRecord = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  admission_number?: string | null;
  student_number?: string | null;
  password?: string | null;
  status?: string | null;
  profile_id?: string | null;
  staff_id?: string | null;
  role?: string | null;
  assigned_class?: string | null;
};

function normalize(value: string) { return value.trim().toLowerCase(); }
function firstNameFromFullName(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[1] : parts[0] ?? "";
}
function authCompatiblePassword(password: string) { return password.length >= 6 ? password : `${password}#Db1`; }
function fallbackPasswords(fullName: string | null | undefined, role: PortalRole) {
  if (role === "parent") return [];
  const firstName = firstNameFromFullName(fullName);
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const candidates = role === "student" ? [firstName] : [firstName, parts.at(-1), parts[0]];
  return Array.from(new Set(candidates.filter(Boolean).flatMap((value) => [value, value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()])));
}
function localLoginEmail(role: PortalRole, identifier: string) {
  const safe = normalize(identifier).replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "user";
  return `${role}-${safe}@local.dblossom.school`;
}

async function getOrCreateAuthUser(supabase: ReturnType<typeof createServiceClient>, email: string, password: string, fullName: string, role: PortalRole, identifier: string, rotateExistingPassword: boolean) {
  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  const existing = listed.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  const metadata = { full_name: fullName, portal_identifier: identifier };
  if (existing) {
    if (rotateExistingPassword) {
      const updated = await supabase.auth.admin.updateUserById(existing.id, { password, user_metadata: metadata });
      if (updated.error) throw updated.error;
      return updated.data.user;
    }
    return existing;
  }
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
  if (created.error) throw created.error;
  return created.data.user;
}

async function findPortalRecord(supabase: ReturnType<typeof createServiceClient>, role: PortalRole, identifier: string) {
  if (role === "parent") {
    const safe = identifier.replace(/[%_]/g, "\\$&");
    const { data, error } = await supabase.from("parent_profiles")
      .select("id,full_name,email,phone,status,profile_id")
      .or(`email.ilike.%${safe}%,phone.ilike.%${safe}%`)
      .limit(1).maybeSingle();
    return { record: data as PortalRecord | null, schemaError: error?.message ?? null };
  }

  const table = role === "student" ? "students" : "teachers";
  const identifierColumn = role === "student" ? "admission_number" : "staff_id";
  const richColumns = role === "student"
    ? "id,admission_number,full_name,password,status,profile_id"
    : "id,full_name,email,password,status,profile_id,staff_id,role,assigned_class";
  const minimalColumns = role === "student"
    ? "id,admission_number,full_name,status"
    : "id,full_name,email,status,role,assigned_class";

  const rich = await supabase.from(table).select(richColumns).ilike(identifierColumn, identifier).limit(1).maybeSingle();
  if (rich.data) return { record: rich.data as unknown as PortalRecord, schemaError: null as string | null };
  const minimal = await supabase.from(table).select(minimalColumns).ilike(identifierColumn, identifier).limit(1).maybeSingle();
  if (minimal.data) return { record: minimal.data as unknown as PortalRecord, schemaError: null as string | null };

  if (role === "student") {
    const legacy = await supabase.from(table).select("id,student_number,full_name,status").ilike("student_number", identifier).limit(1).maybeSingle();
    if (legacy.data) return { record: legacy.data as PortalRecord, schemaError: null as string | null };
  } else {
    const byEmail = await supabase.from(table).select(minimalColumns).ilike("email", identifier).limit(1).maybeSingle();
    if (byEmail.data) return { record: byEmail.data as unknown as PortalRecord, schemaError: null as string | null };
  }
  return { record: null, schemaError: rich.error?.message || minimal.error?.message || null };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { role?: PortalRole; identifier?: string; password?: string };
    const role = body.role;
    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!["student", "teacher", "parent"].includes(role ?? "") || !identifier || !password) {
      return NextResponse.json({ error: "Role, identifier, and password are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { record, schemaError } = await findPortalRecord(supabase, role as PortalRole, identifier);
    if (!record && schemaError && !/column .* does not exist/i.test(schemaError)) return NextResponse.json({ error: "Portal records are not configured yet" }, { status: 503 });
    if (!record) return NextResponse.json({ error: "Portal record not found" }, { status: 404 });

    const status = normalize(record.status ?? "active");
    if (status && !["active", "enabled"].includes(status)) return NextResponse.json({ error: "This portal account is inactive" }, { status: 401 });

    if (role === "parent") {
      if (!record.email || !record.profile_id) return NextResponse.json({ error: "Parent portal access has not been activated yet. Ask the school administrator to send the portal invitation." }, { status: 401 });
      return NextResponse.json({ login_email: record.email });
    }

    const storedPassword = record.password?.trim() || "";
    const validPasswords = Array.from(new Set([storedPassword, ...fallbackPasswords(record.full_name, role as PortalRole)].filter(Boolean)));
    if (!validPasswords.some((candidate) => normalize(candidate) === normalize(password))) return NextResponse.json({ error: "Invalid portal credentials" }, { status: 401 });

    const email = record.email?.trim() || localLoginEmail(role as PortalRole, identifier);
    const fullName = record.full_name?.trim() || (role === "student" ? `Student ${record.admission_number ?? record.student_number ?? identifier}` : "Teacher");
    const legacyPassword = storedPassword || fallbackPasswords(record.full_name, role as PortalRole)[0] || "";
    const user = await getOrCreateAuthUser(supabase, email, authCompatiblePassword(password), fullName, role as PortalRole, identifier, Boolean(legacyPassword));
    if (!user) return NextResponse.json({ error: "Unable to create portal identity" }, { status: 503 });

    await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, role }, { onConflict: "id" });
    if (role === "teacher") await supabase.from("teachers").update({ profile_id: user.id, password: null }).eq("id", record.id);
    if (role === "student") await supabase.from("students").update({ profile_id: user.id, password: null }).eq("id", record.id);

    return NextResponse.json({ login_email: email });
  } catch {
    return NextResponse.json({ error: "Unable to sign in right now" }, { status: 503 });
  }
}
