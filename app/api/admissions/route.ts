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
    application_number: applicationNumber, applicant_name: applicantName,
    date_of_birth: body.date_of_birth || null, gender: String(body.gender ?? "").trim() || null,
    class_applied: String(body.class_applied ?? "").trim() || null, parent_name: parentName,
    parent_email: parentEmail || null, parent_phone: parentPhone,
    address: String(body.address ?? "").trim() || null, status: "Pending"
  }).select("application_number").single();

  if (error) return NextResponse.json({ error: "Application could not be submitted." }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const number = params.get("application")?.trim();
  const contact = params.get("contact")?.trim();
  if (!number || !contact) return NextResponse.json({ error: "Application number and parent email or phone are required." }, { status: 400 });

  const db = createServiceClient();
  const { data, error } = await db.from("admission_applications")
    .select("application_number, applicant_name, class_applied, parent_email, parent_phone, status, interview_date, created_at")
    .eq("application_number", number).maybeSingle();

  if (error) return NextResponse.json({ error: "Application lookup failed." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const normalizedContact = contact.toLowerCase();
  const emailMatches = String(data.parent_email ?? "").toLowerCase() === normalizedContact;
  const phoneMatches = String(data.parent_phone ?? "").replace(/\D/g, "") === contact.replace(/\D/g, "");
  if (!emailMatches && !phoneMatches) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  return NextResponse.json({
    data: {
      application_number: data.application_number,
      applicant_name: data.applicant_name,
      class_applied: data.class_applied,
      status: data.status,
      interview_date: data.interview_date,
      created_at: data.created_at
    }
  });
}
