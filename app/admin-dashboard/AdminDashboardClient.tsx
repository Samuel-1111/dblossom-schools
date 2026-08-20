'use client';

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../../utils/supabase/client";

type Module = "students" | "teachers" | "results" | "payments" | "events" | "gallery" | "complaints" | "subjects" | "settings";
type Row = Record<string, any>;

const modules: Array<[Module, string]> = [
  ["students", "Students"], ["teachers", "Teachers"], ["results", "Results"], ["payments", "Payments"], ["events", "Events"], ["gallery", "Gallery"], ["complaints", "Complaints"], ["subjects", "Subjects"], ["settings", "Settings"],
];

export function AdminDashboardClient({ fullName }: { fullName: string }) {
  const supabase = createClient();
  const [active, setActive] = useState<Module>("students");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [student, setStudent] = useState({ student_number: "", full_name: "", class_id: "", guardian_name: "", guardian_contact: "" });
  const [teacher, setTeacher] = useState({ full_name: "", staff_id: "", role: "teacher", assigned_class: "", subject: "", status: "Active" });
  const [subject, setSubject] = useState({ name: "", class_id: "" });
  const [announcement, setAnnouncement] = useState({ title: "", body: "" });
  const [classes, setClasses] = useState<Row[]>([]);

  async function loadModule(module: Module) {
    setLoading(true);
    setNotice("");
    const table = module === "students" ? "students" : module === "teachers" ? "profiles" : module === "results" ? "results" : module === "subjects" ? "subjects" : module === "payments" ? "payments" : module === "events" ? "events" : module === "gallery" ? "gallery_images" : module === "complaints" ? "complaints" : "announcements";
    const query = supabase.from(table).select("*").order("created_at", { ascending: false });
    if (module === "teachers") query.eq("role", "teacher");
    const { data, error } = await query;
    if (error) setNotice(error.message);
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { void loadModule(active); }, [active]);
  useEffect(() => { void supabase.from("classes").select("*").order("name").then(({ data }) => setClasses(data ?? [])); }, []);

  async function addStudent(event: FormEvent) {
    event.preventDefault();
    const { error } = await supabase.from("students").insert({ student_number: student.student_number.trim(), guardian_name: student.guardian_name || null, guardian_contact: student.guardian_contact || null, class_id: student.class_id ? Number(student.class_id) : null });
    setNotice(error ? error.message : "Student added. Link the student to a Supabase Auth profile when credentials are provisioned.");
    if (!error) { setStudent({ student_number: "", full_name: "", class_id: "", guardian_name: "", guardian_contact: "" }); setShowStudentForm(false); await loadModule("students"); }
  }

  async function addTeacher(event: FormEvent) {
    event.preventDefault();
    setNotice("Teacher profile creation requires an Auth user. Create the Supabase Auth account first, then assign staff ID and class in Profiles.");
    setShowTeacherForm(false);
  }

  async function addSubject(event: FormEvent) {
    event.preventDefault();
    const { error } = await supabase.from("subjects").insert({ name: subject.name.trim(), class_id: Number(subject.class_id) });
    setNotice(error ? error.message : "Subject added.");
    if (!error) { setSubject({ name: "", class_id: "" }); await loadModule("subjects"); }
  }

  async function addAnnouncement(event: FormEvent) {
    event.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setNotice("Your session has expired. Sign in again.");
    const { error } = await supabase.from("announcements").insert({ title: announcement.title.trim(), body: announcement.body.trim(), posted_by: user.id });
    setNotice(error ? error.message : "Announcement posted.");
    if (!error) { setAnnouncement({ title: "", body: "" }); await loadModule("settings"); }
  }

  async function signOut() { await supabase.auth.signOut(); window.location.href = "/admin-login"; }

  const counts = useMemo(() => ({ current: rows.length, classes: classes.length }), [rows, classes]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b bg-white px-4 py-4 shadow-sm md:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">D'Blossom Model Private Schools</p><h1 className="text-2xl font-bold" style={{ color: "var(--navy)" }}>Admin Portal</h1><p className="text-sm text-slate-500">Welcome, {fullName}</p></div><button onClick={signOut} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Sign out</button></div></header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-8">
        <aside className="hidden w-56 shrink-0 rounded-xl border bg-white p-3 shadow-sm md:block"><nav aria-label="Admin modules" className="grid gap-1">{modules.map(([id, label]) => <button key={id} type="button" onClick={() => setActive(id)} aria-current={active === id ? "page" : undefined} className={`rounded-md px-3 py-2 text-left text-sm font-semibold ${active === id ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}</nav></aside>
        <section className="min-w-0 flex-1"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-slate-500">School management</p><h2 className="text-3xl font-bold" style={{ color: "var(--navy)" }}>{modules.find(([id]) => id === active)?.[1]}</h2></div><p className="text-sm text-slate-500">{counts.current} records · {counts.classes} classes</p></div>
          <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border bg-white p-2 md:hidden">{modules.map(([id, label]) => <button key={id} type="button" onClick={() => setActive(id)} className={`whitespace-nowrap rounded px-3 py-2 text-sm ${active === id ? "bg-blue-900 text-white" : "bg-slate-100"}`}>{label}</button>)}</div>
          {notice && <p role="status" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p>}
          {active === "students" && <ModuleCard title="Student Management" action={<button onClick={() => setShowStudentForm(true)} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Add Student</button>}>{showStudentForm && <form onSubmit={addStudent} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><input required placeholder="Admission number" value={student.student_number} onChange={(e) => setStudent({ ...student, student_number: e.target.value })} className="rounded border p-3" /><select value={student.class_id} onChange={(e) => setStudent({ ...student, class_id: e.target.value })} className="rounded border p-3"><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input placeholder="Guardian name" value={student.guardian_name} onChange={(e) => setStudent({ ...student, guardian_name: e.target.value })} className="rounded border p-3" /><input placeholder="Guardian contact" value={student.guardian_contact} onChange={(e) => setStudent({ ...student, guardian_contact: e.target.value })} className="rounded border p-3" /><div className="flex gap-2 md:col-span-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">Save Student</button><button type="button" onClick={() => setShowStudentForm(false)} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={rows} columns={["student_number", "class_id", "guardian_name", "status"]} loading={loading} /> </ModuleCard>}
          {active === "teachers" && <ModuleCard title="Teacher Management" action={<button onClick={() => setShowTeacherForm(true)} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Add Teacher</button>}>{showTeacherForm && <form onSubmit={addTeacher} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><input required placeholder="Full name" value={teacher.full_name} onChange={(e) => setTeacher({ ...teacher, full_name: e.target.value })} className="rounded border p-3" /><input required placeholder="Staff ID" value={teacher.staff_id} onChange={(e) => setTeacher({ ...teacher, staff_id: e.target.value })} className="rounded border p-3" /><input placeholder="Assigned class" value={teacher.assigned_class} onChange={(e) => setTeacher({ ...teacher, assigned_class: e.target.value })} className="rounded border p-3" /><input placeholder="Subject" value={teacher.subject} onChange={(e) => setTeacher({ ...teacher, subject: e.target.value })} className="rounded border p-3" /><div className="flex gap-2 md:col-span-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">Continue Teacher Setup</button><button type="button" onClick={() => setShowTeacherForm(false)} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={rows} columns={["full_name", "staff_id", "assigned_class", "subject", "status"]} loading={loading} /> </ModuleCard>}
          {active === "results" && <ModuleCard title="Results Review"><p className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">Result uploads are teacher-only. Class Teachers must upload results from the Teacher Portal for students in their assigned class. Administrators can review recorded results here.</p><DataTable rows={rows} columns={["student_name", "class_name", "term", "session", "average", "teacher_comment"]} loading={loading} /></ModuleCard>}
          {active === "subjects" && <ModuleCard title="Subject Management"><form onSubmit={addSubject} className="mb-5 flex flex-wrap gap-2"><input required placeholder="Subject name" value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} className="rounded border p-3" /><select required value={subject.class_id} onChange={(e) => setSubject({ ...subject, class_id: e.target.value })} className="rounded border p-3"><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">Add Subject</button></form><DataTable rows={rows} columns={["name", "class_id"]} loading={loading} /></ModuleCard>}
          {active === "settings" && <ModuleCard title="School Settings"><form onSubmit={addAnnouncement} className="grid gap-3 rounded-lg bg-slate-50 p-4"><input required placeholder="Announcement title" value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} className="rounded border p-3" /><textarea required placeholder="Announcement body" value={announcement.body} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} className="min-h-28 rounded border p-3" /><button className="w-fit rounded bg-blue-900 px-4 py-2 font-semibold text-white">Post Announcement</button></form><p className="mt-4 text-sm text-slate-600">Storage buckets, school branding, and account policy remain managed through Supabase configuration and the migration files included in this export.</p></ModuleCard>}
          {(["payments", "events", "gallery", "complaints"] as Module[]).includes(active) && <ModuleCard title={modules.find(([id]) => id === active)?.[1] ?? active}><DataTable rows={rows} columns={active === "payments" ? ["student_name", "amount", "status", "reference"] : active === "events" ? ["title", "event_date", "image_url"] : active === "gallery" ? ["title", "alt_text", "image_url"] : ["name", "subject", "status", "created_at"]} loading={loading} /></ModuleCard>}
        </section>
      </div>
    </main>
  );
}

function ModuleCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <article className="rounded-xl border bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold" style={{ color: "var(--navy)" }}>{title}</h3>{action}</div>{children}</article>; }
function DataTable({ rows, columns, loading }: { rows: Row[]; columns: string[]; loading: boolean }) { if (loading) return <p className="text-sm text-slate-500">Loading records…</p>; if (!rows.length) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No records yet.</p>; return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b">{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 font-semibold capitalize text-slate-600">{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id ?? index} className="border-b last:border-0">{columns.map((column) => <td key={column} className="max-w-xs truncate px-3 py-3 text-slate-700">{typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column] ?? "—")}</td>)}</tr>)}</tbody></table></div>; }
