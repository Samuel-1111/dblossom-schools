'use client';

import { useState } from "react";

export default function AdmissionStatusPage() {
  const [number, setNumber] = useState("");
  const [contact, setContact] = useState("");
  const [result, setResult] = useState<any>(null);
  const [notice, setNotice] = useState("");

  async function check() {
    setNotice(""); setResult(null);
    const response = await fetch("/api/admissions?application=" + encodeURIComponent(number.trim()) + "&contact=" + encodeURIComponent(contact.trim()));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return setNotice(payload.error ?? "Application could not be found.");
    setResult(payload.data);
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-12"><section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Admissions</p><h1 className="mt-2 text-3xl font-bold text-blue-950">Track Application</h1><div className="mt-6 grid gap-3"><input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Application number" className="rounded border p-3" /><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Parent email or phone" className="rounded border p-3" /><button onClick={() => void check()} className="rounded bg-blue-900 px-4 py-3 font-semibold text-white">Check Application</button></div>{notice && <p className="mt-4 rounded bg-slate-50 p-4 text-sm text-slate-600">{notice}</p>}{result && <div className="mt-5 rounded-xl bg-slate-50 p-5"><p className="font-semibold">{result.applicant_name}</p><p className="mt-1 text-sm text-slate-500">{result.application_number} · {result.class_applied ?? "Class not selected"}</p><p className="mt-4 text-lg font-bold text-blue-950">{result.status}</p>{result.interview_date && <p className="mt-2 text-sm text-slate-600">Interview: {new Date(result.interview_date).toLocaleString()}</p>}</div>}</section></main>;
}
