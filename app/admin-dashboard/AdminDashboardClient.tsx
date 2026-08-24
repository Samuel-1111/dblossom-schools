'use client';

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { toast } from "sonner";

type Module = "students" | "teachers" | "results" | "payments" | "events" | "gallery" | "complaints" | "subjects" | "settings";
type Row = Record<string, any>;
type StudentForm = { admission_number: string; full_name: string; class_id: string; guardian_name: string; guardian_contact: string };
type TeacherForm = { full_name: string; email: string; phone: string; status: string };
type MediaForm = { table: "events" | "gallery_images"; id: string; title: string; alt_text: string; description: string; event_date: string; image_url: string };

const modules: Array<[Module, string]> = [
  ["students", "Students"], ["teachers", "Teachers"], ["results", "Results"], ["payments", "Payments"], ["events", "Events"], ["gallery", "Gallery"], ["complaints", "Complaints"], ["subjects", "Subjects"], ["settings", "Settings"],
];

const emptyStudent: StudentForm = { admission_number: "", full_name: "", class_id: "", guardian_name: "", guardian_contact: "" };
const emptyTeacher: TeacherForm = { full_name: "", email: "", phone: "", status: "active" };
const emptyMedia = (table: "events" | "gallery_images"): MediaForm => ({ table, id: "", title: "", alt_text: "", description: "", event_date: "", image_url: "" });

export function AdminDashboardClient({ fullName }: { fullName: string }) {
  const supabase = createClient();
  const [active, setActive] = useState<Module>("students");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentForm>(emptyStudent);
  const [teacher, setTeacher] = useState<TeacherForm>(emptyTeacher);
  const [subject, setSubject] = useState({ name: "", class_id: "" });
  const [announcement, setAnnouncement] = useState({ title: "", body: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [resultComment, setResultComment] = useState({ teacher_comment: "", principal_comment: "" });
  const [classes, setClasses] = useState<Row[]>([]);
  const [mediaForm, setMediaForm] = useState<MediaForm | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [studentClassFilter, setStudentClassFilter] = useState("all");
  const [resultClassFilter, setResultClassFilter] = useState("all");
  const [resultTermFilter, setResultTermFilter] = useState("all");

  async function adminRequest(method: "POST" | "PATCH" | "DELETE", table: "students" | "teachers" | "results" | "events" | "gallery_images" | "payments" | "complaints" | "subjects" | "announcements", id?: string, body?: Record<string, unknown>) {
    const url = new URL("/api/admin/records", window.location.origin);
    url.searchParams.set("table", table);
    if (id) url.searchParams.set("id", id);
    const response = await fetch(url, { method, credentials: "same-origin", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json().catch(() => ({ error: "The server returned an invalid response." }));
    return { ok: response.ok, payload };
  }

  async function loadModule(module: Module) {
    setLoading(true);
    setNotice("");
    if (module === "students" || module === "teachers" || module === "results" || module === "events" || module === "gallery" || module === "payments" || module === "complaints" || module === "subjects" || module === "settings") {
      const table = module === "gallery" ? "gallery_images" : module === "settings" ? "announcements" : module;
      const response = await fetch(`/api/admin/records?table=${table}`, { credentials: "same-origin" });
      const payload = await response.json().catch(() => ({ error: "The server returned an invalid response." }));
      if (!response.ok) setNotice(payload.error ?? "Unable to load Admin records.");
      setRows(payload.data ?? []);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    if (error) setNotice(error.message);
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { void loadModule(active); }, [active]);
  useEffect(() => {
    void fetch("/api/admin/records?table=classes", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((payload) => setClasses(payload.data ?? []));
  }, []);

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
    setEditingStudentId(String(row.id));
    setStudent({ admission_number: String(row.admission_number ?? ""), full_name: String(row.full_name ?? ""), class_id: String(row.class_id ?? ""), guardian_name: String(row.guardian_name ?? ""), guardian_contact: String(row.guardian_contact ?? "") });
    setShowStudentForm(true);
  }

  function editTeacher(row: Row) {
    setEditingTeacherId(String(row.id));
    setTeacher({ full_name: String(row.full_name ?? ""), email: String(row.email ?? ""), phone: String(row.phone ?? ""), status: String(row.status ?? "active") });
    setShowTeacherForm(true);
  }

  async function saveStudent(event: FormEvent) {
    event.preventDefault();
    const payload = { admission_number: student.admission_number.trim(), full_name: student.full_name.trim(), guardian_name: student.guardian_name.trim() || null, guardian_contact: student.guardian_contact.trim() || null, class_id: student.class_id ? String(student.class_id) : null };
    if (!payload.admission_number || payload.full_name.length < 2) return setNotice("Full name and admission number are required.");
    const result = editingStudentId
      ? await adminRequest("PATCH", "students", String(editingStudentId), payload)
      : await adminRequest("POST", "students", undefined, payload);
    setNotice(!result.ok ? result.payload.error ?? "Unable to save student." : editingStudentId ? "Student updated." : "Student added. Link the student to a Supabase Auth profile when credentials are provisioned.");
    if (result.ok) { closeStudentForm(); await loadModule("students"); }
  }

  async function removeStudent(row: Row) {
    if (!window.confirm(`Delete student ${row.admission_number ?? "record"}? This also removes linked attendance and results.`)) return;
    const result = await adminRequest("DELETE", "students", String(row.id));
    setNotice(!result.ok ? result.payload.error ?? "Unable to delete student." : "Student deleted.");
    if (result.ok) await loadModule("students");
  }

  async function saveTeacher(event: FormEvent) {
    event.preventDefault();
    const payload = { full_name: teacher.full_name.trim(), email: teacher.email.trim() || null, phone: teacher.phone.trim() || null, status: teacher.status.toLowerCase() };
    if (payload.full_name.length < 2) return setNotice("Teacher full name is required.");
    const result = editingTeacherId
      ? await adminRequest("PATCH", "teachers", editingTeacherId, payload)
      : await adminRequest("POST", "teachers", undefined, payload);
    setNotice(!result.ok ? result.payload.error ?? "Unable to update teacher." : "Teacher updated.");
    if (result.ok) { closeTeacherForm(); await loadModule("teachers"); }
  }

  function editResult(row: Row) {
    setEditingResultId(String(row.id));
    setResultComment({ teacher_comment: String(row.teacher_comment ?? ""), principal_comment: String(row.principal_comment ?? "") });
  }

  async function saveResultComments(event: FormEvent) {
    event.preventDefault();
    if (!editingResultId) return;
    const result = await adminRequest("PATCH", "results", editingResultId, { teacher_comment: resultComment.teacher_comment.trim() || null, principal_comment: resultComment.principal_comment.trim() || null });
    setNotice(!result.ok ? result.payload.error ?? "Unable to update result comments." : "Result comments updated.");
    if (result.ok) { setEditingResultId(null); await loadModule("results"); }
  }

  async function removeTeacher(row: Row) {
    if (!window.confirm(`Delete teacher ${row.full_name ?? row.staff_id ?? "record"}? Their profile and portal credential mapping will be removed.`)) return;
    const result = await adminRequest("DELETE", "teachers", String(row.id));
    setNotice(!result.ok ? result.payload.error ?? "Unable to delete teacher." : "Teacher deleted.");
    if (result.ok) await loadModule("teachers");
  }

  function editMedia(table: "events" | "gallery_images", row: Row) {
    setMediaForm({ table, id: String(row.id), title: String(row.title ?? ""), alt_text: String(row.alt_text ?? ""), description: String(row.description ?? ""), event_date: String(row.event_date ?? ""), image_url: String(row.image_url ?? "") });
  }

  function addMedia(table: "events" | "gallery_images") {
    setMediaForm(emptyMedia(table));
  }

  async function uploadMedia(file: File) {
    if (!mediaForm) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) return setNotice("Only JPEG, PNG, WebP, or GIF images are allowed.");
    if (file.size > 5 * 1024 * 1024) return setNotice("Image must be 5 MB or smaller.");
    const title = mediaForm.title.trim();
    if (!title || (mediaForm.table === "events" && !mediaForm.event_date)) return setNotice(mediaForm.table === "events" ? "Event title and date are required before uploading." : "Gallery title is required before uploading.");
    setMediaUploading(true);
    let currentForm = mediaForm;
    if (!currentForm.id) {
      const body = currentForm.table === "events"
        ? { title, description: currentForm.description.trim() || null, event_date: currentForm.event_date, image_url: currentForm.image_url.trim() || null }
        : { title, alt_text: currentForm.alt_text.trim() || null, image_url: currentForm.image_url.trim() || "pending-upload" };
      const created = await adminRequest("POST", currentForm.table, undefined, body);
      const createdId = created.ok ? String(created.payload.data?.id ?? created.payload.id ?? "") : "";
      if (!created.ok || !createdId) {
        setMediaUploading(false);
        return setNotice(created.payload.error ?? "Unable to create the media record before uploading.");
      }
      currentForm = { ...currentForm, id: createdId };
      setMediaForm(currentForm);
    }
    const form = new FormData();
    form.set("table", currentForm.table);
    form.set("id", currentForm.id);
    form.set("file", file);
    const response = await fetch("/api/admin/media-upload", { method: "POST", credentials: "same-origin", body: form });
    const payload = await response.json().catch(() => ({ error: "The server returned an invalid response." }));
    setMediaUploading(false);
    setNotice(response.ok ? "Image uploaded." : payload.error ?? "Unable to upload image.");
    if (response.ok) { setMediaForm({ ...currentForm, image_url: payload.url ?? currentForm.image_url }); await loadModule(currentForm.table === "events" ? "events" : "gallery"); }
  }

  async function saveMedia(event: FormEvent) {
    event.preventDefault();
    if (!mediaForm) return;
    const title = mediaForm.title.trim();
    const body = mediaForm.table === "events" ? { title, description: mediaForm.description.trim() || null, event_date: mediaForm.event_date || null, image_url: mediaForm.image_url.trim() || null } : { title, alt_text: mediaForm.alt_text.trim() || null, image_url: mediaForm.image_url.trim() };
    if (!title || (mediaForm.table === "events" && !mediaForm.event_date) || (mediaForm.table === "gallery_images" && !mediaForm.image_url.trim())) return setNotice(mediaForm.table === "events" ? "Event title and date are required." : "Gallery title and image URL are required.");
    const result = mediaForm.id
      ? await adminRequest("PATCH", mediaForm.table, mediaForm.id, body)
      : await adminRequest("POST", mediaForm.table, undefined, body);
    setNotice(!result.ok ? result.payload.error ?? "Unable to save media record." : mediaForm.id ? "Media record updated." : "Media record added. Upload an image if needed.");
    if (result.ok) { setMediaForm(null); await loadModule(mediaForm.table === "events" ? "events" : "gallery"); }
  }

  async function removeMedia(table: "events" | "gallery_images", row: Row) {
    if (!window.confirm(`Delete ${table === "events" ? "event" : "gallery image"} ${row.title ?? "record"}?`)) return;
    const result = await adminRequest("DELETE", table, String(row.id));
    setNotice(!result.ok ? result.payload.error ?? "Unable to delete media record." : "Media record deleted.");
    if (result.ok) await loadModule(table === "events" ? "events" : "gallery");
  }

  async function updatePaymentStatus(row: Row, status: "Confirmed" | "Rejected") {
    if (!window.confirm(`${status} payment notification for ${row.student_name ?? "this student"}?`)) return;
    const result = await adminRequest("PATCH", "payments", String(row.id), { status });
    setNotice(!result.ok ? result.payload.error ?? "Unable to update payment." : `Payment ${status.toLowerCase()}.`);
    if (result.ok) await loadModule("payments");
  }

  async function updateComplaintStatus(row: Row, status: "Reviewed" | "Resolved") {
    if (!window.confirm(`Mark complaint from ${row.name ?? "this sender"} as ${status.toLowerCase()}?`)) return;
    const result = await adminRequest("PATCH", "complaints", String(row.id), { status });
    setNotice(!result.ok ? result.payload.error ?? "Unable to update complaint." : `Complaint marked ${status.toLowerCase()}.`);
    if (result.ok) await loadModule("complaints");
  }

  async function removeSubject(row: Row) {
    if (!window.confirm(`Delete subject ${row.name ?? "record"}? Existing result links may prevent deletion.`)) return;
    const result = await adminRequest("DELETE", "subjects", String(row.id));
    setNotice(!result.ok ? result.payload.error ?? "Unable to delete subject." : "Subject deleted.");
    if (result.ok) await loadModule("subjects");
  }

  async function addSubject(event: FormEvent) {
    event.preventDefault();
    const result = await adminRequest("POST", "subjects", undefined, { name: subject.name.trim(), class_id: Number(subject.class_id) });
    setNotice(!result.ok ? result.payload.error ?? "Unable to add subject." : "Subject added.");
    if (result.ok) { setSubject({ name: "", class_id: "" }); await loadModule("subjects"); }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin-password", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(passwordForm) });
    const payload = await response.json().catch(() => ({ error: "The server returned an invalid response." }));
    setNotice(payload.error ?? (response.ok ? "Administrator password updated." : "Unable to update administrator password."));
    if (response.ok) {
      toast.success("Administrator password updated.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else toast.error(payload.error ?? "Unable to update administrator password.");
  }

  async function addAnnouncement(event: FormEvent) {
    event.preventDefault();
    const result = await adminRequest("POST", "announcements", undefined, { title: announcement.title.trim(), body: announcement.body.trim() });
    setNotice(!result.ok ? result.payload.error ?? "Unable to post announcement." : "Announcement posted.");
    if (result.ok) { setAnnouncement({ title: "", body: "" }); await loadModule("settings"); }
  }

  async function signOut() { await supabase.auth.signOut(); window.location.href = "/admin-login"; }
  const filteredRows = useMemo(() => {
    if (active === "students" && studentClassFilter !== "all") return rows.filter((row) => String(row.class_id ?? "") === studentClassFilter);
    if (active === "results") return rows.filter((row) => (resultClassFilter === "all" || String(row.class_id ?? "") === resultClassFilter) && (resultTermFilter === "all" || String(row.term ?? row.term_name ?? row.term_id ?? "").toLowerCase().includes(resultTermFilter)));
    return rows;
  }, [active, resultClassFilter, resultTermFilter, rows, studentClassFilter]);
  const counts = useMemo(() => ({ current: filteredRows.length, classes: classes.length }), [classes, filteredRows]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b bg-white px-4 py-4 shadow-sm md:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">D'Blossom Model Private Schools</p><h1 className="text-2xl font-bold" style={{ color: "var(--navy)" }}>Admin Portal</h1><p className="text-sm text-slate-500">Welcome, {fullName}</p></div><button onClick={signOut} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Sign out</button></div></header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 pb-24 md:px-8 md:pb-6">
        <aside className="hidden w-56 shrink-0 rounded-xl border bg-white p-3 shadow-sm md:block"><nav aria-label="Admin modules" className="grid gap-1">{modules.map(([id, label]) => <button key={id} type="button" onClick={() => setActive(id)} aria-current={active === id ? "page" : undefined} className={`rounded-md px-3 py-2 text-left text-sm font-semibold ${active === id ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}</nav></aside>
        <section className="min-w-0 flex-1"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-slate-500">School management</p><h2 className="text-3xl font-bold" style={{ color: "var(--navy)" }}>{modules.find(([id]) => id === active)?.[1]}</h2></div><p className="text-sm text-slate-500">{counts.current} records · {counts.classes} classes</p></div>
          {notice && <p role="status" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p>}
          {active === "students" && <ModuleCard title="Student Management" action={<div className="flex flex-wrap gap-2"><select aria-label="Filter students by class" value={studentClassFilter} onChange={(e) => setStudentClassFilter(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="all">All classes</option>{classes.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select><button onClick={() => { closeStudentForm(); setShowStudentForm(true); }} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Add Student</button></div>}>{showStudentForm && <form onSubmit={saveStudent} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><p className="text-sm font-semibold text-slate-700 md:col-span-2">{editingStudentId ? "Edit Student" : "Add Student"}</p><input required placeholder="Full name" value={student.full_name} onChange={(e) => setStudent({ ...student, full_name: e.target.value })} className="rounded border p-3" /><input required placeholder="Admission number" value={student.admission_number} onChange={(e) => setStudent({ ...student, admission_number: e.target.value })} className="rounded border p-3" /><select value={student.class_id} onChange={(e) => setStudent({ ...student, class_id: e.target.value })} className="rounded border p-3"><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input placeholder="Guardian name" value={student.guardian_name} onChange={(e) => setStudent({ ...student, guardian_name: e.target.value })} className="rounded border p-3" /><input placeholder="Guardian contact" value={student.guardian_contact} onChange={(e) => setStudent({ ...student, guardian_contact: e.target.value })} className="rounded border p-3" /><div className="flex gap-2 md:col-span-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">{editingStudentId ? "Update Student" : "Save Student"}</button><button type="button" onClick={closeStudentForm} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={filteredRows} columns={["admission_number", "full_name", "class_id", "guardian_name", "status"]} loading={loading} actions={(row) => <><button type="button" onClick={() => editStudent(row)} className="font-semibold text-blue-900 underline">Edit</button><button type="button" onClick={() => void removeStudent(row)} className="font-semibold text-red-700 underline">Delete</button></>} /></ModuleCard>}
          {active === "teachers" && <ModuleCard title="Teacher Management" action={<button onClick={() => { closeTeacherForm(); setShowTeacherForm(true); }} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Add Teacher</button>}>{showTeacherForm && <form onSubmit={saveTeacher} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><p className="text-sm font-semibold text-slate-700 md:col-span-2">{editingTeacherId ? "Edit Teacher" : "Add Teacher"}</p><input required placeholder="Full name" value={teacher.full_name} onChange={(e) => setTeacher({ ...teacher, full_name: e.target.value })} className="rounded border p-3" /><input type="email" placeholder="Email" value={teacher.email} onChange={(e) => setTeacher({ ...teacher, email: e.target.value })} className="rounded border p-3" /><input placeholder="Phone" value={teacher.phone} onChange={(e) => setTeacher({ ...teacher, phone: e.target.value })} className="rounded border p-3" /><select value={teacher.status} onChange={(e) => setTeacher({ ...teacher, status: e.target.value })} className="rounded border p-3"><option value="active">Active</option><option value="inactive">Inactive</option></select><div className="flex gap-2 md:col-span-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">{editingTeacherId ? "Update Teacher" : "Continue Teacher Setup"}</button><button type="button" onClick={closeTeacherForm} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={rows} columns={["full_name", "email", "phone", "status"]} loading={loading} actions={(row) => <><button type="button" onClick={() => editTeacher(row)} className="font-semibold text-blue-900 underline">Edit</button><button type="button" onClick={() => void removeTeacher(row)} className="font-semibold text-red-700 underline">Delete</button></>} /></ModuleCard>}
          {active === "results" && <ModuleCard title="Results Review" action={<div className="flex flex-wrap gap-2"><select aria-label="Filter results by class" value={resultClassFilter} onChange={(e) => setResultClassFilter(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="all">All classes</option>{classes.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select><select aria-label="Filter results by term" value={resultTermFilter} onChange={(e) => setResultTermFilter(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="all">All terms</option><option value="first">First term</option><option value="second">Second term</option><option value="third">Third term</option></select></div>}><p className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">Result uploads are teacher-only. Class Teachers must upload results from the Teacher Portal for students in their assigned class. Administrators can review and update comments here.</p>{editingResultId && <form onSubmit={saveResultComments} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4"><textarea placeholder="Teacher comment" value={resultComment.teacher_comment} onChange={(e) => setResultComment({ ...resultComment, teacher_comment: e.target.value })} className="min-h-20 rounded border p-3" /><textarea placeholder="Principal comment" value={resultComment.principal_comment} onChange={(e) => setResultComment({ ...resultComment, principal_comment: e.target.value })} className="min-h-20 rounded border p-3" /><div className="flex gap-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">Save comments</button><button type="button" onClick={() => setEditingResultId(null)} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={filteredRows} columns={["student_id", "class_id", "subject_id", "term_id", "session", "ca_score", "exam_score", "total_score", "grade", "teacher_comment", "principal_comment"]} loading={loading} actions={(row) => <button type="button" onClick={() => editResult(row)} className="font-semibold text-blue-900 underline">Edit comments</button>} /></ModuleCard>}
          {active === "subjects" && <ModuleCard title="Subject Management"><form onSubmit={addSubject} className="mb-5 flex flex-wrap gap-2"><input required placeholder="Subject name" value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} className="rounded border p-3" /><select required value={subject.class_id} onChange={(e) => setSubject({ ...subject, class_id: e.target.value })} className="rounded border p-3"><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">Add Subject</button></form><DataTable rows={rows} columns={["name", "class_id"]} loading={loading} actions={(row) => <button type="button" onClick={() => void removeSubject(row)} className="font-semibold text-red-700 underline">Delete subject</button>} /></ModuleCard>}
          {active === "settings" && <ModuleCard title="School Settings"><section className="mb-5 rounded-lg bg-slate-50 p-4"><h4 className="mb-3 font-semibold text-slate-800">Change Password</h4><form onSubmit={savePassword} className="grid gap-3"><input required type="password" minLength={1} placeholder="Current Password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="rounded border p-3" /><input required type="password" minLength={4} placeholder="New Password (minimum 4 characters)" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="rounded border p-3" /><input required type="password" minLength={4} placeholder="Confirm New Password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="rounded border p-3" /><button className="w-fit rounded bg-blue-900 px-4 py-2 font-semibold text-white">Change Password</button></form></section><form onSubmit={addAnnouncement} className="grid gap-3 rounded-lg bg-slate-50 p-4"><h4 className="font-semibold text-slate-800">Post Announcement</h4><input required placeholder="Announcement title" value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} className="rounded border p-3" /><textarea required placeholder="Announcement body" value={announcement.body} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} className="min-h-28 rounded border p-3" /><button className="w-fit rounded bg-blue-900 px-4 py-2 font-semibold text-white">Post Announcement</button></form><p className="mt-4 text-sm text-slate-600">Password overrides are stored as signed, server-readable tokens rather than browser localStorage so the replacement password is never exposed to client code.</p></ModuleCard>}
          {(["payments", "events", "gallery", "complaints"] as Module[]).includes(active) && <ModuleCard title={modules.find(([id]) => id === active)?.[1] ?? active} action={active === "events" || active === "gallery" ? <button type="button" onClick={() => addMedia(active === "events" ? "events" : "gallery_images")} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">{active === "events" ? "Add Event" : "Add Gallery Image"}</button> : undefined}>{mediaForm && ((active === "events" && mediaForm.table === "events") || (active === "gallery" && mediaForm.table === "gallery_images")) && <form onSubmit={saveMedia} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><p className="font-semibold text-slate-800 md:col-span-2">{mediaForm.id ? "Edit" : "Add"} {mediaForm.table === "events" ? "Event" : "Gallery image"}</p><input required placeholder="Title" value={mediaForm.title} onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })} className="rounded border p-3" />{mediaForm.table === "events" ? <><input required type="date" value={mediaForm.event_date} onChange={(e) => setMediaForm({ ...mediaForm, event_date: e.target.value })} className="rounded border p-3" /><textarea placeholder="Description" value={mediaForm.description} onChange={(e) => setMediaForm({ ...mediaForm, description: e.target.value })} className="rounded border p-3 md:col-span-2" /></> : <input placeholder="Alt text" value={mediaForm.alt_text} onChange={(e) => setMediaForm({ ...mediaForm, alt_text: e.target.value })} className="rounded border p-3" />}<input required placeholder="Image URL" value={mediaForm.image_url} onChange={(e) => setMediaForm({ ...mediaForm, image_url: e.target.value })} className="rounded border p-3 md:col-span-2" /><label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Upload image (JPEG, PNG, WebP, or GIF; max 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={mediaUploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadMedia(file); }} className="rounded border bg-white p-2 font-normal" /></label><div className="flex gap-2 md:col-span-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">Save media</button><button type="button" onClick={() => setMediaForm(null)} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={rows} columns={active === "payments" ? ["student_name", "amount", "status", "reference"] : active === "events" ? ["title", "event_date", "image_url"] : active === "gallery" ? ["title", "alt_text", "image_url"] : ["name", "subject", "status", "created_at"]} loading={loading} actions={active === "payments" ? (row) => <><button type="button" onClick={() => void updatePaymentStatus(row, "Confirmed")} className="font-semibold text-emerald-700 underline">Confirm</button><button type="button" onClick={() => void updatePaymentStatus(row, "Rejected")} className="font-semibold text-red-700 underline">Reject</button></> : active === "complaints" ? (row) => <><button type="button" onClick={() => void updateComplaintStatus(row, "Reviewed")} className="font-semibold text-blue-900 underline">Mark reviewed</button><button type="button" onClick={() => void updateComplaintStatus(row, "Resolved")} className="font-semibold text-emerald-700 underline">Resolve</button></> : active === "events" ? (row) => <><button type="button" onClick={() => editMedia("events", row)} className="font-semibold text-blue-900 underline">Edit event</button><button type="button" onClick={() => void removeMedia("events", row)} className="font-semibold text-red-700 underline">Delete event</button></> : active === "gallery" ? (row) => <><button type="button" onClick={() => editMedia("gallery_images", row)} className="font-semibold text-blue-900 underline">Edit image</button><button type="button" onClick={() => void removeMedia("gallery_images", row)} className="font-semibold text-red-700 underline">Delete image</button></> : undefined} /></ModuleCard>}
        </section>
      </div>
      <nav aria-label="Admin mobile modules" className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t bg-white shadow-[0_-4px_16px_rgba(15,31,61,0.08)] md:hidden">{modules.map(([id, label]) => <button key={id} type="button" onClick={() => setActive(id)} aria-current={active === id ? "page" : undefined} className={`flex min-w-[64px] flex-1 flex-col items-center justify-center px-2 py-2 text-[10px] font-semibold ${active === id ? "text-blue-900" : "text-slate-500"}`}><span className={`mb-1 h-1.5 w-1.5 rounded-full ${active === id ? "bg-amber-500" : "bg-transparent"}`} aria-hidden="true" />{label}</button>)}</nav>
    </main>
  );
}

function ModuleCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <article className="rounded-xl border bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold" style={{ color: "var(--navy)" }}>{title}</h3>{action}</div>{children}</article>; }
function DataTable({ rows, columns, loading, actions }: { rows: Row[]; columns: string[]; loading: boolean; actions?: (row: Row) => React.ReactNode }) {
  const [query, setQuery] = useState("");
  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => columns.some((column) => String(row[column] ?? "").toLowerCase().includes(normalized)));
  }, [columns, query, rows]);
  if (loading) return <p className="text-sm text-slate-500">Loading records…</p>;
  if (!rows.length) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No records yet.</p>;
  return <div><label className="mb-4 block text-sm font-semibold text-slate-700">Search records<input aria-label="Search records" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this module" className="mt-2 w-full rounded border border-slate-300 p-3 md:max-w-sm" /></label>{!visibleRows.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No matching records.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b">{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 font-semibold capitalize text-slate-600">{column.replaceAll("_", " ")}</th>)}{actions && <th className="px-3 py-3 font-semibold text-slate-600">Actions</th>}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.id ?? index} className="border-b last:border-0">{columns.map((column) => <td key={column} className="max-w-xs truncate px-3 py-3 text-slate-700">{column === "image_url" && row.image_url ? <div className="flex items-center gap-3"><img src={String(row.image_url)} alt={String(row.title ?? "School media")} loading="lazy" className="h-12 w-16 rounded object-cover" /><span className="max-w-[14rem] truncate">{String(row.image_url)}</span></div> : column === "full_name" && row.full_name == null ? String(row.full_name ?? "—") : typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column] ?? "—")}</td>)}{actions && <td className="whitespace-nowrap px-3 py-3"><div className="flex gap-3">{actions(row)}</div></td>}</tr>)}</tbody></table></div>}</div>;
}
