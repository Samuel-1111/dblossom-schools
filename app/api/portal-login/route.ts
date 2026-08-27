import { NextResponse } from "next/server";
import { createServiceClient } from "../../../utils/supabase/service";
import { createLocalStudentToken, LOCAL_STUDENT_COOKIE } from "../../../utils/local-student";

export const dynamic = "force-dynamic";

type PortalRole = "student" | "teacher";

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

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function surnameFromFullName(fullName: string | null | undefined) {
  return (fullName ?? "").trim().split(/\s+/).filter(Boolean)[0] ?? "";
}

function fallbackPasswords(fullName: string | null | undefined, role: PortalRole) {
  const surname = surnameFromFullName(fullName);
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const candidates = (role === "student" ? [surname] : [parts.at(-1), parts[0]]).filter((value): value is string => Boolean(value));
  return Array.from(new Set(candidates.flatMap((value) => [value, value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()])));
}

function localLoginEmail(role: PortalRole, identifier: string) {
  const safe = normalize(identifier).replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "user";
  return `${role}-${safe}@local.dblossom.school`;
}

async function getOrCreateAuthUser(supabase: ReturnType<typeof createServiceClient>, email: string, password: string, fullName: string, role: PortalRole, identifier: string) {
  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  const existing = listed.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  const metadata = { full_name: fullName, role, portal_identifier: identifier };
  if (existing) {
    const updated = await supabase.auth.admin.updateUserById(existing.id, { password, user_metadata: metadata });
    if (updated.error) throw updated.error;
    return updated.data.user;
  }
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
  if (created.error) throw created.error;
  return created.data.user;
}

async function findPortalRecord(supabase: ReturnType<typeof createServiceClient>, role: PortalRole, identifier: string) {
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
    const byName = await supabase.from(table).select(minimalColumns).ilike("full_name", identifier).limit(1).maybeSingle();
    if (byName.data) return { record: byName.data as unknown as PortalRecord, schemaError: null as string | null };
  }

  const schemaError = rich.error?.message || minimal.error?.message || null;
  return { record: null, schemaError };
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
    const { record, schemaError } = await findPortalRecord(supabase, role, identifier);
    if (!record && schemaError && !/column .* does not exist/i.test(schemaError)) {
      return NextResponse.json({ error: "Portal records are not configured yet" }, { status: 503 });
    }
    if (!record) return NextResponse.json({ error: "Portal record not found" }, { status: 404 });
    const storedPassword = record.password?.trim() || "";
    const validPasswords = storedPassword ? [storedPassword] : fallbackPasswords(record.full_name, role);
    const status = normalize(record.status ?? "active");
    if ((status && !["active", "enabled"].includes(status)) || !validPasswords.includes(password)) {
      return NextResponse.json({ error: "Invalid portal credentials" }, { status: 401 });
    }

    const email = record.email?.trim() || localLoginEmail(role, identifier);
    const fullName = record.full_name?.trim() || (role === "student" ? `Student ${record.admission_number ?? record.student_number ?? identifier}` : "Teacher");
    if (role === "student") {
      const admissionNumber = record.admission_number ?? record.student_number ?? identifier;
      const token = await createLocalStudentToken(admissionNumber, fullName);
      const response = NextResponse.json({ login_email: email, local_session: true });
      response.cookies.set(LOCAL_STUDENT_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
      return response;
    }
    const user = await getOrCreateAuthUser(supabase, email, password, fullName, role, identifier);
    if (!user) return NextResponse.json({ error: "Unable to create portal identity" }, { status: 503 });

    await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, role }, { onConflict: "id" });
    if (role === "teacher") {
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          full_name: fullName,
          role,
          portal_role: record.role ?? "Teaching Staff",
          assigned_class: record.assigned_class ?? null,
          portal_identifier: identifier,
        },
      });
    }
    if (record.profile_id !== user.id) await supabase.from("teachers").update({ profile_id: user.id }).eq("id", record.id);

    return NextResponse.json({ login_email: email });
  } catch {
    return NextResponse.json({ error: "Unable to sign in right now" }, { status: 503 });
  }
}
