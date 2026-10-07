import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import { createServiceClient } from "../../utils/supabase/service";
import { ParentDashboardClient } from "./ParentDashboardClient";

export default async function ParentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/parent-portal");

  const service = createServiceClient();
  const { data: profile } = await service.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "parent") redirect("/");

  const { data: parent } = await service.from("parent_profiles").select("id, full_name, email, phone").eq("profile_id", user.id).maybeSingle();
  if (!parent) return <ParentDashboardClient fullName={profile.full_name ?? "Parent"} students={[]} announcements={[]} invoices={[]} payments={[]} notifications={[]} assignments={[]} calendar={[]} messages={[]} />;

  const { data: links } = await service.from("parent_student_links")
    .select("student_id, relationship, students(id, full_name, admission_number, class_id, classes(name))")
    .eq("parent_id", parent.id);

  const students = (links ?? []).map((row: any) => {
    const student = Array.isArray(row.students) ? row.students[0] : row.students;
    const cls = Array.isArray(student?.classes) ? student.classes[0] : student?.classes;
    return { id: student?.id, full_name: student?.full_name, admission_number: student?.admission_number, class_name: cls?.name, class_id: student?.class_id, relationship: row.relationship };
  }).filter((item: any) => item.id);

  const studentIds = students.map((item: any) => item.id);
  const classIds = students.map((item: any) => item.class_id).filter(Boolean);
  const [{ data: invoices }, { data: payments }, { data: notifications }, { data: calendar }, { data: messages }, { data: assignments }] = await Promise.all([
    studentIds.length ? service.from("fee_invoices").select("id, student_id, invoice_number, due_date, status, total_amount, amount_paid, balance, created_at, fee_invoice_items(description, amount)").in("student_id", studentIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    studentIds.length ? service.from("fee_payments").select("id, invoice_id, student_id, amount, method, reference, status, paid_at, created_at").in("student_id", studentIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    service.from("parent_notifications").select("id, title, body, type, link, read_at, created_at").eq("parent_id", parent.id).order("created_at", { ascending: false }).limit(20),
    service.from("parent_calendar_events").select("id, title, description, event_date, start_time, end_time, audience, class_id").order("event_date", { ascending: true }).limit(30),
    service.from("parent_messages").select("id, subject, body, read_at, created_at, sender_profile_id").eq("parent_id", parent.id).order("created_at", { ascending: false }).limit(30),
    classIds.length ? service.from("assignments").select("id, title, description, due_date, max_score, status, class_id, subjects(name)").in("class_id", classIds).order("due_date", { ascending: true }).limit(30) : Promise.resolve({ data: [] }),
  ]);

  const announcementFilter = studentIds.length
    ? "audience.eq.all,audience.eq.parent,target_student_id.in.(" + studentIds.join(",") + ")"
    : "audience.eq.all,audience.eq.parent";
  const { data: announcements } = await service.from("announcements")
    .select("id, title, body, created_at, pinned, audience, target_class_id, target_student_id, status")
    .eq("status", "Published")
    .or(announcementFilter)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  return <ParentDashboardClient fullName={parent.full_name ?? profile.full_name ?? "Parent"} students={students} announcements={announcements ?? []} invoices={invoices ?? []} payments={payments ?? []} notifications={notifications ?? []} assignments={assignments ?? []} calendar={calendar ?? []} messages={messages ?? []} />;
}
