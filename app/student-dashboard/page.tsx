import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/student-portal");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "student") redirect("/");
  const { data: student } = await supabase.from("students").select("id, student_number, date_of_birth, guardian_name, class_id").eq("profile_id", user.id).single();
  const [grades, attendance] = student ? await Promise.all([
    supabase.from("grades").select("id, term, score, max_score, subject_id").eq("student_id", student.id),
    supabase.from("attendance").select("id, date, status").eq("student_id", student.id).order("date", { ascending: false }).limit(20),
  ]) : [{ data: [] }, { data: [] }];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white"><div className="container flex h-20 items-center justify-between"><div><p className="text-sm text-slate-500">D'Blossom Model Private Schools</p><h1 className="text-2xl" style={{ color: "var(--navy)" }}>Student Portal</h1></div><form action="/auth/signout" method="post"><button className="rounded-md border border-slate-300 px-4 py-2 text-sm">Sign out</button></form></div></header>
      <section className="container py-12"><p className="text-slate-600">Welcome, {profile.full_name ?? user.email}.</p><div className="mt-8 grid gap-5 md:grid-cols-3"><article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl" style={{ color: "var(--navy)" }}>Profile</h2><p className="mt-3 text-slate-600">Admission number: {student?.student_number ?? "Not assigned yet"}</p><p className="mt-1 text-slate-600">Guardian: {student?.guardian_name ?? "Not provided"}</p></article><article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl" style={{ color: "var(--navy)" }}>Results</h2><p className="mt-3 text-slate-600">{grades.data?.length ?? 0} recorded grade entries.</p></article><article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl" style={{ color: "var(--navy)" }}>Attendance</h2><p className="mt-3 text-slate-600">{attendance.data?.length ?? 0} recent attendance records.</p></article></div></section>
    </main>
  );
}
