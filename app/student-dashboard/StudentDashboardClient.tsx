'use client';

import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type Grade = { id: number; term: string; session?: string | null; score: number; max_score: number; subject_name?: string | null };
type Attendance = { id: number; date: string; status: string };
type Announcement = { id: number; title: string; body: string; created_at?: string };

export function StudentDashboardClient({ fullName, studentNumber, guardianName, grades, attendance, announcements }: { fullName: string; studentNumber: string; guardianName: string | null; grades: Grade[]; attendance: Attendance[]; announcements: Announcement[] }) {
  const [term, setTerm] = useState("All Terms");
  const [session, setSession] = useState("All Sessions");
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportNotice, setReportNotice] = useState("");
  const reportCardRef = useRef<HTMLDivElement>(null);
  const sessions = useMemo(() => Array.from(new Set(grades.map((item) => item.session).filter(Boolean))) as string[], [grades]);
  const filteredGrades = useMemo(() => grades.filter((item) => (term === "All Terms" || item.term === term) && (session === "All Sessions" || item.session === session)), [grades, session, term]);
  async function downloadReportCard() {
    if (downloadingReport || !reportCardRef.current || !filteredGrades.length) return;
    setDownloadingReport(true);
    setReportNotice("");
    try {
      const canvas = await html2canvas(reportCardRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const pdf = new jsPDF("p", "mm", "a4");
      const width = 190;
      const pageHeight = 277;
      const height = (canvas.height * width) / canvas.width;
      const imageData = canvas.toDataURL("image/png");
      let heightLeft = height;
      let position = 10;
      pdf.addImage(imageData, "PNG", 10, position, width, height);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - height + 10;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", 10, position, width, height);
        heightLeft -= pageHeight;
      }
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
  async function signOut() { window.location.href = "/auth/signout"; }
  return <main className="min-h-screen bg-slate-50"><header className="border-b bg-white px-4 py-4 shadow-sm md:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">D'Blossom Model Private Schools</p><h1 className="text-2xl font-bold" style={{ color: "var(--navy)" }}>Student Portal</h1><p className="text-sm text-slate-500">Welcome, {fullName}</p></div><button onClick={signOut} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Sign out</button></div></header><section className="mx-auto max-w-7xl px-4 py-8 md:px-8"><div className="mb-6 rounded-xl bg-blue-900 p-6 text-white"><p className="text-sm text-blue-100">Student record</p><h2 className="mt-2 text-3xl font-bold">{studentNumber}</h2><p className="mt-2 text-blue-100">Guardian: {guardianName ?? "Not provided"}</p></div><div className="grid gap-4 md:grid-cols-3"><Stat title="Current average" value={`${average}%`} /><Stat title="Attendance rate" value={`${attendanceRate}%`} /><Stat title="Grade entries" value={String(filteredGrades.length)} /></div><section className="mt-8 rounded-xl border bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Results</h2><p className="text-sm text-slate-500">Filter your recorded subject grades by term.</p></div><div className="flex flex-wrap gap-2"><select aria-label="Filter results by session" value={session} onChange={(e) => setSession(e.target.value)} className="rounded border p-3"><option>All Sessions</option>{sessions.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter results by term" value={term} onChange={(e) => setTerm(e.target.value)} className="rounded border p-3"><option>All Terms</option><option>First Term</option><option>Second Term</option><option>Third Term</option></select><button type="button" onClick={() => void downloadReportCard()} disabled={!filteredGrades.length || downloadingReport} className="rounded bg-amber-500 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{downloadingReport ? "Generating PDF…" : "Download Report Card"}</button></div></div>{reportNotice && <p role="status" className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{reportNotice}</p>}<div ref={reportCardRef} className="mt-4 overflow-x-auto rounded-lg bg-white p-1"><div className="mb-3 hidden border-b-2 border-amber-500 pb-3 text-center print:block"><p className="text-xs font-semibold uppercase tracking-widest text-blue-900">D'Blossom Model Private Schools</p><p className="font-serif text-lg font-bold text-blue-900">Student Report Card</p><p className="text-xs">{studentNumber} · {session} · {term}</p></div><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="px-3 py-3">Subject</th><th className="px-3 py-3">Term</th><th className="px-3 py-3">Score</th><th className="px-3 py-3">Percentage</th></tr></thead><tbody>{filteredGrades.map((item) => <tr key={item.id} className="border-b"><td className="px-3 py-3">{item.subject_name ?? "Subject"}</td><td className="px-3 py-3">{item.term}</td><td className="px-3 py-3">{item.score}/{item.max_score}</td><td className="px-3 py-3 font-semibold">{Math.round((Number(item.score) / Number(item.max_score || 100)) * 100)}%</td></tr>)}{!filteredGrades.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No results recorded for this selection.</td></tr>}</tbody></table></div></section><div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Attendance</h2><div className="mt-4 grid gap-2">{attendance.slice(0, 10).map((item) => <div key={item.id} className="flex justify-between rounded bg-slate-50 px-3 py-2 text-sm"><span>{item.date}</span><span className="font-semibold capitalize">{item.status}</span></div>)}{!attendance.length && <p className="text-sm text-slate-500">No attendance records yet.</p>}</div></section><section className="rounded-xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Announcements</h2><div className="mt-4 grid gap-3">{announcements.slice(0, 5).map((item) => <article key={item.id} className="rounded bg-slate-50 p-3"><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.body}</p></article>)}{!announcements.length && <p className="text-sm text-slate-500">No announcements yet.</p>}</div></section></div></section></main>;
}
function Stat({ title, value }: { title: string; value: string }) { return <article className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-3xl font-bold" style={{ color: "var(--navy)" }}>{value}</p></article>; }
