import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import { createServiceClient } from "../../utils/supabase/service";
import { StudentDashboardClient } from "./StudentDashboardClient";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/student-portal");

  const dataClient = createServiceClient();
  const { data: profile } = await dataClient.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? user.user_metadata?.role;
  if (role !== "student") redirect("/");

  const identifier = String(user.user_metadata?.portal_identifier ?? "");
  const profileStudent = await dataClient.from("students").select("id, admission_number, guardian_name, classes(name)").eq("profile_id", user.id).maybeSingle();
  const legacyStudent = !profileStudent.data && identifier ? await dataClient.from("students").select("id, admission_number, guardian_name, classes(name)").ilike("admission_number", identifier).maybeSingle() : { data: null };
  const student = profileStudent.data ?? legacyStudent.data;
  const displayName = profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Student";
  if (!student) return <StudentDashboardClient fullName={displayName} studentNumber={identifier || "Not assigned yet"} className="Class not assigned" guardianName={null} position={null} grades={[]} attendance={[]} announcements={[]} />;

  const [{ data: resultRows }, { data: attendance }, { data: announcements }] = await Promise.all([
    dataClient.from("results").select("id, ca_score, exam_score, total_score, grade, teacher_comment, principal_comment, subjects(name), terms(name, session_id, academic_sessions(name))").eq("student_id", student.id).order("created_at", { ascending: false }),
    dataClient.from("attendance").select("id, date, status").eq("student_id", student.id).order("date", { ascending: false }).limit(20),
    dataClient.from("announcements").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(10),
  ]);

  const normalizedGrades = (resultRows ?? []).map((item: any) => ({
    id: item.id,
    term: item.terms?.name ?? "Term",
    session: item.terms?.academic_sessions?.name ?? null,
    score: Number(item.total_score ?? (Number(item.ca_score ?? 0) + Number(item.exam_score ?? 0))),
    max_score: 100,
    subject_name: item.subjects?.name ?? null,
    ca_score: item.ca_score,
    exam_score: item.exam_score,
    grade: item.grade,
    teacher_comment: item.teacher_comment,
    principal_comment: item.principal_comment,
  }));
  const className = Array.isArray((student as any).classes) ? (student as any).classes[0]?.name : (student as any).classes?.name;
  return <StudentDashboardClient fullName={displayName} studentNumber={student.admission_number} className={className ?? "Class not assigned"} guardianName={student.guardian_name} position={null} grades={normalizedGrades} attendance={attendance ?? []} announcements={announcements ?? []} />;
}
