'use client';

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../../utils/supabase/client";

type Module = "students" | "teachers" | "results" | "payments" | "events" | "gallery" | "complaints" | "subjects" | "settings";
type Row = Record<string, any>;
type StudentForm = { student_number: string; class_id: string; guardian_name: string; guardian_contact: string };
type TeacherForm = { full_name: string; staff_id: string; role: string; assigned_class: string; subject: string; status: string };

const modules: Array<[Module, string]> = [
  ["students", "Students"], ["teachers", "Teachers"], ["results", "Results"], ["payments", "Payments"], ["events", "Events"], ["gallery", "Gallery"], ["complaints", "Complaints"], ["subjects", "Subjects"], ["settings", "Settings"],
];

const emptyStudent: StudentForm = { student_number: "", class_id: "", guardian_name: "", guardian_contact: "" };
const emptyTeacher: TeacherForm = { full_name: "", staff_id: "", role: "teacher", assigned_class: "", subject: "", status: "Active" };

export function AdminDashboardClient({ fullName }: { fullName: string }) {
  const supabase = createClient();
  const [active, setActive] = useState<Module>("students");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentForm>(emptyStudent);
  const [teacher, setTeacher] = useState<TeacherForm>(emptyTeacher);
  const [subject, setSubject] = useState({ name: "", class_id: "" });
  const [announcement, setAnnouncement] = useState({ title: "", body: "" });
  const [classes, setClasses] = useState<Row[]>([]);

  async function loadModule(module: Module) {
    setLoading(true);
    setNotice("");
    const table = module === "students" ? "students" : module === "teachers" ? "profiles" : module === "results" ? "results" : module === "subjects" ? "subjects" : module === "payments" ? "payments" : module === "events" ? "events" : module === "gallery" ? "gallery_images" : module === "complaints" ? "complaints" : "announcements";
    const selection = module === "students" ? "*, profiles(full_name)" : "*";
    let query = supabase.from(table).select(selection).order("created_at", { ascending: false });
    if (module === "teachers") query = query.eq("role", "teacher");
    const { data, error } = await query;
    if (error) setNotice(error.message);
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { void loadModule(active); }, [active]);
  useEffect(() => { void supabase.from("classes").select("*").order("name").then(({ data }) => setClasses(data ?? [])); }, []);

  function closeStudentForm() {
    setShowStudentForm(false);
    setEditingStudentId(null);
    setStudent(emptyStudent);
  }

  function closeTeacherForm() {
    setShowTeacherForm(false);
    setEditingTeacherId(null);
    setTeacher(emptyTeacher);
  }

  function editStudent(row: Row) {
    setEditingStudentId(Number(row.id));
    setStudent({ student_number: String(row.student_number ?? ""), class_id: String(row.class_id ?? ""), guardian_name: String(row.guardian_name ?? ""), guardian_contact: String(row.guardian_contact ?? "") });
    setShowStudentForm(true);
  }

  function editTeacher(row: Row) {
    setEditingTeacherId(String(row.id));
    setTeacher({ full_name: String(row.full_name ?? ""), staff_id: String(row.staff_id ?? ""), role: String(row.role ?? "teacher"), assigned_class: String(row.assigned_class ?? ""), subject: String(row.subject ?? ""), status: String(row.status ?? "Active") });
    setShowTeacherForm(true);
  }

  async function saveStudent(event: FormEvent) {
    event.preventDefault();
    const payload = { student_number: student.student_number.trim(), guardian_name: student.guardian_name.trim() || null, guardian_contact: student.guardian_contact.trim() || null, class_id: student.class_id ? Number(student.class_id) : null };
    if (!payload.student_number) return setNotice("Admission number is required.");
    const result = editingStudentId
      ? await supabase.from("students").update(payload).eq("id", editingStudentId)
      : await supabase.from("students").insert(payload);
    setNotice(result.error ? result.error.message : editingStudentId ? "Student updated." : "Student added. Link the student to a Supabase Auth profile when credentials are provisioned.");
    if (!result.error) { closeStudentForm(); await loadModule("students"); }
  }

  async function removeStudent(row: Row) {
    if (!window.confirm(`Delete student ${row.student_number ?? "record"}? This also removes linked attendance and results.`)) return;
    const { error } = await supabase.from("students").delete().eq("id", row.id);
    setNotice(error ? error.message : "Student deleted.");
    if (!error) await loadModule("students");
  }

  async function saveTeacher(event: FormEvent) {
    event.preventDefault();
    const payload = { full_name: teacher.full_name.trim(), staff_id: teacher.staff_id.trim(), role: teacher.role, assigned_class: teacher.assigned_class.trim() || null, subject: teacher.subject.trim() || null, status: teacher.status };
    if (payload.full_name.length < 2 || !payload.staff_id) return setNotice("Teacher name and Staff ID are required.");
    if (!editingTeacherId) {
      setNotice("Teacher profile creation requires a Supabase Auth user. Create the Auth account first, then edit its profile here to assign Staff ID and class.");
      return;
    }
    const { error } = await supabase.from("profiles").update(payload).eq("id", editingTeacherId).eq("role", "teacher");
    setNotice(error ? error.message : "Teacher updated.");
    if (!error) { closeTeacherForm(); await loadModule("teachers"); }
  }

  async function removeTeacher(row: Row) {
    if (!window.confirm(`Delete teacher ${row.full_name ?? row.staff_id ?? "record"}? Their profile and portal credential mapping will be removed.`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", row.id).eq("role", "teacher");
    setNotice(error ? error.message : "Teacher deleted.");
    if (!error) await loadModule("teachers");
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
          {active === "students" && <ModuleCard title="Student Management" action={<button onClick={() => { closeStudentForm(); setShowStudentForm(true); }} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Add Student</button>}>{showStudentForm && <form onSubmit={saveStudent} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><p className="text-sm font-semibold text-slate-700 md:col-span-2">{editingStudentId ? "Edit Student" : "Add Student"}</p><input required placeholder="Admission number" value={student.student_number} onChange={(e) => setStudent({ ...student, student_number: e.target.value })} className="rounded border p-3" /><select value={student.class_id} onChange={(e) => setStudent({ ...student, class_id: e.target.value })} className="rounded border p-3"><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input placeholder="Guardian name" value={student.guardian_name} onChange={(e) => setStudent({ ...student, guardian_name: e.target.value })} className="rounded border p-3" /><input placeholder="Guardian contact" value={student.guardian_contact} onChange={(e) => setStudent({ ...student, guardian_contact: e.target.value })} className="rounded border p-3" /><div className="flex gap-2 md:col-span-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">{editingStudentId ? "Update Student" : "Save Student"}</button><button type="button" onClick={closeStudentForm} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={rows} columns={["student_number", "class_id", "guardian_name", "status"]} loading={loading} actions={(row) => <><button type="button" onClick={() => editStudent(row)} className="font-semibold text-blue-900 underline">Edit</button><button type="button" onClick={() => void removeStudent(row)} className="font-semibold text-red-700 underline">Delete</button></>} /></ModuleCard>}
          {active === "teachers" && <ModuleCard title="Teacher Management" action={<button onClick={() => { closeTeacherForm(); setShowTeacherForm(true); }} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Add Teacher</button>}>{showTeacherForm && <form onSubmit={saveTeacher} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><p className="text-sm font-semibold text-slate-700 md:col-span-2">{editingTeacherId ? "Edit Teacher" : "Add Teacher"}</p><input required placeholder="Full name" value={teacher.full_name} onChange={(e) => setTeacher({ ...teacher, full_name: e.target.value })} className="rounded border p-3" /><input required placeholder="Staff ID" value={teacher.staff_id} onChange={(e) => setTeacher({ ...teacher, staff_id: e.target.value })} className="rounded border p-3" /><select value={teacher.role} onChange={(e) => setTeacher({ ...teacher, role: e.target.value })} className="rounded border p-3"><option value="teacher">Teacher</option><option value="Class Teacher">Class Teacher</option><option value="Teaching Staff">Teaching Staff</option></select><input placeholder="Assigned class" value={teacher.assigned_class} onChange={(e) => setTeacher({ ...teacher, assigned_class: e.target.value })} className="rounded border p-3" /><input placeholder="Subject" value={teacher.subject} onChange={(e) => setTeacher({ ...teacher, subject: e.target.value })} className="rounded border p-3" /><select value={teacher.status} onChange={(e) => setTeacher({ ...teacher, status: e.target.value })} className="rounded border p-3"><option>Active</option><option>Inactive</option></select><div className="flex gap-2 md:col-span-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">{editingTeacherId ? "Update Teacher" : "Continue Teacher Setup"}</button><button type="button" onClick={closeTeacherForm} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={rows} columns={["full_name", "staff_id", "assigned_class", "subject", "status"]} loading={loading} actions={(row) => <><button type="button" onClick={() => editTeacher(row)} className="font-semibold text-blue-900 underline">Edit</button><button type="button" onClick={() => void removeTeacher(row)} className="font-semibold text-red-700 underline">Delete</button></>} /></ModuleCard>}
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
function DataTable({ rows, columns, loading, actions }: { rows: Row[]; columns: string[]; loading: boolean; actions?: (row: Row) => React.ReactNode }) { if (loading) return <p className="text-sm text-slate-500">Loading records…</p>; if (!rows.length) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No records yet.</p>; return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b">{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 font-semibold capitalize text-slate-600">{column.replaceAll("_", " ")}</th>)}{actions && <th className="px-3 py-3 font-semibold text-slate-600">Actions</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id ?? index} className="border-b last:border-0">{columns.map((column) => <td key={column} className="max-w-xs truncate px-3 py-3 text-slate-700">{column === "full_name" && row.full_name == null ? String(row.profiles?.full_name ?? "—") : typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column] ?? "—")}</td>)}{actions && <td className="whitespace-nowrap px-3 py-3"><div className="flex gap-3">{actions(row)}</div></td>}</tr>)}</tbody></table></div>; }
