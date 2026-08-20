'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type PortalRole = "student" | "teacher" | "admin";

export function PortalLogin({ role, title, hint }: { role: PortalRole; title: string; hint: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("The email or password is incorrect. Please try again.");
      setLoading(false);
      return;
    }
    router.push(`/${role}-dashboard`);
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <a href="/" className="text-sm font-semibold" style={{ color: "var(--red)" }}>← Back to D'Blossom</a>
        <h1 className="mt-8 text-4xl" style={{ color: "var(--navy)" }}>{title}</h1>
        <p className="mt-3 text-slate-600">{hint}</p>
        <form onSubmit={submit} className="mt-8 grid gap-5">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-md border border-slate-300 px-3 py-3 font-normal outline-none focus:border-blue-900" autoComplete="email" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-md border border-slate-300 px-3 py-3 font-normal outline-none focus:border-blue-900" autoComplete="current-password" /></label>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="rounded-md px-4 py-3 font-semibold text-white disabled:opacity-60" style={{ background: "var(--navy)" }}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">Need access? Contact the school administrator.</p>
      </section>
    </main>
  );
}
