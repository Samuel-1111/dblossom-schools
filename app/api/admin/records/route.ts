import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidLocalAdminToken, LOCAL_ADMIN_COOKIE } from "../../../../utils/local-admin";
import { createServiceClient } from "../../../../utils/supabase/service";

export const dynamic = "force-dynamic";

type AdminTable = "students" | "teachers";
const tableNames = new Set<AdminTable>(["students", "teachers"]);

async function authorize() {
  const token = (await cookies()).get(LOCAL_ADMIN_COOKIE)?.value;
  return isValidLocalAdminToken(token);
}

function requestedTable(request: Request): AdminTable | null {
  const table = new URL(request.url).searchParams.get("table") ?? "";
  if (table === "students" || table === "teachers") return table;
  return null;
}

function cleanPayload(table: "students" | "teachers", body: Record<string, unknown>) {
  if (table === "students") {
    return {
      ...(typeof body.admission_number === "string" ? { admission_number: body.admission_number.trim() } : {}),
      ...(typeof body.full_name === "string" ? { full_name: body.full_name.trim() } : {}),
      ...(typeof body.class_id === "string" || typeof body.class_id === "number" || body.class_id === null ? { class_id: body.class_id } : {}),
      ...(typeof body.date_of_birth === "string" || body.date_of_birth === null ? { date_of_birth: body.date_of_birth } : {}),
      ...(typeof body.guardian_name === "string" || body.guardian_name === null ? { guardian_name: body.guardian_name } : {}),
      ...(typeof body.guardian_contact === "string" || body.guardian_contact === null ? { guardian_contact: body.guardian_contact } : {}),
      ...(typeof body.status === "string" ? { status: body.status.toLowerCase() } : {}),
    };
  }
  return {
    ...(typeof body.full_name === "string" ? { full_name: body.full_name.trim() } : {}),
    ...(typeof body.email === "string" || body.email === null ? { email: body.email } : {}),
    ...(typeof body.phone === "string" || body.phone === null ? { phone: body.phone } : {}),
    ...(typeof body.status === "string" ? { status: body.status.toLowerCase() } : {}),
  };
}

export async function GET(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  if (!table) return NextResponse.json({ error: "Unsupported Admin table" }, { status: 400 });
  const { data, error } = await createServiceClient().from(table).select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  if (!table) return NextResponse.json({ error: "Unsupported Admin table" }, { status: 400 });
  const payload = cleanPayload(table, await request.json());
  const { data, error } = await createServiceClient().from(table).insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  const id = new URL(request.url).searchParams.get("id");
  if (!table || !id) return NextResponse.json({ error: "Table and record id are required" }, { status: 400 });
  const payload = cleanPayload(table, await request.json());
  const { data, error } = await createServiceClient().from(table).update(payload).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  const id = new URL(request.url).searchParams.get("id");
  if (!table || !id) return NextResponse.json({ error: "Table and record id are required" }, { status: 400 });
  const { error } = await createServiceClient().from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
