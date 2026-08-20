import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white"><div className="container flex h-20 items-center justify-between"><div><p className="text-sm text-slate-500">D'Blossom Model Private Schools</p><h1 className="text-2xl" style={{ color: "var(--navy)" }}>Admin Dashboard</h1></div><form action="/auth/signout" method="post"><button className="rounded-md border border-slate-300 px-4 py-2 text-sm">Sign out</button></form></div></header>
      <section className="container py-12"><p className="text-slate-600">Welcome, {profile.full_name ?? user.email}.</p><div className="mt-8 grid gap-5 md:grid-cols-3">{["Students", "Teachers & Classes", "Announcements", "Attendance", "Grades", "School Settings"].map((item) => <article key={item} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl" style={{ color: "var(--navy)" }}>{item}</h2><p className="mt-2 text-sm text-slate-500">Manage {item.toLowerCase()} from the Supabase-backed administrator workspace.</p></article>)}</div></section>
    </main>
  );
}
