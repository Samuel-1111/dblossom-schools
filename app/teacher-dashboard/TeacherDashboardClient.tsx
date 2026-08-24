'use client';

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

type Row = Record<string, any>;

export function TeacherDashboardClient({ fullName, classes, canUpload }: { fullName: string; classes: Row[]; canUpload: boolean }) {
  const supabase = createClient();
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ? String(classes[0].id) : "");
  const [students, setStudents] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [results, setResults] = useState<Row[]>([]);
  const [notice, setNotice] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [grade, setGrade] = useState({ student_id: "", subject_id: "", term: "First Term", session: "", score: "", max_score: "100" });
  const [attendance, setAttendance] = useState({ student_id: "", date: new Date().toISOString().slice(0, 10), status: "present" });

  async function loadClass(classId: string) {
    if (!classId) return;
    const [{ data: studentRows }, { data: subjectRows }] = await Promise.all([
      supabase.from("students").select("id, student_number, profile_id, guardian_name").eq("class_id", Number(classId)).order("student_number"),
      supabase.from("subjects").select("id, name").eq("class_id", Number(classId)).order("name"),
    ]);
    setStudents(studentRows ?? []);
    setSubjects(subjectRows ?? []);
    setGrade((current) => ({ ...current, student_id: studentRows?.[0]?.id ? String(studentRows[0].id) : "", subject_id: subjectRows?.[0]?.id ? String(subjectRows[0].id) : "" }));
    setAttendance((current) => ({ ...current, student_id: studentRows?.[0]?.id ? String(studentRows[0].id) : "" }));
  }

  useEffect(() => { void loadClass(selectedClass); }, [selectedClass]);
  useEffect(() => { void supabase.from("results").select("id, student_name, class_name, term, session, average, teacher_comment").order("created_at", { ascending: false }).then(({ data }) => setResults(data ?? [])); }, []);

  async function saveGrade(event: FormEvent) {
    event.preventDefault();
    if (savingGrade) return;
    setSavingGrade(true);
    const student = students.find((item) => String(item.id) === grade.student_id);
    const subject = subjects.find((item) => String(item.id) === grade.subject_id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!student || !subject || !user) {
      setNotice("Select an assigned student and subject while signed in.");
      setSavingGrade(false);
      return;
    }
    const score = Number(grade.score);
    const maxScore = Number(grade.max_score);
    const session = grade.session.trim();
    if (!session) {
      setNotice("Enter an academic session before saving the result.");
      setSavingGrade(false);
      return;
    }
    const { error } = await supabase.from("grades").insert({ student_id: student.id, subject_id: subject.id, term: grade.term, session, score, max_score: maxScore, recorded_by: user.id });
    setNotice(error ? `Result could not be saved: ${error.message}` : "Result saved for the assigned class.");
    if (!error) setGrade((current) => ({ ...current, score: "" }));
    setSavingGrade(false);
  }

  async function saveAttendance(event: FormEvent) {
    event.preventDefault();
    if (savingAttendance) return;
    setSavingAttendance(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !attendance.student_id) {
      setNotice("Select a student before recording attendance.");
      setSavingAttendance(false);
      return;
    }
    const { error } = await supabase.from("attendance").upsert({ student_id: Number(attendance.student_id), date: attendance.date, status: attendance.status, recorded_by: user.id }, { onConflict: "student_id,date" });
    setNotice(error ? `Attendance could not be saved: ${error.message}` : "Attendance recorded.");
    setSavingAttendance(false);
  }

  async function signOut() { await supabase.auth.signOut(); window.location.href = "/teacher-portal"; }

  return <main className="min-h-screen bg-slate-50"><header className="border-b bg-white px-4 py-4 shadow-sm md:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between"><div className="flex items-center gap-3"><img src="/manus-storage/school-logo_15e2310a.jpg" alt="D&apos;Blossom Model Private Schools" className="h-12 w-12 rounded-full object-cover" /><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">D'Blossom Model Private Schools</p><h1 className="text-2xl font-bold" style={{ color: "var(--navy)" }}>Teacher Portal</h1><p className="text-sm text-slate-500">Welcome, {fullName}</p></div></div><button onClick={signOut} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Sign out</button></div></header><section className="mx-auto max-w-7xl px-4 py-8 md:px-8"><p className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">{canUpload ? "You can upload results and record attendance only for students in your assigned class. RLS policies enforce this restriction in Supabase." : "This workspace is view-only because no class is assigned to this teacher. Recent results remain available for review."}</p>{notice && <p role="status" className="mb-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}<div className="mb-6 flex flex-wrap items-center gap-3"><label className="text-sm font-semibold">Assigned class<select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="ml-2 rounded border p-3">{classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.grade_level}</option>)}</select></label></div>{canUpload && <div className="grid gap-6 lg:grid-cols-2"><form onSubmit={saveGrade} className="rounded-xl border bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-bold" style={{ color: "var(--navy)" }}>Upload Result</h2><div className="grid gap-3"><select required value={grade.student_id} onChange={(e) => setGrade({ ...grade, student_id: e.target.value })} className="rounded border p-3"><option value="">Select student</option>{students.map((item) => <option key={item.id} value={item.id}>{item.student_number}</option>)}</select><select required value={grade.subject_id} onChange={(e) => setGrade({ ...grade, subject_id: e.target.value })} className="rounded border p-3"><option value="">Select subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={grade.term} onChange={(e) => setGrade({ ...grade, term: e.target.value })} className="rounded border p-3"><option>First Term</option><option>Second Term</option><option>Third Term</option></select><input required placeholder="Academic session (e.g. 2025/2026)" value={grade.session} onChange={(e) => setGrade({ ...grade, session: e.target.value })} className="rounded border p-3" /><div className="grid grid-cols-2 gap-3"><input required type="number" min="0" step="0.01" placeholder="Score" value={grade.score} onChange={(e) => setGrade({ ...grade, score: e.target.value })} className="rounded border p-3" /><input required type="number" min="1" step="0.01" placeholder="Max score" value={grade.max_score} onChange={(e) => setGrade({ ...grade, max_score: e.target.value })} className="rounded border p-3" /></div><button disabled={savingGrade} className="rounded bg-blue-900 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{savingGrade ? "Saving Result…" : "Save Result"}</button></div></form><form onSubmit={saveAttendance} className="rounded-xl border bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-bold" style={{ color: "var(--navy)" }}>Record Attendance</h2><div className="grid gap-3"><select required value={attendance.student_id} onChange={(e) => setAttendance({ ...attendance, student_id: e.target.value })} className="rounded border p-3"><option value="">Select student</option>{students.map((item) => <option key={item.id} value={item.id}>{item.student_number}</option>)}</select><input required type="date" value={attendance.date} onChange={(e) => setAttendance({ ...attendance, date: e.target.value })} className="rounded border p-3" /><select value={attendance.status} onChange={(e) => setAttendance({ ...attendance, status: e.target.value })} className="rounded border p-3"><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select><button disabled={savingAttendance} className="rounded bg-blue-900 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{savingAttendance ? "Saving Attendance…" : "Save Attendance"}</button></div></form></div>}{!canUpload && <section className="rounded-xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>View-only access</h2><p className="mt-3 text-slate-600">Ask an administrator to assign a class before uploading results or recording attendance.</p></section>}<section className="mt-8 rounded-xl border bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-bold" style={{ color: "var(--navy)" }}>Recent Recorded Results</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="px-3 py-3">Student</th><th className="px-3 py-3">Class</th><th className="px-3 py-3">Term</th><th className="px-3 py-3">Average</th></tr></thead><tbody>{results.map((item) => <tr key={item.id} className="border-b"><td className="px-3 py-3">{item.student_name}</td><td className="px-3 py-3">{item.class_name}</td><td className="px-3 py-3">{item.term}</td><td className="px-3 py-3">{item.average}</td></tr>)}{!results.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No results recorded yet.</td></tr>}</tbody></table></div></section></section></main>;
}
