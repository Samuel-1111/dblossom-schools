import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import { StudentDashboardClient } from "./StudentDashboardClient";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/student-portal");
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "student") redirect("/");
  const { data: student } = await supabase.from("students").select("id, student_number, guardian_name").eq("profile_id", user.id).single();
  if (!student) return <StudentDashboardClient fullName={profile.full_name ?? user.email ?? "Student"} studentNumber="Not assigned yet" guardianName={null} grades={[]} attendance={[]} announcements={[]} />;
  const [{ data: grades }, { data: attendance }, { data: announcements }] = await Promise.all([
    supabase.from("grades").select("id, term, session, score, max_score, subjects(name)").eq("student_id", student.id).order("created_at", { ascending: false }),
    supabase.from("attendance").select("id, date, status").eq("student_id", student.id).order("date", { ascending: false }).limit(20),
    supabase.from("announcements").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(10),
  ]);
  const normalizedGrades = (grades ?? []).map((item: any) => ({ ...item, subject_name: item.subjects?.name ?? null }));
  return <StudentDashboardClient fullName={profile.full_name ?? user.email ?? "Student"} studentNumber={student.student_number} guardianName={student.guardian_name} grades={normalizedGrades} attendance={attendance ?? []} announcements={announcements ?? []} />;
}
