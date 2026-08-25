import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import { TeacherDashboardClient } from "./TeacherDashboardClient";

export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher-portal");
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? user.user_metadata?.role;
  if (role !== "teacher") redirect("/");
  const identifier = String(user.user_metadata?.portal_identifier ?? "");
  const teacher = await supabase.from("teachers").select("assigned_class").eq("staff_id", identifier).maybeSingle();
  const { data: classes } = await supabase.from("classes").select("id, name, grade_level, academic_year").eq("teacher_id", user.id).order("name");
  const assignedClassName = classes?.[0]?.name ?? teacher.data?.assigned_class ?? "No class assigned";
  return <TeacherDashboardClient fullName={profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Teacher"} role={role} assignedClass={assignedClassName} classes={classes ?? []} canUpload={Boolean(classes?.length)} />;
}
