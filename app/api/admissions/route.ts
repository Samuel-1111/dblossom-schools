import { NextResponse } from "next/server";
import { createServiceClient } from "../../../utils/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const applicantName = String(body.applicant_name ?? "").trim();
  const parentName = String(body.parent_name ?? "").trim();
  const parentEmail = String(body.parent_email ?? "").trim();
  const parentPhone = String(body.parent_phone ?? "").trim();
  if (!applicantName || !parentName || !parentPhone) return NextResponse.json({ error: "Applicant name, parent name and parent phone are required." }, { status: 400 });

  const db = createServiceClient();
  const applicationNumber = `ADM-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  const { data, error } = await db.from("admission_applications").insert({
    application_number: applicationNumber,
    applicant_name: applicantName,
    date_of_birth: body.date_of_birth || null,
    gender: String(body.gender ?? "").trim() || null,
    class_applied: String(body.class_applied ?? "").trim() || null,
    parent_name: parentName,
    parent_email: parentEmail || null,
    parent_phone: parentPhone,
    address: String(body.address ?? "").trim() || null,
    status: "Pending"
  }).select("application_number").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
