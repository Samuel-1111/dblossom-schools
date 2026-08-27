'use client';

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { getSubjects } from "../../shared/school";

const schoolLogoUrl = "/manus-storage/school-logo_57ffb7b0.jpg";
function letterGrade(total: number) { if (total >= 70) return "A"; if (total >= 60) return "B"; if (total >= 50) return "C"; if (total >= 40) return "D"; return "F"; }

type Row = Record<string, any>;
type SubjectScore = { ca: string; exam: string };
type TeacherDashboardProps = { fullName: string; role: string; assignedClass: string; classes: Row[]; canUpload: boolean };

export function TeacherDashboardClient({ fullName, role, assignedClass, classes, canUpload }: TeacherDashboardProps) {
  const supabase = createClient();
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ? String(classes[0].id) : "");
  const [students, setStudents] = useState<Row[]>([]);
  const [loadingClass, setLoadingClass] = useState(false);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [results, setResults] = useState<Row[]>([]);
  const [notice, setNotice] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [grade, setGrade] = useState({ student_id: "", term: "First Term", session: "", max_score: "100" });
  const [subjectScores, setSubjectScores] = useState<Record<string, SubjectScore>>({});
  const [attendance, setAttendance] = useState({ student_id: "", date: new Date().toISOString().slice(0, 10), status: "present" });
  const [remark, setRemark] = useState({ student_id: "", term: "First Term", session: "", teacher_comment: "" });

  async function loadClass(classId: string) {
    if (!classId) { setStudents([]); setSubjects([]); setResults([]); setSubjectScores({}); return; }
    setLoadingClass(true);
    setNotice("");
    try {
      const response = await fetch(`/api/teacher/records?class_id=${encodeURIComponent(classId)}`, { credentials: "same-origin" });
      const payload = await response.json().catch(() => ({ error: "The server returned an invalid response." }));
      if (!response.ok) throw new Error(payload.error ?? "Students could not be loaded.");
      const workspace = payload.data ?? {};
      const studentRows = Array.isArray(workspace.students) ? workspace.students : [];
      const resolvedSubjects = Array.isArray(workspace.subjects) && workspace.subjects.length ? workspace.subjects : getSubjects().map((name, index) => ({ id: `local-${index}`, name }));
      setStudents(studentRows);
      setSubjects(resolvedSubjects);
      setResults(Array.isArray(workspace.results) ? workspace.results : []);
      setSubjectScores(Object.fromEntries(resolvedSubjects.map((item: Row) => [String(item.id), { ca: "", exam: "" }] )));
      setGrade((current) => ({ ...current, student_id: studentRows[0]?.id ? String(studentRows[0].id) : "" }));
      setAttendance((current) => ({ ...current, student_id: studentRows[0]?.id ? String(studentRows[0].id) : "" }));
      setRemark((current) => ({ ...current, student_id: studentRows[0]?.id ? String(studentRows[0].id) : "" }));
    } catch (error) {
      setStudents([]); setSubjects([]); setResults([]); setSubjectScores({});
      setNotice(error instanceof Error ? error.message : "Students could not be loaded.");
    } finally {
      setLoadingClass(false);
    }
  }

  useEffect(() => { void loadClass(selectedClass); }, [selectedClass]);

  async function saveGrade(event: FormEvent) {
    event.preventDefault();
    if (savingGrade) return;
    setSavingGrade(true);
    const student = students.find((item) => String(item.id) === grade.student_id);
    const sessionName = grade.session.trim();
    const filled = subjects.filter((subject) => subjectScores[String(subject.id)]?.ca !== "" || subjectScores[String(subject.id)]?.exam !== "");
    const incomplete = subjects.find((subject) => subjectScores[String(subject.id)]?.ca === "" || subjectScores[String(subject.id)]?.exam === "");
    if (!student) { setNotice("Select an assigned student while signed in."); setSavingGrade(false); return; }
    if (!sessionName) { setNotice("Enter an academic session before saving the result."); setSavingGrade(false); return; }
    if (!subjects.length) { setNotice("No subjects are configured for this class yet."); setSavingGrade(false); return; }
    if (filled.length !== subjects.length || incomplete) { setNotice("Complete the CA and Exam scores for every subject before saving this report."); setSavingGrade(false); return; }
    const response = await fetch("/api/teacher/records", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-result", class_id: selectedClass, student_id: grade.student_id, term: grade.term, session: sessionName, subject_scores: subjectScores }) });
    const payload = await response.json().catch(() => ({ error: "The server returned an invalid response." }));
    setNotice(response.ok ? payload.data?.message ?? `Complete report saved for ${student.full_name || student.admission_number}.` : payload.error ?? "The complete report could not be saved.");
    setSavingGrade(false);
    if (response.ok) await loadClass(selectedClass);
  }

  function loadSavedReport() {
    const student = students.find((item) => String(item.id) === grade.student_id);
    const sessionName = grade.session.trim();
    if (!student || !sessionName) { setNotice("Select a student and enter an academic session before loading the report."); return; }
    const saved = results.filter((item) => String(item.student_id) === String(student.id) && item.term === grade.term && item.session === sessionName);
    if (!saved.length) { setNotice("No saved subject results exist for this student, term, and session yet."); return; }
    setSubjectScores((current) => {
      const next = { ...current };
      for (const item of saved) if (item.subject_id) next[String(item.subject_id)] = { ca: String(item.ca_score ?? ""), exam: String(item.exam_score ?? "") };
      return next;
    });
    const savedRemark = saved.find((item) => String(item.teacher_comment ?? "").trim())?.teacher_comment ?? "";
    setRemark((current) => ({ ...current, student_id: String(student.id), term: grade.term, session: sessionName, teacher_comment: savedRemark }));
    setNotice(`Loaded ${saved.length} saved subject result${saved.length === 1 ? "" : "s"} for ${student.full_name || student.admission_number}.`);
  }

  function useResultForRemark(item: Row) {
    const student = students.find((candidate) => String(candidate.id) === String(item.student_id));
    if (!student) return;
    setRemark({ student_id: String(student.id), term: String(item.term ?? "First Term"), session: String(item.session ?? ""), teacher_comment: String(item.teacher_comment ?? "") });
    setNotice(`Ready to edit the teacher remark for ${student.full_name || student.admission_number}.`);
  }

  async function saveRemark(event: FormEvent) {
    event.preventDefault();
    if (!remark.student_id || !remark.session.trim() || !remark.teacher_comment.trim()) { setNotice("Select a student, term, and session, then enter a teacher remark."); return; }
    const student = students.find((item) => String(item.id) === remark.student_id);
    if (!student) { setNotice("Select a student from your assigned class."); return; }
    setNotice("Saving teacher remark…");
    const response = await fetch("/api/teacher/records", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-remark", class_id: selectedClass, student_id: remark.student_id, term: remark.term, session: remark.session.trim(), teacher_comment: remark.teacher_comment.trim() }) });
    const payload = await response.json().catch(() => ({ error: "The server returned an invalid response." }));
    setNotice(response.ok ? payload.data?.message ?? `Teacher remark saved for ${student.full_name || student.admission_number}.` : payload.error ?? "Teacher remark could not be saved.");
    if (response.ok) await loadClass(selectedClass);
  }

  async function saveAttendance(event: FormEvent) {
    event.preventDefault();
    if (savingAttendance) return;
    setSavingAttendance(true);
    if (!attendance.student_id) { setNotice("Select a student before recording attendance."); setSavingAttendance(false); return; }
    const response = await fetch("/api/teacher/records", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-attendance", class_id: selectedClass, student_id: attendance.student_id, date: attendance.date, status: attendance.status }) });
    const payload = await response.json().catch(() => ({ error: "The server returned an invalid response." }));
    setNotice(response.ok ? payload.data?.message ?? "Attendance recorded." : payload.error ?? "Attendance could not be saved.");
    setSavingAttendance(false);
  }

  async function signOut() { await supabase.auth.signOut(); window.location.href = "/teacher-portal"; }
  const currentClass = classes.find((item) => String(item.id) === selectedClass);
  const currentClassName = currentClass?.name ?? assignedClass;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-4 py-4 shadow-sm md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={schoolLogoUrl} alt="D'Blossom Model Private Schools" className="h-12 w-12 shrink-0 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-primary">D'Blossom Model Private Schools</p>
              <p className="text-xs font-semibold text-amber-600">Indomino Confidimus</p>
            </div>
          </div>
          <button onClick={signOut} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary">Sign out</button>
        </div>
      </header>

      <section className="bg-primary px-4 py-10 text-primary-foreground md:px-8 md:py-14">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <div><p className="text-sm text-primary-foreground/70">Class Teacher · {currentClassName}</p><h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">{fullName}</h1><p className="mt-2 text-sm text-primary-foreground/75">Manage assigned students, results, remarks, and attendance.</p></div>
          <div className="hidden rounded-xl border border-white/20 bg-white/10 px-5 py-4 text-right sm:block"><p className="text-xs uppercase tracking-[0.15em] text-amber-300">Students</p><p className="mt-1 text-3xl font-bold">{loadingClass ? "…" : students.length}</p></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-12 md:px-8 md:py-10">
        {notice && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p>}
        {classes.length > 1 && <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 shadow-sm"><span className="text-sm font-semibold text-slate-700">Assigned classes</span>{classes.map((item) => <button type="button" key={item.id} onClick={() => setSelectedClass(String(item.id))} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${String(item.id) === selectedClass ? "bg-primary text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{item.name}</button>)}</div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Result workspace</p><h2 className="mt-1 font-heading text-2xl font-bold text-primary">Upload / Edit Results — {currentClassName}</h2><p className="mt-2 text-sm text-slate-600">Select any student in your assigned class. Every JSS1 student and every other assigned-class student is loaded into the selector.</p></div><span className="rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-primary">{subjects.length} subjects</span></div>
          {!canUpload ? <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">This workspace is view-only because no class is assigned to this teacher.</div> : <form onSubmit={saveGrade}>
            <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Student<select required aria-label="Select student for result" value={grade.student_id} onChange={(e) => setGrade({ ...grade, student_id: e.target.value })} disabled={loadingClass || !students.length} className="rounded border border-slate-300 bg-white p-3 font-normal"><option value="">{loadingClass ? "Loading students…" : students.length ? "Select student" : "No students in this class"}</option>{students.map((item) => <option key={item.id} value={item.id}>{item.full_name || "Student"} · {item.admission_number}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Term<select required value={grade.term} onChange={(e) => setGrade({ ...grade, term: e.target.value })} className="rounded border border-slate-300 bg-white p-3 font-normal"><option>First Term</option><option>Second Term</option><option>Third Term</option></select></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Session<input required placeholder="2025/2026" value={grade.session} onChange={(e) => setGrade({ ...grade, session: e.target.value })} className="rounded border border-slate-300 bg-white p-3 font-normal" /></label>
              <button type="button" onClick={loadSavedReport} disabled={loadingClass || !students.length} className="self-end rounded bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">Load</button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="bg-primary text-white"><th className="px-4 py-3">Subject</th><th className="w-32 px-4 py-3">CA Score</th><th className="w-32 px-4 py-3">Exam Score</th><th className="w-28 px-4 py-3">Total</th><th className="w-24 px-4 py-3">Grade</th></tr></thead><tbody>{subjects.map((subject) => { const scores = subjectScores[String(subject.id)] ?? { ca: "", exam: "" }; const total = (Number(scores.ca) || 0) + (Number(scores.exam) || 0); return <tr key={subject.id} className="border-b border-slate-200 last:border-0 even:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-800">{subject.name}</td><td className="px-4 py-2"><input required aria-label={`${subject.name} CA score`} type="number" min="0" step="0.01" value={scores.ca} onChange={(e) => setSubjectScores((current) => ({ ...current, [String(subject.id)]: { ...scores, ca: e.target.value } }))} className="w-full rounded border border-slate-300 p-2" /></td><td className="px-4 py-2"><input required aria-label={`${subject.name} Exam score`} type="number" min="0" step="0.01" value={scores.exam} onChange={(e) => setSubjectScores((current) => ({ ...current, [String(subject.id)]: { ...scores, exam: e.target.value } }))} className="w-full rounded border border-slate-300 p-2" /></td><td className="px-4 py-3 font-semibold text-primary">{total}</td><td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-primary">{letterGrade(total)}</span></td></tr>; })}{!subjects.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No subjects are configured for this class.</td></tr>}</tbody></table></div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Complete CA and Exam for every subject before saving this student&apos;s report.</p><button disabled={savingGrade || !students.length || !subjects.length} className="rounded bg-primary px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{savingGrade ? "Saving Complete Report…" : "Save Complete Result"}</button></div>
          </form>}
        </section>

        {canUpload && <form onSubmit={saveRemark} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Per-student report comment</p><h2 className="mt-1 font-heading text-2xl font-bold text-primary">Teacher Comment for Each Student Result</h2><p className="mt-2 text-sm text-slate-600">Choose a student, term, and session, then save one teacher remark across that student&apos;s subject results. Saved remarks are shown to the student and in the PDF report.</p></div><div className="grid gap-4 md:grid-cols-3"><label className="grid gap-2 text-sm font-semibold text-slate-700">Student<select required aria-label="Select student for teacher remark" value={remark.student_id} onChange={(e) => setRemark({ ...remark, student_id: e.target.value })} className="rounded border border-slate-300 bg-white p-3 font-normal"><option value="">Select student</option>{students.map((item) => <option key={item.id} value={item.id}>{item.full_name || "Student"} · {item.admission_number}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Term<select required value={remark.term} onChange={(e) => setRemark({ ...remark, term: e.target.value })} className="rounded border border-slate-300 bg-white p-3 font-normal"><option>First Term</option><option>Second Term</option><option>Third Term</option></select></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Session<input required placeholder="2025/2026" value={remark.session} onChange={(e) => setRemark({ ...remark, session: e.target.value })} className="rounded border border-slate-300 bg-white p-3 font-normal" /></label></div><label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">Teacher Remark<textarea required rows={4} maxLength={500} placeholder="Enter this student&apos;s teacher comment" value={remark.teacher_comment} onChange={(e) => setRemark({ ...remark, teacher_comment: e.target.value })} className="rounded border border-slate-300 bg-white p-3 font-normal" /></label><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Only students in {currentClassName} can be selected.</p><button type="button" onClick={() => setRemark({ student_id: "", term: "First Term", session: "", teacher_comment: "" })} className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">Clear</button><button type="submit" className="rounded bg-primary px-5 py-3 font-semibold text-white">Save Teacher Remark</button></div></form>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Assigned-class register</p><h2 className="mt-1 font-heading text-2xl font-bold text-primary">Students in {currentClassName}</h2></div><span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">{loadingClass ? "Loading…" : `${students.length} student${students.length === 1 ? "" : "s"}`}</span></div>{loadingClass ? <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">Loading every student in your assigned class…</div> : students.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">#</th><th className="px-3 py-3">Student</th><th className="px-3 py-3">Admission number</th><th className="px-3 py-3">Guardian</th></tr></thead><tbody>{students.map((item, index) => <tr key={item.id} className="border-b border-slate-200 last:border-0"><td className="px-3 py-3 text-slate-500">{index + 1}</td><td className="px-3 py-3 font-semibold text-slate-800">{item.full_name || "Student"}</td><td className="px-3 py-3 text-slate-600">{item.admission_number || "—"}</td><td className="px-3 py-3 text-slate-600">{item.guardian_name || "—"}</td></tr>)}</tbody></table></div> : <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">No students are assigned to this class yet.</div>}</section>

        {canUpload && <form onSubmit={saveAttendance} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><h2 className="mb-4 font-heading text-xl font-bold text-primary">Record Attendance</h2><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]"><select required aria-label="Select student for attendance" value={attendance.student_id} onChange={(e) => setAttendance({ ...attendance, student_id: e.target.value })} className="rounded border border-slate-300 p-3"><option value="">Select student</option>{students.map((item) => <option key={item.id} value={item.id}>{item.full_name || "Student"} · {item.admission_number}</option>)}</select><input required type="date" value={attendance.date} onChange={(e) => setAttendance({ ...attendance, date: e.target.value })} className="rounded border border-slate-300 p-3" /><select value={attendance.status} onChange={(e) => setAttendance({ ...attendance, status: e.target.value })} className="rounded border border-slate-300 p-3"><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select><button disabled={savingAttendance} className="rounded bg-primary px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{savingAttendance ? "Saving Attendance…" : "Save Attendance"}</button></div></form>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Saved reports</p><h2 className="font-heading text-xl font-bold text-primary">Recent Recorded Results and Comments</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-slate-200"><th className="px-3 py-3">Student</th><th className="px-3 py-3">Term</th><th className="px-3 py-3">Session</th><th className="px-3 py-3">Comment</th><th className="px-3 py-3">Action</th></tr></thead><tbody>{results.slice(0, 20).map((item) => <tr key={item.id} className="border-b border-slate-200"><td className="px-3 py-3 font-semibold">{item.student_name}</td><td className="px-3 py-3">{item.term}</td><td className="px-3 py-3">{item.session}</td><td className="max-w-xs px-3 py-3 text-slate-600">{item.teacher_comment || "No comment saved"}</td><td className="px-3 py-3"><button type="button" onClick={() => useResultForRemark(item)} className="font-semibold text-primary underline">{item.teacher_comment ? "Edit comment" : "Add comment"}</button></td></tr>)}{!results.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No results recorded yet.</td></tr>}</tbody></table></div></section>
      </section>
    </main>
  );
}
