'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { toast } from "sonner";
import { BookMarked, CalendarDays, CreditCard, Eye, FileText, GraduationCap, Image, MessageSquare, Settings as SettingsIcon, Trash2, Users, type LucideIcon } from "lucide-react";
import { firstNameFromFullName, getSubjects, hasValidationErrors, resetSubjects, saveSubjects, validateStudentRegistration, validateTeacherRegistration } from "../../shared/school";

type Module = "students" | "teachers" | "results" | "payments" | "events" | "gallery" | "complaints" | "subjects" | "settings";
type Row = Record<string, any>;
type StudentForm = { admission_number: string; full_name: string; class_id: string; gender: string; date_of_birth: string; parent_name: string; parent_phone: string; parent_email: string; boarding_status: string; guardian_name: string; guardian_contact: string; password: string; status: string };
type TeacherForm = { full_name: string; email: string; phone: string; staff_id: string; subject: string; role: string; assigned_class: string; password: string; status: string };
type MediaForm = { table: "events" | "gallery_images"; id: string; title: string; category: string; status: string; alt_text: string; description: string; event_date: string; image_url: string };

const modules: Array<[Module, string]> = [
  ["students", "Students"], ["teachers", "Teachers"], ["results", "Results"], ["payments", "Payments"], ["events", "Events"], ["gallery", "Gallery"], ["complaints", "Complaints"], ["subjects", "Subjects"], ["settings", "Settings"],
];
const moduleIcons: Record<Module, LucideIcon> = { students: GraduationCap, teachers: Users, results: FileText, payments: CreditCard, events: CalendarDays, gallery: Image, complaints: MessageSquare, subjects: BookMarked, settings: SettingsIcon };

const emptyStudent: StudentForm = { admission_number: "", full_name: "", class_id: "", gender: "", date_of_birth: "", parent_name: "", parent_phone: "", parent_email: "", boarding_status: "Day", guardian_name: "", guardian_contact: "", password: "", status: "active" };
const emptyTeacher: TeacherForm = { full_name: "", email: "", phone: "", staff_id: "", subject: "", role: "Teaching Staff", assigned_class: "", password: "", status: "active" };
const emptyMedia = (table: "events" | "gallery_images"): MediaForm => ({ table, id: "", title: "", category: "Other", status: "Published", alt_text: "", description: "", event_date: "", image_url: "" });

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, headers: string[], records: Array<Array<unknown>>) {
  const csv = [headers, ...records].map((record) => record.map(csvCell).join(",")).join("\\r\\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const studentCsvHeaders = ["Full Name", "Admission Number", "Class", "Gender", "Date of Birth", "Parent Name", "Parent Phone", "Parent Email", "Boarding Status", "Password", "Status"];
const teacherCsvHeaders = ["Full Name", "Staff ID", "Email", "Phone", "Subject", "Role", "Assigned Class", "Password", "Status"];
const resultCsvHeaders = ["Student Name", "Class", "Term", "Session", "Subject", "CA Score", "Exam Score", "Total", "Grade", "Result Total", "Average", "Overall %", "Position", "Teacher Comment", "Principal Comment"];

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
  const [viewingResult, setViewingResult] = useState<Row | null>(null);
  const [resultComment, setResultComment] = useState({ teacher_comment: "", principal_comment: "" });
  const [classes, setClasses] = useState<Row[]>([]);
  const [mediaForm, setMediaForm] = useState<MediaForm | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [studentClassFilter, setStudentClassFilter] = useState("all");
  const [resultClassFilter, setResultClassFilter] = useState("all");
  const [resultTermFilter, setResultTermFilter] = useState("all");
  const [localSubjectNames, setLocalSubjectNames] = useState<string[]>([]);
  const studentFormRef = useRef<HTMLFormElement>(null);
  const teacherFormRef = useRef<HTMLFormElement>(null);

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
    setLocalSubjectNames(getSubjects());
  }, []);

  useEffect(() => {
    if (!showStudentForm) return;
    const form = studentFormRef.current;
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
    form?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input:not([type=hidden]), select, textarea")?.focus({ preventScroll: true });
  }, [editingStudentId, showStudentForm]);

  useEffect(() => {
    if (!showTeacherForm) return;
    const form = teacherFormRef.current;
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
    form?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input:not([type=hidden]), select, textarea")?.focus({ preventScroll: true });
  }, [editingTeacherId, showTeacherForm]);

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
    setStudent({ admission_number: String(row.admission_number ?? ""), full_name: String(row.full_name ?? ""), class_id: String(row.class_id ?? ""), gender: String(row.gender ?? ""), date_of_birth: String(row.date_of_birth ?? ""), parent_name: String(row.parent_name ?? ""), parent_phone: String(row.parent_phone ?? ""), parent_email: String(row.parent_email ?? ""), boarding_status: String(row.boarding_status ?? "Day"), guardian_name: String(row.guardian_name ?? ""), guardian_contact: String(row.guardian_contact ?? ""), password: "", status: String(row.status ?? "active") });
    setShowStudentForm(true);
  }

  function editTeacher(row: Row) {
    setEditingTeacherId(String(row.id));
    setTeacher({ full_name: String(row.full_name ?? ""), email: String(row.email ?? ""), phone: String(row.phone ?? ""), staff_id: String(row.staff_id ?? ""), subject: String(row.subject ?? ""), role: String(row.role ?? "Teaching Staff"), assigned_class: String(row.assigned_class ?? ""), password: "", status: String(row.status ?? "active") });
    setShowTeacherForm(true);
  }

  async function saveStudent(event: FormEvent) {
    event.preventDefault();
    const fullName = student.full_name.trim();
    const defaultPassword = firstNameFromFullName(fullName);
    const passwordOverride = student.password.trim();
    const passwordForNewStudent = passwordOverride || defaultPassword;
    const payload = { admission_number: student.admission_number.trim(), full_name: fullName, gender: student.gender || null, date_of_birth: student.date_of_birth || null, parent_name: student.parent_name.trim() || null, parent_phone: student.parent_phone.trim() || null, parent_email: student.parent_email.trim() || null, boarding_status: student.boarding_status, guardian_name: student.guardian_name.trim() || null, guardian_contact: student.guardian_contact.trim() || null, class_id: student.class_id ? String(student.class_id) : null, status: student.status.toLowerCase(), ...((passwordOverride || !editingStudentId) ? { password: passwordForNewStudent } : {}) };
    const validation = validateStudentRegistration({ fullName: payload.full_name, admissionNumber: payload.admission_number, className: student.class_id, password: passwordForNewStudent }, Boolean(editingStudentId));
    if (hasValidationErrors(validation)) return setNotice(Object.values(validation)[0]);
    const result = editingStudentId
      ? await adminRequest("PATCH", "students", String(editingStudentId), payload)
      : await adminRequest("POST", "students", undefined, payload);
    setNotice(!result.ok ? result.payload.error ?? "Unable to save student." : editingStudentId ? "Student updated." : "Student added with portal credentials.");
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
    const fullName = teacher.full_name.trim();
    const defaultPassword = firstNameFromFullName(fullName);
    const passwordOverride = teacher.password.trim();
    const passwordForNewTeacher = passwordOverride || defaultPassword;
    const payload = { full_name: fullName, email: teacher.email.trim() || null, phone: teacher.phone.trim() || null, staff_id: teacher.staff_id.trim() || null, subject: teacher.subject.trim() || null, role: teacher.role.trim() || "Teaching Staff", assigned_class: teacher.assigned_class.trim() || null, ...((passwordOverride || !editingTeacherId) ? { password: passwordForNewTeacher } : {}), status: teacher.status.toLowerCase() };
    const validation = validateTeacherRegistration({ fullName: payload.full_name, staffId: payload.staff_id ?? "", password: passwordForNewTeacher }, Boolean(editingTeacherId));
    if (hasValidationErrors(validation)) return setNotice(Object.values(validation)[0]);
    const result = editingTeacherId
      ? await adminRequest("PATCH", "teachers", editingTeacherId, payload)
      : await adminRequest("POST", "teachers", undefined, payload);
    setNotice(!result.ok ? result.payload.error ?? "Unable to update teacher." : editingTeacherId ? "Teacher updated." : "Teacher added with portal credentials.");
    if (result.ok) { closeTeacherForm(); await loadModule("teachers"); }
  }

  function editResult(row: Row) {
    setEditingResultId(String(row.id));
    setResultComment({ teacher_comment: String(row.teacher_comment ?? ""), principal_comment: String(row.principal_comment ?? "") });
  }

  function openResult(row: Row) {
    setViewingResult(row);
  }

  function resultSubjects(row: Row): Row[] {
    if (Array.isArray(row.subjects)) return row.subjects;
    if (typeof row.subjects === "string") {
      try {
        const parsed = JSON.parse(row.subjects);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async function saveResultComments(event: FormEvent) {
    event.preventDefault();
    if (!editingResultId) return;
    const result = await adminRequest("PATCH", "results", editingResultId, { teacher_comment: resultComment.teacher_comment.trim() || null, principal_comment: resultComment.principal_comment.trim() || null });
    setNotice(!result.ok ? result.payload.error ?? "Unable to update result comments." : "Result comments updated.");
    if (result.ok) { setEditingResultId(null); await loadModule("results"); }
  }

  async function removeResult(row: Row) {
    if (!window.confirm(`Delete result ${row.student_id ?? "record"}? Result uploads remain teacher-only.`)) return;
    const result = await adminRequest("DELETE", "results", String(row.id));
    setNotice(!result.ok ? result.payload.error ?? "Unable to delete result." : "Result deleted.");
    if (result.ok) await loadModule("results");
  }

  async function removeTeacher(row: Row) {
    if (!window.confirm(`Delete teacher ${row.full_name ?? row.staff_id ?? "record"}? Their profile and portal credential mapping will be removed.`)) return;
    const result = await adminRequest("DELETE", "teachers", String(row.id));
    setNotice(!result.ok ? result.payload.error ?? "Unable to delete teacher." : "Teacher deleted.");
    if (result.ok) await loadModule("teachers");
  }

  function editMedia(table: "events" | "gallery_images", row: Row) {
    setMediaForm({ table, id: String(row.id), title: String(row.title ?? ""), category: String(row.category ?? "Other"), status: String(row.status ?? "Published"), alt_text: String(row.alt_text ?? ""), description: String(row.description ?? ""), event_date: String(row.event_date ?? ""), image_url: String(row.image_url ?? "") });
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
        ? { title, description: currentForm.description.trim() || null, event_date: currentForm.event_date, category: currentForm.category, status: currentForm.status, image_url: currentForm.image_url.trim() || null }
        : { title, category: currentForm.category, alt_text: currentForm.alt_text.trim() || null, image_url: currentForm.image_url.trim() || "pending-upload" };
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
    const body = mediaForm.table === "events" ? { title, description: mediaForm.description.trim() || null, event_date: mediaForm.event_date || null, category: mediaForm.category, status: mediaForm.status, image_url: mediaForm.image_url.trim() || null } : { title, category: mediaForm.category, alt_text: mediaForm.alt_text.trim() || null, image_url: mediaForm.image_url.trim() };
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
    if (result.ok) {
      const next = saveSubjects(getSubjects().filter((name) => name.toLowerCase() !== String(row.name ?? "").toLowerCase()));
      setLocalSubjectNames(next);
      await loadModule("subjects");
    }
  }

  async function addSubject(event: FormEvent) {
    event.preventDefault();
    const name = subject.name.trim();
    if (!name) return setNotice("Subject name is required.");
    if (getSubjects().some((item) => item.toLowerCase() === name.toLowerCase())) return setNotice("That subject already exists.");
    const result = await adminRequest("POST", "subjects", undefined, { name, class_id: Number(subject.class_id) });
    setNotice(!result.ok ? result.payload.error ?? "Unable to add subject." : "Subject added.");
    if (result.ok) { setLocalSubjectNames(saveSubjects([...getSubjects(), name])); setSubject({ name: "", class_id: "" }); await loadModule("subjects"); }
  }

  function resetLocalSubjectList() {
    setLocalSubjectNames(resetSubjects());
    setNotice("Default subjects restored for the teacher portal subject list.");
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

  function exportStudents() {
    downloadCsv("students.csv", studentCsvHeaders, rows.map((row) => [row.full_name, row.admission_number, classes.find((item) => String(item.id) === String(row.class_id))?.name ?? row.class_name ?? row.class_id, row.gender, row.date_of_birth, row.parent_name ?? row.guardian_name, row.parent_phone ?? row.guardian_contact, row.parent_email, row.boarding_status, row.password, row.status]));
    setNotice("Students CSV downloaded.");
  }

  function exportTeachers() {
    downloadCsv("teachers.csv", teacherCsvHeaders, rows.map((row) => [row.full_name, row.staff_id, row.email, row.phone, row.subject, row.role, row.assigned_class, row.password, row.status]));
    setNotice("Teachers CSV downloaded.");
  }

  function exportResults() {
    const records = rows.flatMap((row) => {
      const subjects = resultSubjects(row);
      const subjectRows = subjects.length ? subjects : [{}];
      return subjectRows.map((item) => [row.student_name, row.class_name ?? row.class_id, row.term ?? row.term_id, row.session, item.name ?? item.subject ?? row.subject_name ?? row.subject_id, item.ca_score ?? item.caScore ?? row.ca_score, item.exam_score ?? item.examScore ?? row.exam_score, item.total ?? row.total_score, item.grade ?? row.grade, row.total_score, row.average, row.overall_percentage, row.position, row.teacher_comment, row.principal_comment]);
    });
    downloadCsv("results.csv", resultCsvHeaders, records);
    setNotice("Results CSV downloaded.");
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
        <aside className="hidden w-56 shrink-0 rounded-xl border bg-white p-3 shadow-sm md:block"><nav aria-label="Admin modules" className="grid gap-1">{modules.map(([id, label]) => { const Icon = moduleIcons[id]; return <button key={id} type="button" onClick={() => setActive(id)} aria-current={active === id ? "page" : undefined} className={`rounded-md px-3 py-2.5 text-left text-sm font-medium ${active === id ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}><Icon className="mr-2 inline-block h-4 w-4" aria-hidden="true" />{label}</button>; })}</nav></aside>
        <section className="min-w-0 flex-1"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-slate-500">School management</p><h2 className="text-3xl font-bold" style={{ color: "var(--navy)" }}>{modules.find(([id]) => id === active)?.[1]}</h2></div><p className="text-sm text-slate-500">{counts.current} records · {counts.classes} classes</p></div>
          {notice && <p role="status" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p>}
          {active === "students" && <ModuleCard title="Student Management" action={<div className="flex flex-wrap gap-2"><select aria-label="Filter students by class" value={studentClassFilter} onChange={(e) => setStudentClassFilter(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="all">All classes</option>{classes.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select><button type="button" onClick={exportStudents} className="rounded-md border border-blue-900 px-4 py-2 text-sm font-semibold text-blue-900">Download CSV</button><button type="button" onClick={() => { closeStudentForm(); setShowStudentForm(true); }} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Add Student</button></div>}>{showStudentForm && <form ref={studentFormRef} onSubmit={saveStudent} className="mb-5 scroll-mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 ring-2 ring-amber-200 md:grid-cols-2"><p className="text-sm font-semibold text-slate-700 md:col-span-2">{editingStudentId ? "Edit Student" : "Add Student"}</p><input required placeholder="Full name" value={student.full_name} onChange={(e) => setStudent({ ...student, full_name: e.target.value })} className="rounded border p-3" /><input required placeholder="Admission number" value={student.admission_number} onChange={(e) => setStudent({ ...student, admission_number: e.target.value })} className="rounded border p-3" /><select required value={student.class_id} onChange={(e) => setStudent({ ...student, class_id: e.target.value })} className="rounded border p-3"><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select value={student.gender} onChange={(e) => setStudent({ ...student, gender: e.target.value })} className="rounded border p-3"><option value="">Gender</option><option>Male</option><option>Female</option></select><input type="date" aria-label="Date of birth" value={student.date_of_birth} onChange={(e) => setStudent({ ...student, date_of_birth: e.target.value })} className="rounded border p-3" /><input placeholder="Parent name" value={student.parent_name} onChange={(e) => setStudent({ ...student, parent_name: e.target.value })} className="rounded border p-3" /><input placeholder="Parent phone" value={student.parent_phone} onChange={(e) => setStudent({ ...student, parent_phone: e.target.value })} className="rounded border p-3" /><input type="email" placeholder="Parent email" value={student.parent_email} onChange={(e) => setStudent({ ...student, parent_email: e.target.value })} className="rounded border p-3" /><select value={student.boarding_status} onChange={(e) => setStudent({ ...student, boarding_status: e.target.value })} className="rounded border p-3"><option>Day</option><option>Boarding</option></select><select value={student.status} onChange={(e) => setStudent({ ...student, status: e.target.value })} className="rounded border p-3"><option value="active">Active</option><option value="inactive">Inactive</option></select><input placeholder="Guardian name" value={student.guardian_name} onChange={(e) => setStudent({ ...student, guardian_name: e.target.value })} className="rounded border p-3" /><input placeholder="Guardian contact" value={student.guardian_contact} onChange={(e) => setStudent({ ...student, guardian_contact: e.target.value })} className="rounded border p-3" /><label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2"><input type="text" aria-label="Student password override" placeholder={editingStudentId ? "Optional new password (default: first name)" : "Optional override (default: first name)"} value={student.password} onChange={(e) => setStudent({ ...student, password: e.target.value })} className="rounded border p-3 font-normal" /><span className="font-normal text-slate-500">Leave blank to use the student&apos;s first name as the portal password. Enter a value only to override it.</span></label><div className="flex gap-2 md:col-span-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">{editingStudentId ? "Update Student" : "Save Student"}</button><button type="button" onClick={closeStudentForm} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={filteredRows.map((row) => ({ ...row, class: classes.find((item) => String(item.id) === String(row.class_id))?.name ?? row.class_name ?? "Unassigned" }))} columns={["admission_number", "full_name", "class", "guardian_name", "password", "status"]} loading={loading} sensitiveColumns={["password"]} actions={(row) => <><button type="button" onClick={() => editStudent(row)} className="font-semibold text-blue-900 underline">Edit</button><button type="button" onClick={() => void removeStudent(row)} className="font-semibold text-red-700 underline">Delete</button></>} /></ModuleCard>}
          {active === "teachers" && <ModuleCard title="Teacher Management" action={<div className="flex flex-wrap gap-2"><button type="button" onClick={exportTeachers} className="rounded-md border border-blue-900 px-4 py-2 text-sm font-semibold text-blue-900">Download CSV</button><button type="button" onClick={() => { closeTeacherForm(); setShowTeacherForm(true); }} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Add Teacher</button></div>}>{showTeacherForm && 
<form ref={teacherFormRef} onSubmit={saveTeacher} className="mb-5 scroll-mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 ring-2 ring-amber-200 md:grid-cols-2"><p className="text-sm font-semibold text-slate-700 md:col-span-2">{editingTeacherId ? "Edit Teacher" : "Add Teacher"}</p><input required placeholder="Full name" value={teacher.full_name} onChange={(e) => setTeacher({ ...teacher, full_name: e.target.value })} className="rounded border p-3" /><input required placeholder="Staff ID" value={teacher.staff_id} onChange={(e) => setTeacher({ ...teacher, staff_id: e.target.value })} className="rounded border p-3" /><input type="email" placeholder="Email" value={teacher.email} onChange={(e) => setTeacher({ ...teacher, email: e.target.value })} className="rounded border p-3" /><input placeholder="Phone" value={teacher.phone} onChange={(e) => setTeacher({ ...teacher, phone: e.target.value })} className="rounded border p-3" /><input placeholder="Subject" value={teacher.subject} onChange={(e) => setTeacher({ ...teacher, subject: e.target.value })} className="rounded border p-3" /><select value={teacher.role} onChange={(e) => setTeacher({ ...teacher, role: e.target.value })} className="rounded border p-3"><option>Teaching Staff</option><option>Class Teacher</option></select><select value={teacher.assigned_class} onChange={(e) => setTeacher({ ...teacher, assigned_class: e.target.value })} className="rounded border p-3"><option value="">No assigned class</option>{classes.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select><label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2"><input type="text" aria-label="Teacher password override" placeholder={editingTeacherId ? "Optional new password (default: first name)" : "Optional override (default: first name)"} value={teacher.password} onChange={(e) => setTeacher({ ...teacher, password: e.target.value })} className="rounded border p-3 font-normal" /><span className="font-normal text-slate-500">Leave blank to use the teacher&apos;s first name as the portal password. Enter a value only to override it.</span></label><select value={teacher.status} onChange={(e) => setTeacher({ ...teacher, status: e.target.value })} className="rounded border p-3"><option value="active">Active</option><option value="inactive">Inactive</option></select><div className="flex gap-2 md:col-span-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">{editingTeacherId ? "Update Teacher" : "Continue Teacher Setup"}</button><button type="button" onClick={closeTeacherForm} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={rows} columns={["full_name", "staff_id", "role", "assigned_class", "email", "phone", "status"]} loading={loading} actions={(row) => <><button type="button" onClick={() => editTeacher(row)} className="font-semibold text-blue-900 underline">Edit</button><button type="button" onClick={() => void removeTeacher(row)} className="font-semibold text-red-700 underline">Delete</button></>} /></ModuleCard>}
          {active === "results" && <ModuleCard title="Results Review" action={<div className="flex flex-wrap gap-2"><select aria-label="Filter results by class" value={resultClassFilter} onChange={(e) => setResultClassFilter(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="all">All classes</option>{classes.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select><select aria-label="Filter results by term" value={resultTermFilter} onChange={(e) => setResultTermFilter(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="all">All terms</option><option value="first">First term</option><option value="second">Second term</option><option value="third">Third term</option></select><button type="button" onClick={exportResults} className="rounded-md border border-blue-900 px-4 py-2 text-sm font-semibold text-blue-900">Download CSV</button></div>}><p className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">Result uploads are teacher-only. Class Teachers must upload results from the Teacher Portal for students in their assigned class. Administrators can review and update comments here.</p>{editingResultId && <form onSubmit={saveResultComments} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4"><textarea placeholder="Teacher comment" value={resultComment.teacher_comment} onChange={(e) => setResultComment({ ...resultComment, teacher_comment: e.target.value })} className="min-h-20 rounded border p-3" /><textarea placeholder="Principal comment" value={resultComment.principal_comment} onChange={(e) => setResultComment({ ...resultComment, principal_comment: e.target.value })} className="min-h-20 rounded border p-3" /><div className="flex gap-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">Save comments</button><button type="button" onClick={() => setEditingResultId(null)} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={filteredRows.map((row) => ({ ...row, student: row.student_name ?? row.student_id, class: row.class_name ?? row.class_id ?? "Unassigned", term: row.term ?? row.term_name ?? row.term_id, session: row.session ?? "—", average: row.average ?? row.overall_percentage ?? row.total_score ?? "—" }))} columns={["student", "class", "term", "session", "average"]} loading={loading} actions={(row) => <><button type="button" onClick={() => openResult(row)} aria-label={`View result for ${row.student ?? "student"}`} title="View result" className="text-slate-700 transition hover:text-blue-900"><Eye className="h-5 w-5" aria-hidden="true" /></button><button type="button" onClick={() => void removeResult(row)} aria-label={`Delete result for ${row.student ?? "student"}`} title="Delete result" className="text-red-500 transition hover:text-red-700"><Trash2 className="h-5 w-5" aria-hidden="true" /></button></>} /></ModuleCard>}
          {active === "subjects" && <ModuleCard title="Subject Management"><form onSubmit={addSubject} className="mb-5 flex flex-wrap gap-2"><input required placeholder="Subject name" value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} className="rounded border p-3" /><select required value={subject.class_id} onChange={(e) => setSubject({ ...subject, class_id: e.target.value })} className="rounded border p-3"><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">Add Subject</button><button type="button" onClick={resetLocalSubjectList} className="rounded border border-blue-900 px-4 py-2 font-semibold text-blue-900">Reset to Default</button></form><p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Teacher default subjects: {localSubjectNames.join(", ") || "None saved"}</p><DataTable rows={rows} columns={["name", "class_id"]} loading={loading} actions={(row) => <button type="button" onClick={() => void removeSubject(row)} className="font-semibold text-red-700 underline">Delete subject</button>} /></ModuleCard>}
          {active === "settings" && <ModuleCard title="School Settings"><section className="mb-5 rounded-lg bg-slate-50 p-4"><h4 className="mb-3 font-semibold text-slate-800">Change Password</h4><form onSubmit={savePassword} className="grid gap-3"><input required type="text" minLength={1} placeholder="Current Password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="rounded border p-3" /><input required type="text" minLength={4} placeholder="New Password (minimum 4 characters)" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="rounded border p-3" /><input required type="text" minLength={4} placeholder="Confirm New Password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="rounded border p-3" /><button className="w-fit rounded bg-blue-900 px-4 py-2 font-semibold text-white">Change Password</button></form></section><form onSubmit={addAnnouncement} className="grid gap-3 rounded-lg bg-slate-50 p-4"><h4 className="font-semibold text-slate-800">Post Announcement</h4><input required placeholder="Announcement title" value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} className="rounded border p-3" /><textarea required placeholder="Announcement body" value={announcement.body} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} className="min-h-28 rounded border p-3" /><button className="w-fit rounded bg-blue-900 px-4 py-2 font-semibold text-white">Post Announcement</button></form><p className="mt-4 text-sm text-slate-600">Password overrides are stored as signed, server-readable tokens rather than browser localStorage so the replacement password is never exposed to client code.</p></ModuleCard>}
          {(["payments", "events", "gallery", "complaints"] as Module[]).includes(active) && <ModuleCard title={modules.find(([id]) => id === active)?.[1] ?? active} action={active === "events" || active === "gallery" ? <button type="button" onClick={() => addMedia(active === "events" ? "events" : "gallery_images")} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">{active === "events" ? "Add Event" : "Add Gallery Image"}</button> : undefined}>{mediaForm && ((active === "events" && mediaForm.table === "events") || (active === "gallery" && mediaForm.table === "gallery_images")) && <form onSubmit={saveMedia} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><p className="font-semibold text-slate-800 md:col-span-2">{mediaForm.id ? "Edit" : "Add"} {mediaForm.table === "events" ? "Event" : "Gallery image"}</p><input required placeholder="Title" value={mediaForm.title} onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })} className="rounded border p-3" />{mediaForm.table === "events" ? <><input required type="date" value={mediaForm.event_date} onChange={(e) => setMediaForm({ ...mediaForm, event_date: e.target.value })} className="rounded border p-3" /><select value={mediaForm.category} onChange={(e) => setMediaForm({ ...mediaForm, category: e.target.value })} className="rounded border p-3"><option>Announcement</option><option>Activity</option><option>Exam</option><option>Holiday</option><option>Other</option></select><select value={mediaForm.status} onChange={(e) => setMediaForm({ ...mediaForm, status: e.target.value })} className="rounded border p-3"><option>Published</option><option>Draft</option></select><textarea placeholder="Description" value={mediaForm.description} onChange={(e) => setMediaForm({ ...mediaForm, description: e.target.value })} className="rounded border p-3 md:col-span-2" /></> : <><select value={mediaForm.category} onChange={(e) => setMediaForm({ ...mediaForm, category: e.target.value })} className="rounded border p-3"><option>Campus</option><option>Events</option><option>Sports</option><option>Academics</option><option>Activities</option><option>Other</option></select><input placeholder="Alt text" value={mediaForm.alt_text} onChange={(e) => setMediaForm({ ...mediaForm, alt_text: e.target.value })} className="rounded border p-3" /></>}<input required placeholder="Image URL" value={mediaForm.image_url} onChange={(e) => setMediaForm({ ...mediaForm, image_url: e.target.value })} className="rounded border p-3 md:col-span-2" /><label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Upload image (JPEG, PNG, WebP, or GIF; max 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={mediaUploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadMedia(file); }} className="rounded border bg-white p-2 font-normal" /></label><div className="flex gap-2 md:col-span-2"><button className="rounded bg-blue-900 px-4 py-2 font-semibold text-white">Save media</button><button type="button" onClick={() => setMediaForm(null)} className="rounded border px-4 py-2">Cancel</button></div></form>}<DataTable rows={rows} columns={active === "payments" ? ["student_name", "amount", "status", "reference"] : active === "events" ? ["title", "event_date", "category", "status", "image_url"] : active === "gallery" ? ["title", "category", "alt_text", "image_url"] : ["name", "subject", "status", "created_at"]} loading={loading} actions={active === "payments" ? (row) => <><button type="button" onClick={() => void updatePaymentStatus(row, "Confirmed")} className="font-semibold text-emerald-700 underline">Confirm</button><button type="button" onClick={() => void updatePaymentStatus(row, "Rejected")} className="font-semibold text-red-700 underline">Reject</button></> : active === "complaints" ? (row) => <><button type="button" onClick={() => void updateComplaintStatus(row, "Reviewed")} className="font-semibold text-blue-900 underline">Mark reviewed</button><button type="button" onClick={() => void updateComplaintStatus(row, "Resolved")} className="font-semibold text-emerald-700 underline">Resolve</button></> : active === "events" ? (row) => <><button type="button" onClick={() => editMedia("events", row)} className="font-semibold text-blue-900 underline">Edit event</button><button type="button" onClick={() => void removeMedia("events", row)} className="font-semibold text-red-700 underline">Delete event</button></> : active === "gallery" ? (row) => <><button type="button" onClick={() => editMedia("gallery_images", row)} className="font-semibold text-blue-900 underline">Edit image</button><button type="button" onClick={() => void removeMedia("gallery_images", row)} className="font-semibold text-red-700 underline">Delete image</button></> : undefined} /></ModuleCard>}
        </section>
      </div>
      {viewingResult && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="result-detail-title"><article className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Student academic report</p><h3 id="result-detail-title" className="text-2xl font-bold text-blue-950">{viewingResult.student_name ?? "Student result"}</h3><p className="mt-1 text-sm text-slate-500">{viewingResult.class_name ?? "Class not recorded"} · {viewingResult.term ?? "Term not recorded"} · {viewingResult.session ?? "Session not recorded"}</p></div><button type="button" onClick={() => setViewingResult(null)} aria-label="Close result detail" className="rounded border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="bg-blue-950 text-white"><th className="px-3 py-3">Subject</th><th className="px-3 py-3">CA</th><th className="px-3 py-3">Exam</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Grade</th></tr></thead><tbody>{resultSubjects(viewingResult).map((item, index) => <tr key={`${item.name ?? "subject"}-${index}`} className="border-b"><td className="px-3 py-3 font-medium">{item.name ?? item.subject ?? "—"}</td><td className="px-3 py-3">{item.ca_score ?? item.caScore ?? "—"}</td><td className="px-3 py-3">{item.exam_score ?? item.examScore ?? "—"}</td><td className="px-3 py-3 font-semibold">{item.total ?? ((Number(item.ca_score ?? item.caScore) || 0) + (Number(item.exam_score ?? item.examScore) || 0))}</td><td className="px-3 py-3 font-bold">{item.grade ?? "—"}</td></tr>)}{!resultSubjects(viewingResult).length && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No subject breakdown was recorded for this result.</td></tr>}</tbody></table></div><div className="mt-6 grid grid-cols-3 gap-3"><div className="rounded-lg bg-blue-50 p-4"><p className="text-xs text-slate-500">Total Score</p><p className="mt-1 text-xl font-bold text-blue-950">{viewingResult.total_score ?? "—"}</p></div><div className="rounded-lg bg-amber-50 p-4"><p className="text-xs text-slate-500">Average</p><p className="mt-1 text-xl font-bold text-amber-600">{viewingResult.average ?? "—"}</p></div><div className="rounded-lg bg-red-50 p-4"><p className="text-xs text-slate-500">Position</p><p className="mt-1 text-xl font-bold text-red-600">{viewingResult.position ?? "—"}</p></div></div>{(viewingResult.teacher_comment || viewingResult.principal_comment) && <div className="mt-6 space-y-3 border-t pt-4">{viewingResult.teacher_comment && <p className="text-sm italic text-slate-700"><span className="not-italic font-semibold text-slate-500">Teacher&apos;s Comment: </span>&quot;{viewingResult.teacher_comment}&quot;</p>}{viewingResult.principal_comment && <p className="text-sm italic text-slate-700"><span className="not-italic font-semibold text-slate-500">Principal&apos;s Comment: </span>&quot;{viewingResult.principal_comment}&quot;</p>}</div>}</article></div>}
      <nav aria-label="Admin mobile modules" className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t bg-white shadow-[0_-4px_16px_rgba(15,31,61,0.08)] md:hidden">{modules.map(([id, label]) => { const Icon = moduleIcons[id]; return <button key={id} type="button" onClick={() => setActive(id)} aria-current={active === id ? "page" : undefined} className={`flex min-w-[64px] flex-1 flex-col items-center justify-center px-2 py-2 text-[10px] font-semibold ${active === id ? "text-blue-900" : "text-slate-500"}`}><Icon className="mb-1 h-4 w-4" aria-hidden="true" /><span className={`mb-1 h-1.5 w-1.5 rounded-full ${active === id ? "bg-amber-500" : "bg-transparent"}`} aria-hidden="true" />{label}</button>; })}</nav>
    </main>
  );
}

function ModuleCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <article className="rounded-xl border bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold" style={{ color: "var(--navy)" }}>{title}</h3>{action}</div>{children}</article>; }
function DataTable({ rows, columns, loading, actions, sensitiveColumns = [] }: { rows: Row[]; columns: string[]; loading: boolean; actions?: (row: Row) => React.ReactNode; sensitiveColumns?: string[] }) {
  const [query, setQuery] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => columns.some((column) => String(row[column] ?? "").toLowerCase().includes(normalized)));
  }, [columns, query, rows]);
  if (loading) return <p className="text-sm text-slate-500">Loading records…</p>;
  if (!rows.length) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No records yet.</p>;
  return <div><label className="mb-4 block text-sm font-semibold text-slate-700">Search records<input aria-label="Search records" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this module" className="mt-2 w-full rounded border border-slate-300 p-3 md:max-w-sm" /></label>{!visibleRows.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No matching records.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b">{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 font-semibold capitalize text-slate-600">{column.replaceAll("_", " ")}</th>)}{actions && <th className="px-3 py-3 font-semibold text-slate-600">Actions</th>}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.id ?? index} className="border-b last:border-0">{columns.map((column) => <td key={column} className="max-w-xs truncate px-3 py-3 text-slate-700">{column === "image_url" && row.image_url ? <div className="flex items-center gap-3"><img src={String(row.image_url)} alt={String(row.title ?? "School media")} loading="lazy" className="h-12 w-16 rounded object-cover" /><span className="max-w-[14rem] truncate">{String(row.image_url)}</span></div> : sensitiveColumns.includes(column) ? <div className="flex items-center gap-2"><span className="font-mono text-xs">{row[column] ? (revealed[String(row.id)] ? String(row[column]) : "••••••••") : "Not set"}</span>{row[column] && <button type="button" onClick={() => setRevealed((current) => ({ ...current, [String(row.id)]: !current[String(row.id)] }))} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-blue-900">{revealed[String(row.id)] ? "Hide" : "Show"}</button>}</div> : column === "full_name" && row.full_name == null ? String(row.full_name ?? "—") : typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column] ?? "—")}</td>)}{actions && <td className="whitespace-nowrap px-3 py-3"><div className="flex gap-3">{actions(row)}</div></td>}</tr>)}</tbody></table></div>}</div>;
}
