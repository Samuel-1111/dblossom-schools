'use client';

import { useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";

const schoolLogoUrl = "/manus-storage/school-logo_57ffb7b0.jpg";
function gradeForPercentage(percentage: number) { if (percentage >= 70) return "A"; if (percentage >= 60) return "B"; if (percentage >= 50) return "C"; if (percentage >= 40) return "D"; return "F"; }
function gradeClass(grade: string) { return grade === "A" ? "bg-green-50 text-green-600" : grade === "B" ? "bg-blue-50 text-blue-600" : grade === "C" ? "bg-amber-50 text-amber-600" : grade === "D" ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"; }

type Grade = { id: number; term: string; session?: string | null; score: number; max_score: number; subject_name?: string | null; teacher_comment?: string | null; principal_comment?: string | null };
type Attendance = { id: number; date: string; status: string };
type Announcement = { id: number; title: string; body: string; created_at?: string };

export function StudentDashboardClient({ fullName, studentNumber, className, guardianName, grades, attendance, announcements }: { fullName: string; studentNumber: string; className: string; guardianName: string | null; grades: Grade[]; attendance: Attendance[]; announcements: Announcement[] }) {
  const [term, setTerm] = useState("All Terms");
  const [session, setSession] = useState("All Sessions");
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportNotice, setReportNotice] = useState("");
  const reportCardRef = useRef<HTMLDivElement>(null);
  const sessions = useMemo(() => Array.from(new Set(grades.map((item) => item.session).filter(Boolean))) as string[], [grades]);
  const filteredGrades = useMemo(() => grades.filter((item) => (term === "All Terms" || item.term === term) && (session === "All Sessions" || item.session === session)), [grades, session, term]);
  async function downloadReportCard() {
    if (downloadingReport || !filteredGrades.length) return;
    setDownloadingReport(true);
    setReportNotice("");
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const left = 14;
      const center = 105;
      const tableRight = 196;
      const addHeader = () => {
        pdf.setDrawColor(16, 42, 80);
        pdf.setLineWidth(0.6);
        pdf.line(left, 31, tableRight, 31);
        pdf.setTextColor(16, 42, 80);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("D'Blossom Model Private Schools", center, 16, { align: "center" });
        pdf.setFontSize(9);
        pdf.setTextColor(90, 90, 90);
        pdf.text("Abeokuta, Ogun State", center, 22, { align: "center" });
        pdf.setTextColor(193, 126, 0);
        pdf.setFont("helvetica", "italic");
        pdf.text("Where bright minds find their becoming", center, 27, { align: "center" });
      };
      try {
        const logoResponse = await fetch(schoolLogoUrl, { cache: "force-cache" });
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoData = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(logoBlob); });
          pdf.addImage(logoData, "JPEG", left, 8, 18, 18);
        }
      } catch { /* PDF remains usable if the optional logo request is unavailable. */ }
      addHeader();
      pdf.setTextColor(16, 42, 80);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("STUDENT ACADEMIC REPORT", center, 41, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(45, 45, 45);
      pdf.text(`Student Name: ${fullName}`, left, 50);
      pdf.text(`Admission No.: ${studentNumber}`, left, 56);
      pdf.text(`Class: ${className}`, 112, 50);
      pdf.text(`Term / Session: ${term} / ${session}`, 112, 56);
      let y = 66;
      const columns = [left, 77, 112, 145, 171];
      pdf.setFillColor(16, 42, 80);
      pdf.rect(left, y - 6, tableRight - left, 9, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      ["Subject", "Term", "Score", "Grade", "%"].forEach((label, index) => pdf.text(label, columns[index], y, { align: index === 4 ? "right" : "left" }));
      y += 9;
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(35, 35, 35);
      filteredGrades.forEach((item, index) => {
        if (y > 266) { pdf.addPage(); addHeader(); y = 43; }
        if (index % 2 === 1) { pdf.setFillColor(245, 247, 250); pdf.rect(left, y - 6, tableRight - left, 8, "F"); }
        const percentage = Math.round((Number(item.score) / Number(item.max_score || 100)) * 100);
        const grade = gradeForPercentage(percentage);
        pdf.text(String(item.subject_name ?? "Subject").slice(0, 28), columns[0], y);
        pdf.text(String(item.term ?? "Term").slice(0, 17), columns[1], y);
        pdf.text(`${item.score}/${item.max_score}`, columns[2], y);
        pdf.text(grade, columns[3], y);
        pdf.text(`${percentage}%`, columns[4], y, { align: "right" });
        y += 8;
      });
      y += 8;
      if (y > 260) { pdf.addPage(); addHeader(); y = 43; }
      pdf.setDrawColor(210, 210, 210);
      pdf.line(left, y, tableRight, y);
      y += 8;
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(16, 42, 80);
      pdf.text(`Total Score: ${filteredGrades.reduce((total, item) => total + Number(item.score || 0), 0)}`, left, y);
      pdf.text(`Average: ${average}%`, 112, y);
      y += 10;
      pdf.setFontSize(9);
      pdf.text("Teacher Remark", left, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(70, 70, 70);
      pdf.text(pdf.splitTextToSize(teacherRemark, tableRight - left), left, y + 6);
      pdf.save(`d-blossom-report-card-${studentNumber}-${term.replaceAll(" ", "-")}.pdf`);
      setReportNotice("Report card downloaded.");
    } catch {
      setReportNotice("Report card could not be generated. Please try again.");
    } finally {
      setDownloadingReport(false);
    }
  }
  const average = filteredGrades.length ? Math.round(filteredGrades.reduce((total, item) => total + (Number(item.score) / Number(item.max_score || 100)) * 100, 0) / filteredGrades.length) : 0;
  const present = attendance.filter((item) => item.status === "present").length;
  const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
  const teacherRemark = Array.from(new Set(filteredGrades.map((item) => item.teacher_comment?.trim()).filter(Boolean))).join(" ") || "No teacher remark recorded.";
  async function signOut() { window.location.href = "/auth/signout"; }
  return <main className="min-h-screen bg-secondary/30"><header className="bg-primary px-4 py-8 text-primary-foreground shadow-sm md:px-8 md:py-12"><div className="mx-auto flex max-w-7xl items-center justify-between"><div className="flex items-center gap-3"><img src={schoolLogoUrl} alt="D'Blossom Model Private Schools" className="h-12 w-12 rounded-full object-cover" /><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">D'Blossom Model Private Schools</p><h1 className="text-2xl font-bold text-primary-foreground">Student Portal</h1><p className="text-sm text-primary-foreground/70">{className} | Admission No: {studentNumber}</p></div></div><button onClick={signOut} className="rounded-md border border-primary-foreground/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">Sign out</button></div></header><section className="mx-auto max-w-7xl px-4 py-8 md:px-8"><div className="mb-6 rounded-xl bg-primary p-6 text-primary-foreground"><p className="text-sm text-primary-foreground/70">Student record</p><h2 className="mt-2 text-3xl font-bold">{studentNumber}</h2><p className="mt-2 text-primary-foreground/70">Guardian: {guardianName ?? "Not provided"}</p></div><div className="grid gap-4 md:grid-cols-3"><Stat title="Current average" value={`${average}%`} /><Stat title="Attendance rate" value={`${attendanceRate}%`} /><Stat title="Grade entries" value={String(filteredGrades.length)} /></div><section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-heading text-xl font-bold text-primary">Results</h2><p className="text-sm text-slate-500">Filter your recorded subject grades by session or term.</p></div><div className="flex flex-wrap gap-2"><select aria-label="Filter results by session" value={session} onChange={(e) => setSession(e.target.value)} className="rounded border p-3"><option>All Sessions</option>{sessions.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter results by term" value={term} onChange={(e) => setTerm(e.target.value)} className="rounded border p-3"><option>All Terms</option><option>First Term</option><option>Second Term</option><option>Third Term</option></select><button type="button" onClick={() => void downloadReportCard()} disabled={!filteredGrades.length || downloadingReport} className="rounded bg-amber-500 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{downloadingReport ? "Generating PDF…" : "Download Result (PDF)"}</button></div></div>{reportNotice && <p role="status" className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{reportNotice}</p>}<div ref={reportCardRef} className="mt-4 overflow-x-auto rounded-xl border border-[hsl(220_15%_90%)] bg-white p-6 md:p-10"><div className="mb-6 border-b-2 border-[var(--navy)] pb-6 text-center"><img src={schoolLogoUrl} alt="D'Blossom Model Private Schools" className="mx-auto mb-3 h-16 w-16 rounded-full object-cover" /><p className="font-heading text-xl font-bold text-[var(--navy)] md:text-2xl">D'Blossom Model Private Schools</p><p className="text-xs text-slate-500">Abeokuta, Ogun State</p><p className="text-sm font-semibold italic text-amber-500">Where bright minds find their becoming</p><p className="mx-auto mt-3 inline-block rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900">STUDENT ACADEMIC REPORT</p><div className="mt-4 grid grid-cols-2 gap-4 text-left md:grid-cols-4"><Info label="Student Name" value={fullName} /><Info label="Admission No." value={studentNumber} /><Info label="Class" value={className} /><Info label="Term / Session" value={`${term} / ${session}`} /></div></div><table className="w-full text-left text-sm"><thead><tr className="bg-primary text-primary-foreground"><th className="px-3 py-3">Subject</th><th className="px-3 py-3">Term</th><th className="px-3 py-3">Score</th><th className="px-3 py-3">Grade</th><th className="px-3 py-3">Percentage</th></tr></thead><tbody>{filteredGrades.map((item) => { const percentage = Math.round((Number(item.score) / Number(item.max_score || 100)) * 100); const grade = gradeForPercentage(percentage); return <tr key={item.id} className="border-b even:bg-secondary"><td className="px-3 py-3">{item.subject_name ?? "Subject"}</td><td className="px-3 py-3">{item.term}</td><td className="px-3 py-3">{item.score}/{item.max_score}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${gradeClass(grade)}`}>{grade}</span></td><td className="px-3 py-3 font-semibold">{percentage}%</td></tr>; })}{!filteredGrades.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No results recorded for this selection.</td></tr>}</tbody></table><div className="mt-6 grid grid-cols-3 gap-4"><SummaryCard title="Total Score" value={`${filteredGrades.reduce((total, item) => total + Number(item.score || 0), 0)}`} tone="primary" /><SummaryCard title="Average" value={`${average}%`} tone="gold" /><SummaryCard title="Teacher Remark" value={teacherRemark} tone="accent" /></div></div></section><div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="font-heading text-xl font-bold text-primary">Attendance</h2><div className="mt-4 grid gap-2">{attendance.slice(0, 10).map((item) => <div key={item.id} className="flex justify-between rounded bg-slate-50 px-3 py-2 text-sm"><span>{item.date}</span><span className="font-semibold capitalize">{item.status}</span></div>)}{!attendance.length && <p className="text-sm text-slate-500">No attendance records yet.</p>}</div></section><section className="rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="font-heading text-xl font-bold text-primary">Announcements</h2><div className="mt-4 grid gap-3">{announcements.slice(0, 5).map((item) => <article key={item.id} className="rounded bg-slate-50 p-3"><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.body}</p></article>)}{!announcements.length && <p className="text-sm text-slate-500">No announcements yet.</p>}</div></section></div></section></main>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="font-semibold text-slate-800">{value}</p></div>; }
function SummaryCard({ title, value, tone }: { title: string; value: string; tone: "primary" | "gold" | "accent" }) { const classes = tone === "primary" ? "bg-primary/5 text-primary" : tone === "gold" ? "bg-gold/10 text-gold" : "bg-accent/10 text-accent"; return <div className={`rounded-lg p-4 ${classes}`}><p className="text-xs text-slate-500">{title}</p><p className="mt-1 font-heading text-xl font-bold">{value}</p></div>; }
function Stat({ title, value }: { title: string; value: string }) { return <article className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-3xl font-bold" style={{ color: "var(--navy)" }}>{value}</p></article>; }
