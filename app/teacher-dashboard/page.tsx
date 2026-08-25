import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import { createServiceClient } from "../../utils/supabase/service";
import { TeacherDashboardClient } from "./TeacherDashboardClient";

function normalizeClassName(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher-portal");

  const dataClient = createServiceClient();
  const { data: profile } = await dataClient.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? user.user_metadata?.role;
  if (role !== "teacher") redirect("/");

  const identifier = String(user.user_metadata?.portal_identifier ?? "");
  const { data: teacher } = await dataClient.from("teachers").select("assigned_class").eq("staff_id", identifier).maybeSingle();
  const { data: linkedClasses } = await dataClient.from("classes").select("id, name, grade_level, academic_year").eq("teacher_id", user.id).order("name");

  const configuredClassName = teacher?.assigned_class ?? user.user_metadata?.assigned_class ?? "";
  let assignedClasses = linkedClasses ?? [];
  if (!assignedClasses.length && configuredClassName) {
    const { data: namedClasses } = await dataClient.from("classes").select("id, name, grade_level, academic_year").order("name");
    const fallbackClass = (namedClasses ?? []).find((item) => normalizeClassName(item.name) === normalizeClassName(configuredClassName));
    if (fallbackClass) assignedClasses = [fallbackClass];
  }

  const assignedClassName = assignedClasses[0]?.name ?? configuredClassName ?? "No class assigned";
  const portalRole = String(user.user_metadata?.portal_role ?? "Teaching Staff");
  const canUpload = /class teacher/i.test(portalRole) && assignedClassName !== "No class assigned";
  return <TeacherDashboardClient fullName={profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Teacher"} role={portalRole} assignedClass={assignedClassName} classes={assignedClasses} canUpload={canUpload} />;
}
