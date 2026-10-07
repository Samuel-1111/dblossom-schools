'use client';

import { FormEvent, useState } from "react";

export default function AdmissionsPage() {
  const [form, setForm] = useState({ applicant_name: "", date_of_birth: "", gender: "", class_applied: "", parent_name: "", parent_email: "", parent_phone: "", address: "" });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setNotice("");
    const response = await fetch("/api/admissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const payload = await response.json().catch(() => ({}));
    setNotice(response.ok ? `Application submitted successfully. Application number: ${payload.data?.application_number ?? "generated"}` : payload.error ?? "Application could not be submitted.");
    if (response.ok) setForm({ applicant_name: "", date_of_birth: "", gender: "", class_applied: "", parent_name: "", parent_email: "", parent_phone: "", address: "" });
    setLoading(false);
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-10 md:px-8"><section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">D'Blossom Model Private Schools</p><h1 className="mt-2 text-3xl font-bold text-blue-950">Online Admission Application</h1><p className="mt-2 text-sm text-slate-500">Complete the form and the school will review your application.</p><form onSubmit={submit} className="mt-8 grid gap-4 md:grid-cols-2"><input required placeholder="Applicant full name" value={form.applicant_name} onChange={(e) => setForm({ ...form, applicant_name: e.target.value })} className="rounded border p-3 md:col-span-2" /><input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="rounded border p-3" /><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="rounded border p-3"><option value="">Gender</option><option>Male</option><option>Female</option></select><input placeholder="Class applying for" value={form.class_applied} onChange={(e) => setForm({ ...form, class_applied: e.target.value })} className="rounded border p-3" /><input required placeholder="Parent/Guardian full name" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} className="rounded border p-3" /><input type="email" placeholder="Parent email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} className="rounded border p-3" /><input required placeholder="Parent phone" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} className="rounded border p-3" /><input placeholder="Home address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded border p-3" /><button disabled={loading} className="rounded bg-blue-900 px-4 py-3 font-semibold text-white md:col-span-2">{loading ? "Submitting…" : "Submit Application"}</button></form>{notice && <p role="status" className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{notice}</p>}<a href="/" className="mt-6 inline-block text-sm font-semibold text-blue-900">Back to school website</a></section></main>;
}
