'use client';

import { FormEvent, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { toast } from "sonner";

export function PublicSubmissions({ section = "both" }: { section?: "payment" | "complaint" | "both" }) {
  const supabase = createClient();
  const [payment, setPayment] = useState({ studentName: "", className: "", amount: "", paymentDate: new Date().toISOString().slice(0, 10) });
  const [complaint, setComplaint] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [complaintSaving, setComplaintSaving] = useState(false);

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    if (paymentSaving) return;
    setPaymentSaving(true);
    const { error } = await supabase.from("payments").insert({ student_name: payment.studentName.trim(), class_name: payment.className.trim(), amount: Number(payment.amount), payment_date: payment.paymentDate, status: "Pending" });
    setPaymentSaving(false);
    if (error) return toast.error(`Payment notification failed: ${error.message}`);
    toast.success("Payment notification submitted. Please send your proof by WhatsApp for confirmation.");
    setPayment((current) => ({ ...current, studentName: "", className: "", amount: "" }));
  }

  async function submitComplaint(event: FormEvent) {
    event.preventDefault();
    if (complaintSaving) return;
    setComplaintSaving(true);
    const { error } = await supabase.from("complaints").insert({ name: complaint.name.trim(), email: complaint.email.trim(), phone: complaint.phone.trim() || null, subject: complaint.subject.trim(), message: complaint.message.trim(), status: "New" });
    setComplaintSaving(false);
    if (error) return toast.error(`Message could not be sent: ${error.message}`);
    toast.success("Your message has been sent to the school.");
    setComplaint({ name: "", email: "", phone: "", subject: "", message: "" });
  }

  return <div className={section === "both" ? "grid gap-8 lg:grid-cols-2" : "block"}>
    {(section === "payment" || section === "both") && <form onSubmit={submitPayment} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold" style={{ color: "var(--navy)" }}>Notify the school after payment</h3>
      <p className="mt-2 text-sm text-slate-600">Submit the payment details, then send your proof to the school WhatsApp number for confirmation.</p>
      <div className="mt-5 grid gap-3"><input required aria-label="Student name" placeholder="Student name" value={payment.studentName} onChange={(event) => setPayment({ ...payment, studentName: event.target.value })} className="rounded border p-3" /><input required aria-label="Class" placeholder="Class" value={payment.className} onChange={(event) => setPayment({ ...payment, className: event.target.value })} className="rounded border p-3" /><input required min="1" type="number" aria-label="Amount" placeholder="Amount" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} className="rounded border p-3" /><input required type="date" aria-label="Payment date" value={payment.paymentDate} onChange={(event) => setPayment({ ...payment, paymentDate: event.target.value })} className="rounded border p-3" /><button disabled={paymentSaving} className="rounded bg-amber-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{paymentSaving ? "Submitting…" : "Submit Payment Notification"}</button></div>
    </form>}
    {(section === "complaint" || section === "both") && <form onSubmit={submitComplaint} className="rounded-2xl border border-slate-700 bg-slate-950 p-6 text-white shadow-sm">
      <h3 className="text-xl font-semibold">We are ready to listen.</h3>
      <p className="mt-2 text-sm text-slate-300">Send a question, concern, or suggestion to the school administration.</p>
      <div className="mt-5 grid gap-3"><input required aria-label="Your name" placeholder="Your name" value={complaint.name} onChange={(event) => setComplaint({ ...complaint, name: event.target.value })} className="rounded border border-slate-600 bg-white p-3 text-slate-900" /><input required type="email" aria-label="Email address" placeholder="Email address" value={complaint.email} onChange={(event) => setComplaint({ ...complaint, email: event.target.value })} className="rounded border border-slate-600 bg-white p-3 text-slate-900" /><input aria-label="Phone number" placeholder="Phone number (optional)" value={complaint.phone} onChange={(event) => setComplaint({ ...complaint, phone: event.target.value })} className="rounded border border-slate-600 bg-white p-3 text-slate-900" /><input required aria-label="Subject" placeholder="Subject" value={complaint.subject} onChange={(event) => setComplaint({ ...complaint, subject: event.target.value })} className="rounded border border-slate-600 bg-white p-3 text-slate-900" /><textarea required aria-label="Message" placeholder="Your message" rows={4} value={complaint.message} onChange={(event) => setComplaint({ ...complaint, message: event.target.value })} className="rounded border border-slate-600 bg-white p-3 text-slate-900" /><button disabled={complaintSaving} className="rounded bg-amber-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{complaintSaving ? "Sending…" : "Send Message"}</button></div>
    </form>}
  </div>;
}
