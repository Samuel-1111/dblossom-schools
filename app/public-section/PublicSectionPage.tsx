import Link from "next/link";
import type { ReactNode } from "react";

const sections = [
  ["About", "/about"], ["Academics", "/academics"], ["Gallery", "/gallery"], ["Events", "/events"], ["Payment", "/payment"], ["Complaint", "/complaint"],
] as const;

export function PublicSectionPage({ title, eyebrow, intro, children }: { title: string; eyebrow: string; intro: string; children?: ReactNode }) {
  return <main className="min-h-screen bg-white text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold text-blue-950"><img src="/manus-storage/school-logo_15e2310a.jpg" alt="D&apos;Blossom Model Private Schools" className="h-9 w-9 rounded-full object-cover" />D&apos;Blossom</Link>
        <nav aria-label="Public information" className="hidden gap-4 text-sm font-semibold text-slate-700 md:flex">{sections.map(([label, href]) => <Link key={href} href={href} className="transition-colors hover:text-blue-900">{label}</Link>)}</nav>
        <div className="flex gap-2"><Link href="/student-portal" className="rounded-md bg-blue-950 px-3 py-2 text-sm font-bold text-white">Student Portal</Link><Link href="/admin-login" className="rounded-md bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950">Admin</Link></div>
      </div>
    </header>
    <section className="bg-blue-950 px-5 py-16 text-white"><div className="mx-auto max-w-5xl"><p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-300">{eyebrow}</p><h1 className="font-serif text-4xl font-bold md:text-6xl">{title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-blue-100">{intro}</p></div></section>
    <section className="mx-auto grid max-w-5xl gap-8 px-5 py-12 md:grid-cols-[1fr_0.7fr]">{children ?? <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><h2 className="font-serif text-2xl font-bold text-blue-950">D&apos;Blossom Model Private Schools</h2><p className="mt-4 leading-7 text-slate-600">We nurture capable, kind, and confident learners through disciplined teaching, purposeful activities, and a caring school community.</p><Link href="/#about" className="mt-6 inline-flex rounded-md bg-amber-400 px-4 py-3 font-bold text-slate-950">Return to homepage</Link></div>}{children && <aside className="rounded-2xl bg-slate-50 p-6"><h2 className="font-serif text-2xl font-bold text-blue-950">Explore D&apos;Blossom</h2><p className="mt-3 leading-7 text-slate-600">Use the public navigation to learn more, or sign in to a portal for school records.</p><Link href="/" className="mt-6 inline-flex rounded-md bg-blue-950 px-4 py-3 font-bold text-white">Back to Home</Link></aside>}</section>
  </main>;
}
