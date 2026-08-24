import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import { TeacherDashboardClient } from "./TeacherDashboardClient";

export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher-portal");
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "teacher") redirect("/");
  const { data: classes } = await supabase.from("classes").select("id, name, grade_level, academic_year").eq("teacher_id", user.id).order("name");
  return <TeacherDashboardClient fullName={profile.full_name ?? user.email ?? "Teacher"} classes={classes ?? []} canUpload={Boolean(classes?.length)} />;
}
