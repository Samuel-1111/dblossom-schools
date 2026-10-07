'use client';

import { useEffect, useMemo, useState } from "react";

type Student = { id: string; full_name?: string; admission_number?: string };
type Parent = { id: string; full_name?: string; email?: string };
type Admission = { id: string; application_number: string; applicant_name: string; class_applied?: string; parent_name?: string; status: string; created_at: string };

export function AdminOperations() {
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("School fees");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentInvoice, setPaymentInvoice] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [announcement, setAnnouncement] = useState({ title: "", body: "", audience: "all", pinned: false });
  const [message, setMessage] = useState({ parentId: "", subject: "", body: "" });
  const [calendar, setCalendar] = useState({ title: "", description: "", event_date: "", start_time: "" });
  const [notice, setNotice] = useState("");

  async function load() {
    const [studentsResponse, parentsResponse, admissionsResponse] = await Promise.all([
      fetch("/api/admin/records?table=students", { credentials: "same-origin" }),
      fetch("/api/admin/operations?type=parents", { credentials: "same-origin" }),
      fetch("/api/admin/operations?type=admissions", { credentials: "same-origin" })
    ]);
    const studentPayload = await studentsResponse.json().catch(() => ({}));
    const parentPayload = await parentsResponse.json().catch(() => ({}));
    const admissionPayload = await admissionsResponse.json().catch(() => ({}));
    setStudents(studentPayload.data ?? []);
    setParents(parentPayload.data ?? []);
    setAdmissions(admissionPayload.data ?? []);
  }
  useEffect(() => { void load(); }, []);

  const matches = useMemo(() => students.filter((item) => {
    const q = studentQuery.toLowerCase().trim();
    return q && (item.full_name ?? "").toLowerCase().includes(q) || q && (item.admission_number ?? "").toLowerCase().includes(q);
  }).slice(0, 8), [students, studentQuery]);

  async function post(body: Record<string, unknown>) {
    setNotice("");
    const response = await fetch("/api/admin/operations", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Operation could not be completed.");
    return payload;
  }

  async function createInvoice() {
    try {
      await post({ type: "invoice", student_id: studentId, due_date: dueDate, items: [{ description: invoiceDescription, amount: Number(invoiceAmount) }] });
      setNotice("Fee invoice created.");
      setInvoiceAmount(""); setStudentId(""); setStudentQuery("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Invoice could not be created."); }
  }
  async function recordPayment() {
    try {
      const payload = await post({ type: "payment", invoice_id: paymentInvoice, amount: Number(paymentAmount), method: "Manual" });
      setNotice("Payment recorded. Receipt " + (payload.data?.receipt_number ?? "generated") + ".");
      setPaymentAmount("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Payment could not be recorded."); }
  }
  async function publishAnnouncement() {
    try { await post({ type: "announcement", ...announcement }); setNotice("Announcement published."); setAnnouncement({ title: "", body: "", audience: "all", pinned: false }); } catch (error) { setNotice(error instanceof Error ? error.message : "Announcement could not be published."); }
  }
  async function sendMessage() {
    try { await post({ type: "message", ...message }); setNotice("Message sent to parent inbox."); setMessage({ parentId: "", subject: "", body: "" }); } catch (error) { setNotice(error instanceof Error ? error.message : "Message could not be sent."); }
  }
  async function addCalendar() {
    try { await post({ type: "calendar", ...calendar }); setNotice("Calendar event added."); setCalendar({ title: "", description: "", event_date: "", start_time: "" }); } catch (error) { setNotice(error instanceof Error ? error.message : "Calendar event could not be added."); }
  }
  async function updateAdmission(id: string, status: string) {
    const response = await fetch("/api/admin/operations", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "admission", id, status }) });
    const payload = await response.json().catch(() => ({}));
    setNotice(response.ok ? "Admission status updated." : payload.error ?? "Admission update failed.");
    if (response.ok) void load();
  }

  return <section className="space-y-6">
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold text-blue-950">Fees & Operations</h2><p className="mt-1 text-sm text-slate-500">Simple admin controls for invoices, partial payments, receipts, announcements, messaging, calendar and admissions.</p></div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Create fee invoice"><div className="grid gap-3"><input value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Search student name or admission number" className="rounded border p-3" />{matches.length > 0 && <div className="grid gap-1 rounded border bg-slate-50 p-2">{matches.map((student) => <button type="button" key={student.id} onClick={() => { setStudentId(String(student.id)); setStudentQuery(student.full_name ?? student.admission_number ?? "Student"); }} className="rounded px-3 py-2 text-left text-sm hover:bg-white">{student.full_name} · {student.admission_number}</button>)}</div>}<input value={invoiceDescription} onChange={(e) => setInvoiceDescription(e.target.value)} placeholder="Fee description" className="rounded border p-3" /><input type="number" min="0" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="Amount (₦)" className="rounded border p-3" /><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded border p-3" /><button type="button" onClick={() => void createInvoice()} className="rounded bg-blue-900 px-4 py-3 font-semibold text-white">Generate Invoice</button></div></Card>
      <Card title="Record partial/full payment"><div className="grid gap-3"><input value={paymentInvoice} onChange={(e) => setPaymentInvoice(e.target.value)} placeholder="Invoice ID" className="rounded border p-3" /><input type="number" min="1" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Payment amount (₦)" className="rounded border p-3" /><button type="button" onClick={() => void recordPayment()} className="rounded bg-amber-500 px-4 py-3 font-semibold text-slate-950">Record Payment & Receipt</button><p className="text-xs text-slate-500">Parents can see confirmed payments and balances in the Parent Portal.</p></div></Card>
      <Card title="School announcement"><div className="grid gap-3"><input value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} placeholder="Announcement title" className="rounded border p-3" /><textarea value={announcement.body} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} placeholder="Announcement message" className="min-h-28 rounded border p-3" /><select value={announcement.audience} onChange={(e) => setAnnouncement({ ...announcement, audience: e.target.value })} className="rounded border p-3"><option value="all">Everyone</option><option value="parent">Parents</option><option value="student">Students</option><option value="teacher">Teachers</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={announcement.pinned} onChange={(e) => setAnnouncement({ ...announcement, pinned: e.target.checked })} /> Pin announcement</label><button type="button" onClick={() => void publishAnnouncement()} className="rounded bg-blue-900 px-4 py-3 font-semibold text-white">Publish Announcement</button></div></Card>
      <Card title="Parent–school message"><div className="grid gap-3"><select value={message.parentId} onChange={(e) => setMessage({ ...message, parentId: e.target.value })} className="rounded border p-3"><option value="">Select parent</option>{parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.full_name} · {parent.email ?? "No email"}</option>)}</select><input value={message.subject} onChange={(e) => setMessage({ ...message, subject: e.target.value })} placeholder="Subject" className="rounded border p-3" /><textarea value={message.body} onChange={(e) => setMessage({ ...message, body: e.target.value })} placeholder="Message" className="min-h-28 rounded border p-3" /><button type="button" onClick={() => void sendMessage()} className="rounded bg-blue-900 px-4 py-3 font-semibold text-white">Send Message</button></div></Card>
      <Card title="Parent calendar"><div className="grid gap-3"><input value={calendar.title} onChange={(e) => setCalendar({ ...calendar, title: e.target.value })} placeholder="Event title" className="rounded border p-3" /><input value={calendar.description} onChange={(e) => setCalendar({ ...calendar, description: e.target.value })} placeholder="Description" className="rounded border p-3" /><input type="date" value={calendar.event_date} onChange={(e) => setCalendar({ ...calendar, event_date: e.target.value })} className="rounded border p-3" /><input type="time" value={calendar.start_time} onChange={(e) => setCalendar({ ...calendar, start_time: e.target.value })} className="rounded border p-3" /><button type="button" onClick={() => void addCalendar()} className="rounded bg-blue-900 px-4 py-3 font-semibold text-white">Add Event</button></div></Card>
      <Card title="Admissions review queue"><div className="grid gap-2">{admissions.slice(0, 12).map((item) => <article key={item.id} className="rounded-lg bg-slate-50 p-3"><p className="font-semibold">{item.applicant_name}</p><p className="text-xs text-slate-500">{item.application_number} · {item.class_applied ?? "Class not selected"}</p><p className="mt-1 text-sm">{item.status}</p><div className="mt-2 flex flex-wrap gap-2">{["Under Review","Interview","Approved","Rejected"].map((status) => <button key={status} type="button" onClick={() => void updateAdmission(item.id, status)} className="rounded border px-2 py-1 text-xs">{status}</button>)}</div></article>)}{!admissions.length && <Empty text="No admission applications yet." />}</div></Card>
    </div>
    {notice && <p role="status" className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{notice}</p>}
  </section>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-blue-950">{title}</h3><div className="mt-4">{children}</div></section>; }
function Empty({ text }: { text: string }) { return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{text}</p>; }
