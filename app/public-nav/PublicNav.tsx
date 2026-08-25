'use client';

import { useState } from "react";

const links = [["About", "#about"], ["Academics", "#academics"], ["Gallery", "#gallery"], ["Events", "#events"], ["Payment", "#payment"], ["Complaint", "#complaint"]] as const;

export function PublicNav() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 lg:hidden">{open ? "Close" : "Menu"}</button>
    {open && <div className="absolute inset-x-0 top-20 border-b border-slate-200 bg-white p-4 shadow-lg lg:hidden"><nav aria-label="Mobile navigation" className="grid gap-2">{links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-slate-700 hover:bg-slate-100">{label}</a>)}<a href="/student-portal" className="rounded-md px-3 py-3 text-white" style={{ background: "var(--navy)" }}>Student Portal</a><a href="/teacher-portal" className="rounded-md px-3 py-3 text-slate-900 hover:bg-slate-100">Teacher Portal</a><a href="/admin-login" className="rounded-md px-3 py-3" style={{ background: "var(--gold)" }}>Admin</a></nav></div>}
  </>;
}
