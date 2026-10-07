'use client';

import { useState } from "react";

const primaryLinks = [
  ["Home", "#home"],
  ["About", "#about"],
  ["Academics", "#academics"],
  ["Gallery", "#gallery"],
  ["Events", "#events"],
] as const;

export function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <nav aria-label="Primary navigation" className="hidden items-center gap-5 text-sm text-slate-600 lg:flex">
        {primaryLinks.map(([label, href]) => <a key={href} href={href} className="transition hover:text-[var(--navy)]">{label}</a>)}
        <details className="relative">
          <summary className="cursor-pointer list-none transition hover:text-[var(--navy)]">Contact Us</summary>
          <div className="absolute right-0 top-8 z-30 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <a href="#contact" className="block rounded-lg px-3 py-2 hover:bg-slate-50">Contact Information</a>
            <a href="#feedback" className="block rounded-lg px-3 py-2 hover:bg-slate-50">Feedback & Complaints</a>
          </div>
        </details>
        <details className="relative">
          <summary className="cursor-pointer list-none transition hover:text-[var(--navy)]">Portal</summary>
          <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <a href="/student-portal" className="block rounded-lg px-3 py-2 hover:bg-slate-50">Student</a>
            <a href="/teacher-portal" className="block rounded-lg px-3 py-2 hover:bg-slate-50">Teacher</a>
          </div>
        </details>
      </nav>

      <button type="button" className="hidden rounded-md px-4 py-2 text-sm font-semibold lg:inline-flex" style={{ background: "var(--gold)", color: "var(--ink)" }} onClick={() => window.location.href = "/admissions"}>Enrol Now</button>

      <button type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 lg:hidden">{open ? "Close" : "Menu"}</button>

      {open && (
        <div className="absolute inset-x-0 top-20 border-b border-slate-200 bg-white p-4 shadow-lg lg:hidden">
          <nav aria-label="Mobile navigation" className="grid gap-1">
            {primaryLinks.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-slate-700 hover:bg-slate-100">{label}</a>)}
            <details className="rounded-md">
              <summary className="cursor-pointer rounded-md px-3 py-3 text-slate-700">Contact Us</summary>
              <div className="grid gap-1 pl-3">
                <a href="#contact" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">Contact Information</a>
                <a href="#feedback" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">Feedback & Complaints</a>
              </div>
            </details>
            <details className="rounded-md">
              <summary className="cursor-pointer rounded-md px-3 py-3 text-slate-700">Portal</summary>
              <div className="grid gap-1 pl-3">
                <a href="/student-portal" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">Student</a>
                <a href="/teacher-portal" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">Teacher</a>
              </div>
            </details>
            <a href="/admissions" onClick={() => setOpen(false)} className="mt-2 rounded-md px-4 py-3 text-center font-semibold" style={{ background: "var(--gold)", color: "var(--ink)" }}>Enrol Now</a>
          </nav>
        </div>
      )}
    </div>
  );
}
