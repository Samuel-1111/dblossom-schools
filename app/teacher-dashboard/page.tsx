import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";

export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher-portal");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "teacher") redirect("/");
  const { data: classes } = await supabase.from("classes").select("id, name, grade_level, academic_year").eq("teacher_id", user.id);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white"><div className="container flex h-20 items-center justify-between"><div><p className="text-sm text-slate-500">D'Blossom Model Private Schools</p><h1 className="text-2xl" style={{ color: "var(--navy)" }}>Teacher Portal</h1></div><form action="/auth/signout" method="post"><button className="rounded-md border border-slate-300 px-4 py-2 text-sm">Sign out</button></form></div></header>
      <section className="container py-12"><p className="text-slate-600">Welcome, {profile.full_name ?? user.email}. Results and attendance are limited to your assigned classes.</p><h2 className="mt-10 text-3xl" style={{ color: "var(--navy)" }}>Assigned classes</h2><div className="mt-6 grid gap-5 md:grid-cols-3">{(classes ?? []).map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-2xl" style={{ color: "var(--navy)" }}>{item.name}</h3><p className="mt-2 text-sm text-slate-500">{item.grade_level} · {item.academic_year}</p><div className="mt-5 flex gap-2"><button className="rounded-md px-3 py-2 text-sm text-white" style={{ background: "var(--navy)" }}>Enter grades</button><button className="rounded-md border border-slate-300 px-3 py-2 text-sm">Attendance</button></div></article>)}{classes?.length === 0 && <p className="text-slate-500">No classes are assigned to this account yet.</p>}</div></section>
    </main>
  );
}
