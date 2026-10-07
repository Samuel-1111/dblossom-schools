'use client';

import { useEffect, useState } from "react";

type Student = { id: string; full_name?: string | null; admission_number?: string | null; class_name?: string | null };
type Teacher = { id: string; full_name?: string | null; staff_id?: string | null; assigned_class?: string | null };

export function AdminLinking() {
  const [type, setType] = useState<"parent" | "teacher">("parent");
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [parent, setParent] = useState({ name: "", email: "", phone: "", relationship: "Parent" });
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (type !== "teacher") return;
    void fetch("/api/admin/records?table=teachers", { credentials: "same-origin" }).then((response) => response.json()).then((payload) => setTeachers(payload.data ?? []));
  }, [type]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) { setStudents([]); return; }
    const timer = window.setTimeout(() => {
      void fetch(`/api/admin/student-links?q=${encodeURIComponent(value)}`, { credentials: "same-origin" }).then((response) => response.json()).then((payload) => setStudents(payload.data ?? []));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function save() {
    if (!selected) return setNotice("Search for and select a student first.");
    setSaving(true); setNotice("");
    const body = type === "teacher" ? { type, student_id: selected.id, teacher_id: teacherId } : { type, student_id: selected.id, parent_name: parent.name, parent_email: parent.email, parent_phone: parent.phone, relationship: parent.relationship };
    const response = await fetch("/api/admin/student-links", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    setNotice(payload.error ?? payload.data?.message ?? (response.ok ? "Link saved." : "Unable to save link."));
    setSaving(false);
    if (response.ok) { setSelected(null); setQuery(""); setStudents([]); if (type === "parent") setParent({ name: "", email: "", phone: "", relationship: "Parent" }); }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Quick linking</p><h3 className="text-xl font-bold text-blue-950">Link a parent or teacher to a student</h3><p className="mt-1 text-sm text-slate-500">Search by student name or admission number. No scrolling through the full student list is required.</p></div><div className="grid gap-3 md:grid-cols-[180px_1fr]"><select aria-label="Link type" value={type} onChange={(event) => setType(event.target.value as "parent" | "teacher")} className="rounded border border-slate-300 p-3"><option value="parent">Parent</option><option value="teacher">Teacher</option></select><input aria-label="Search student to link" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder="Search student name or admission number" className="rounded border border-slate-300 p-3" /></div>{students.length > 0 && <div className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">{students.map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item); setQuery(item.full_name ?? item.admission_number ?? "Student"); setStudents([]); }} className="rounded px-3 py-2 text-left text-sm hover:bg-white"><span className="font-semibold text-blue-950">{item.full_name ?? "Student"}</span><span className="ml-2 text-slate-500">{item.admission_number ?? ""} · {item.class_name ?? "Class not assigned"}</span></button>)}</div>}{selected && <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-950"><span className="font-semibold">Selected:</span> {selected.full_name ?? selected.admission_number} · {selected.class_name ?? "Class not assigned"}</div>}{type === "parent" ? <div className="mt-4 grid gap-3 md:grid-cols-2"><input aria-label="Parent name" placeholder="Parent full name" value={parent.name} onChange={(event) => setParent({ ...parent, name: event.target.value })} className="rounded border p-3" /><input aria-label="Parent email" type="email" placeholder="Parent email (optional)" value={parent.email} onChange={(event) => setParent({ ...parent, email: event.target.value })} className="rounded border p-3" /><input aria-label="Parent phone" placeholder="Parent phone (optional)" value={parent.phone} onChange={(event) => setParent({ ...parent, phone: event.target.value })} className="rounded border p-3" /><select aria-label="Relationship" value={parent.relationship} onChange={(event) => setParent({ ...parent, relationship: event.target.value })} className="rounded border p-3"><option>Parent</option><option>Guardian</option><option>Mother</option><option>Father</option></select></div> : <select aria-label="Teacher to link" value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="mt-4 w-full rounded border p-3"><option value="">Select teacher</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.full_name ?? item.staff_id} · {item.assigned_class ?? "No class"}</option>)}</select>}<div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void save()} disabled={saving} className="rounded bg-blue-900 px-4 py-3 font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : `Save ${type} link`}</button>{notice && <p role="status" className="text-sm text-slate-600">{notice}</p>}</div></section>;
}
