'use client';

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { getSubjects } from "../../shared/school";

const schoolLogoUrl = "/manus-storage/school-logo_57ffb7b0.jpg";

type Row = Record<string, any>;

export function TeacherDashboardClient({ fullName, role, assignedClass, classes, canUpload }: { fullName: string; role: string; assignedClass: string; classes: Row[]; canUpload: boolean }) {
  const supabase = createClient();
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ? String(classes[0].id) : "");
  const [students, setStudents] = useState<Row[]>([]);
  const [loadingClass, setLoadingClass] = useState(false);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [results, setResults] = useState<Row[]>([]);
  const [notice, setNotice] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [grade, setGrade] = useState({ student_id: "", subject_id: "", term: "First Term", session: "", score: "", max_score: "100" });
  const [attendance, setAttendance] = useState({ student_id: "", date: new Date().toISOString().slice(0, 10), status: "present" });

  async function loadClass(classId: string) {
    if (!classId) {
      setStudents([]);
      setSubjects([]);
      return;
    }
    setLoadingClass(true);
    const [{ data: studentRows, error: studentError }, { data: subjectRows }] = await Promise.all([
      supabase.from("students").select("id, admission_number, full_name, profile_id, guardian_name").eq("class_id", Number(classId)).order("admission_number"),
      supabase.from("subjects").select("id, name").eq("class_id", Number(classId)).order("name"),
    ]);
    const resolvedSubjects = subjectRows?.length ? subjectRows : getSubjects().map((name, index) => ({ id: `local-${index}`, name }));
    setStudents(studentRows ?? []);
    setSubjects(resolvedSubjects);
    setGrade((current) => ({ ...current, student_id: studentRows?.[0]?.id ? String(studentRows[0].id) : "", subject_id: resolvedSubjects[0]?.id ? String(resolvedSubjects[0].id) : "" }));
    setAttendance((current) => ({ ...current, student_id: studentRows?.[0]?.id ? String(studentRows[0].id) : "" }));
    if (studentError) setNotice(`Students could not be loaded: ${studentError.message}`);
    setLoadingClass(false);
  }

  useEffect(() => { void loadClass(selectedClass); }, [selectedClass]);
  useEffect(() => { void supabase.from("results").select("id, student_name, class_name, term, session, average, teacher_comment").order("created_at", { ascending: false }).then(({ data }) => setResults(data ?? [])); }, []);

  async function saveGrade(event: FormEvent) {
    event.preventDefault();
    if (savingGrade) return;
    setSavingGrade(true);
    const student = students.find((item) => String(item.id) === grade.student_id);
    let subject = subjects.find((item) => String(item.id) === grade.subject_id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!student || !subject || !user) {
      setNotice("Select an assigned student and subject while signed in.");
      setSavingGrade(false);
      return;
    }
    if (String(subject.id).startsWith("local-")) {
      const { data: createdSubject, error: subjectError } = await supabase.from("subjects").insert({ name: subject.name, class_id: Number(selectedClass) }).select("id, name").single();
      if (subjectError || !createdSubject) {
        setNotice(subjectError ? `Subject could not be prepared: ${subjectError.message}` : "Subject could not be prepared.");
        setSavingGrade(false);
        return;
      }
      subject = createdSubject;
      setSubjects((current) => current.map((item) => String(item.id) === grade.subject_id ? createdSubject : item));
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

  return <main className="min-h-screen bg-secondary/30"><header className="bg-primary px-4 py-8 text-primary-foreground shadow-sm md:px-8 md:py-12"><div className="mx-auto flex max-w-7xl items-center justify-between"><div className="flex items-center gap-3"><img src={schoolLogoUrl} alt="D&apos;Blossom Model Private Schools" className="h-12 w-12 rounded-full object-cover" /><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">D'Blossom Model Private Schools</p><h1 className="text-2xl font-bold text-primary-foreground">{fullName}</h1><p className="text-sm text-primary-foreground/70">{role}{assignedClass !== "No class assigned" ? ` | ${assignedClass}` : ""}</p></div></div><button onClick={signOut} className="rounded-md border border-primary-foreground/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">Sign out</button></div></header><section className="mx-auto max-w-7xl px-4 py-8 md:px-8"><p className="mb-6 rounded-lg bg-primary/5 p-4 text-sm text-primary">{canUpload ? "You can upload results and record attendance only for students in your assigned class. RLS policies enforce this restriction in Supabase." : "This workspace is view-only because no class is assigned to this teacher. Recent results remain available for review."}</p>{notice && <p role="status" className="mb-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}<div className="mb-6 flex flex-wrap items-center gap-3"><label className="text-sm font-semibold">Assigned class<select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="ml-2 rounded border p-3">{classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.grade_level}</option>)}</select></label></div><section aria-labelledby="teacher-overview" className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]"><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Your teaching load</p><h2 id="teacher-overview" className="mt-1 font-heading text-2xl font-bold text-primary">Assigned classes</h2></div><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{classes.length}</span></div>{classes.length ? <div className="grid gap-3">{classes.map((item) => <button type="button" key={item.id} onClick={() => setSelectedClass(String(item.id))} className={`rounded-lg border p-4 text-left transition ${String(item.id) === selectedClass ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border bg-white hover:border-primary/40"}`}><span className="block font-semibold text-primary">{item.name}</span><span className="mt-1 block text-sm text-slate-500">{item.grade_level || "Class"}{item.academic_year ? ` · ${item.academic_year}` : ""}</span></button>)}</div> : <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No class has been assigned to your account yet.</div>}</div><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Class register</p><h2 className="mt-1 font-heading text-2xl font-bold text-primary">Students in {assignedClass}</h2></div><span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">{loadingClass ? "Loading…" : `${students.length} student${students.length === 1 ? "" : "s"}`}</span></div>{loadingClass ? <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">Loading your student list…</div> : students.length ? <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">#</th><th className="px-3 py-3">Student</th><th className="px-3 py-3">Admission number</th><th className="px-3 py-3">Guardian</th></tr></thead><tbody>{students.map((item, index) => <tr key={item.id} className="border-b border-border last:border-0"><td className="px-3 py-3 text-slate-500">{index + 1}</td><td className="px-3 py-3 font-semibold text-slate-800">{item.full_name || "Student"}</td><td className="px-3 py-3 text-slate-600">{item.admission_number || "—"}</td><td className="px-3 py-3 text-slate-600">{item.guardian_name || "—"}</td></tr>)}</tbody></table></div> : <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">No students are assigned to this class yet.</div>}</div></section>{canUpload && <div className="grid gap-6 lg:grid-cols-2"><form onSubmit={saveGrade} className="rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="mb-4 font-heading text-xl font-bold text-primary">Upload Result</h2><div className="grid gap-3"><select required value={grade.student_id} onChange={(e) => setGrade({ ...grade, student_id: e.target.value })} className="rounded border p-3"><option value="">Select student</option>{students.map((item) => <option key={item.id} value={item.id}>{item.admission_number}</option>)}</select><select required value={grade.subject_id} onChange={(e) => setGrade({ ...grade, subject_id: e.target.value })} className="rounded border p-3"><option value="">Select subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={grade.term} onChange={(e) => setGrade({ ...grade, term: e.target.value })} className="rounded border p-3"><option>First Term</option><option>Second Term</option><option>Third Term</option></select><input required placeholder="Academic session (e.g. 2025/2026)" value={grade.session} onChange={(e) => setGrade({ ...grade, session: e.target.value })} className="rounded border p-3" /><div className="grid grid-cols-2 gap-3"><input required type="number" min="0" step="0.01" placeholder="Score" value={grade.score} onChange={(e) => setGrade({ ...grade, score: e.target.value })} className="rounded border p-3" /><input required type="number" min="1" step="0.01" placeholder="Max score" value={grade.max_score} onChange={(e) => setGrade({ ...grade, max_score: e.target.value })} className="rounded border p-3" /></div><button disabled={savingGrade} className="rounded bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{savingGrade ? "Saving Result…" : "Save Result"}</button></div></form><form onSubmit={saveAttendance} className="rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="mb-4 font-heading text-xl font-bold text-primary">Record Attendance</h2><div className="grid gap-3"><select required value={attendance.student_id} onChange={(e) => setAttendance({ ...attendance, student_id: e.target.value })} className="rounded border p-3"><option value="">Select student</option>{students.map((item) => <option key={item.id} value={item.id}>{item.admission_number}</option>)}</select><input required type="date" value={attendance.date} onChange={(e) => setAttendance({ ...attendance, date: e.target.value })} className="rounded border p-3" /><select value={attendance.status} onChange={(e) => setAttendance({ ...attendance, status: e.target.value })} className="rounded border p-3"><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select><button disabled={savingAttendance} className="rounded bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{savingAttendance ? "Saving Attendance…" : "Save Attendance"}</button></div></form></div>}{!canUpload && <section className="rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="font-heading text-xl font-bold text-primary">View-only access</h2><p className="mt-3 text-slate-600">Ask an administrator to assign a class before uploading results or recording attendance.</p></section>}<section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="mb-4 font-heading text-xl font-bold text-primary">Recent Recorded Results</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="px-3 py-3">Student</th><th className="px-3 py-3">Class</th><th className="px-3 py-3">Term</th><th className="px-3 py-3">Average</th></tr></thead><tbody>{results.map((item) => <tr key={item.id} className="border-b"><td className="px-3 py-3">{item.student_name}</td><td className="px-3 py-3">{item.class_name}</td><td className="px-3 py-3">{item.term}</td><td className="px-3 py-3">{item.average}</td></tr>)}{!results.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No results recorded yet.</td></tr>}</tbody></table></div></section></section></main>;
}
