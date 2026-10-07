import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import { createServiceClient } from "../../utils/supabase/service";
import { TeacherDashboardClient } from "./TeacherDashboardClient";

export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher-portal");

  const dataClient = createServiceClient();
  const { data: profile } = await dataClient.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "teacher") redirect("/");

  const { data: teacher } = await dataClient.from("teachers").select("id, role, assigned_class").eq("profile_id", user.id).maybeSingle();
  if (!teacher) return <TeacherDashboardClient fullName={profile.full_name ?? user.email ?? "Teacher"} role="Teaching Staff" assignedClass="No class assigned" classes={[]} canUpload={false} />;

  const { data: assignedRows } = await dataClient.from("teacher_assignments").select("class_id, classes(id, name, grade_level, academic_year)").eq("teacher_id", teacher.id);
  const classMap = new Map<string, any>();
  for (const row of assignedRows ?? []) {
    const cls = Array.isArray((row as any).classes) ? (row as any).classes[0] : (row as any).classes;
    if (cls?.id) classMap.set(String(cls.id), cls);
  }

  const assignedClasses = [...classMap.values()];
  const assignedClassName = assignedClasses[0]?.name ?? teacher.assigned_class ?? "No class assigned";
  const portalRole = String(teacher.role ?? "Teaching Staff");
  const canUpload = /class teacher/i.test(portalRole) && assignedClasses.length > 0;

  return <TeacherDashboardClient fullName={profile.full_name ?? user.email ?? "Teacher"} role={portalRole} assignedClass={assignedClassName} classes={assignedClasses} canUpload={canUpload} />;
}
