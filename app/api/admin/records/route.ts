import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidLocalAdminToken, LOCAL_ADMIN_COOKIE } from "../../../../utils/local-admin";
import { createServiceClient } from "../../../../utils/supabase/service";

export const dynamic = "force-dynamic";

type AdminTable = "students" | "teachers" | "results";
type AdminMediaTable = "events" | "gallery_images";
type AdminReadTable = AdminTable | "classes" | AdminMediaTable | "payments";

async function authorize() {
  const token = (await cookies()).get(LOCAL_ADMIN_COOKIE)?.value;
  return isValidLocalAdminToken(token);
}

function requestedTable(request: Request): AdminReadTable | null {
  const table = new URL(request.url).searchParams.get("table") ?? "";
  if (table === "students" || table === "teachers" || table === "results" || table === "classes" || table === "events" || table === "gallery_images" || table === "payments") return table;
  return null;
}

function cleanMediaPayload(table: AdminMediaTable, body: Record<string, unknown>) {
  if (table === "events") return {
    ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
    ...(typeof body.description === "string" || body.description === null ? { description: body.description } : {}),
    ...(typeof body.event_date === "string" ? { event_date: body.event_date } : {}),
    ...(typeof body.image_url === "string" || body.image_url === null ? { image_url: body.image_url } : {}),
  };
  return {
    ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
    ...(typeof body.alt_text === "string" || body.alt_text === null ? { alt_text: body.alt_text } : {}),
    ...(typeof body.image_url === "string" ? { image_url: body.image_url } : {}),
  };
}

function cleanPayload(table: AdminTable, body: Record<string, unknown>) {
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
  if (table === "teachers") {
    return {
      ...(typeof body.full_name === "string" ? { full_name: body.full_name.trim() } : {}),
      ...(typeof body.email === "string" || body.email === null ? { email: body.email } : {}),
      ...(typeof body.phone === "string" || body.phone === null ? { phone: body.phone } : {}),
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
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  if (!table) return NextResponse.json({ error: "Unsupported Admin table" }, { status: 400 });
  const query = createServiceClient().from(table).select("*");
  const { data, error } = table === "classes" ? await query.order("name", { ascending: true }) : table === "events" ? await query.order("event_date", { ascending: true }) : await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  if (!table) return NextResponse.json({ error: "Unsupported Admin table" }, { status: 400 });
  if (table !== "students" && table !== "teachers" && table !== "events" && table !== "gallery_images") return NextResponse.json({ error: "This Admin table is read-only here" }, { status: 400 });
  const body = await request.json();
  const payload = table === "events" || table === "gallery_images" ? cleanMediaPayload(table, body) : cleanPayload(table, body);
  const { data, error } = await createServiceClient().from(table).insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  const id = new URL(request.url).searchParams.get("id");
  if (!table || !id) return NextResponse.json({ error: "Table and record id are required" }, { status: 400 });
  if (table === "payments") {
    const body = await request.json();
    if (body.status !== "Confirmed" && body.status !== "Rejected" && body.status !== "Pending") return NextResponse.json({ error: "Payment status must be Confirmed, Rejected, or Pending" }, { status: 400 });
    const { data, error } = await createServiceClient().from("payments").update({ status: body.status }).eq("id", id).select().single();
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
  if (!(await authorize())) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const table = requestedTable(request);
  const id = new URL(request.url).searchParams.get("id");
  if (!table || !id) return NextResponse.json({ error: "Table and record id are required" }, { status: 400 });
  if (table !== "students" && table !== "teachers" && table !== "events" && table !== "gallery_images") return NextResponse.json({ error: "This Admin table is read-only here" }, { status: 400 });
  const { error } = await createServiceClient().from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
