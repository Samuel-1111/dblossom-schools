import { NextResponse } from "next/server";
import { createServiceClient } from "../../../utils/supabase/service";

export const dynamic = "force-dynamic";

type PortalRole = "student" | "teacher" | "parent";

function normalize(value: string) { return value.trim().toLowerCase(); }

async function findPortalRecord(supabase: ReturnType<typeof createServiceClient>, role: PortalRole, identifier: string) {
  if (role === "parent") {
    const safe = identifier.replace(/[%_]/g, "\\$&");
    const { data, error } = await supabase.from("parent_profiles")
      .select("id,full_name,email,phone,status,profile_id")
      .or(`email.ilike.%${safe}%,phone.ilike.%${safe}%`)
      .limit(1).maybeSingle();
    return { record: data as any, error };
  }

  const table = role === "student" ? "students" : "teachers";
  const identifierColumn = role === "student" ? "admission_number" : "staff_id";
  const columns = role === "student"
    ? "id,admission_number,full_name,status,profile_id"
    : "id,full_name,email,status,role,profile_id,staff_id";

  const { data, error } = await supabase.from(table).select(columns).ilike(identifierColumn, identifier).limit(1).maybeSingle();
  return { record: data as any, error };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { role?: PortalRole; identifier?: string };
    const role = body.role;
    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    if (!["student", "teacher", "parent"].includes(role ?? "") || !identifier) {
      return NextResponse.json({ error: "Role and identifier are required." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { record, error } = await findPortalRecord(supabase, role as PortalRole, identifier);
    if (error) return NextResponse.json({ error: "Portal account could not be loaded." }, { status: 503 });
    if (!record) return NextResponse.json({ error: "Portal account not found." }, { status: 404 });

    const status = normalize(record.status ?? "active");
    if (status && !["active", "enabled"].includes(status)) return NextResponse.json({ error: "This portal account is inactive." }, { status: 401 });

    if (!record.profile_id) {
      return NextResponse.json({ error: "This portal account has not been activated by the school administrator yet." }, { status: 401 });
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(record.profile_id);
    if (authError || !authUser.user?.email) {
      return NextResponse.json({ error: "Portal authentication is not configured for this account." }, { status: 503 });
    }

    return NextResponse.json({ login_email: authUser.user.email });
  } catch {
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 503 });
  }
}
