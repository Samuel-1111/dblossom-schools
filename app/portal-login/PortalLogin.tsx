'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, GraduationCap, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "../../utils/supabase/client";

type PortalRole = "student" | "teacher" | "admin";

type PortalLoginProps = {
  role: PortalRole;
  title: string;
  hint: string;
  identifierLabel: string;
  identifierPlaceholder: string;
};

const errorCopy: Record<PortalRole, { notFound: string; wrongPassword: string }> = {
  student: { notFound: "Admission number not found", wrongPassword: "Incorrect password" },
  teacher: { notFound: "Staff ID not found", wrongPassword: "Incorrect password" },
  admin: { notFound: "Username not recognised", wrongPassword: "Incorrect password" },
};

const portalSubtitle: Record<PortalRole, string> = {
  student: "Access your results and academic records",
  teacher: "Access your class management tools",
  admin: "School Management System",
};

function PortalIcon({ role }: { role: PortalRole }) {
  if (role === "student") return <GraduationCap className="h-12 w-12 text-[var(--gold)]" aria-hidden="true" />;
  if (role === "teacher") return <Users className="h-12 w-12 text-[var(--gold)]" aria-hidden="true" />;
  return <Shield className="h-8 w-8 text-[var(--navy)]" aria-hidden="true" />;
}

export function PortalLogin({ role, title, hint, identifierLabel, identifierPlaceholder }: PortalLoginProps) {
  const router = useRouter();
  const supabase = createClient();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  function clearField(field: "identifier" | "password") {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) nextErrors.identifier = role === "admin" ? "Username is required" : `${identifierLabel} is required`;
    if (!password) nextErrors.password = "Password is required";
    if (nextErrors.identifier || nextErrors.password) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    setFieldErrors({});
    const normalizedIdentifier = identifier.trim();

    try {
      if (role === "admin") {
        const response = await fetch("/api/admin-login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ identifier: normalizedIdentifier, password }),
        });
        if (!response.ok) {
          const error = normalizedIdentifier.toLowerCase() !== "divineblossom" ? errorCopy.admin.notFound : errorCopy.admin.wrongPassword;
          setFieldErrors(normalizedIdentifier.toLowerCase() !== "divineblossom" ? { identifier: error } : { password: error });
          toast.error(`${error}. Please try again.`);
          return;
        }
        toast.success("Welcome, Admin!");
        router.push("/admin-dashboard");
        router.refresh();
        return;
      }

      const { data: resolved, error: resolveError } = await supabase.rpc("resolve_portal_login", {
        identifier: normalizedIdentifier,
        portal_type: role,
      });
      const loginEmail = resolveError ? null : (resolved?.[0]?.login_email ?? null);
      if (!loginEmail) {
        setFieldErrors({ identifier: errorCopy[role].notFound });
        toast.error(`${errorCopy[role].notFound}. Please check your ${role === "student" ? "admission number" : "staff ID"}.`);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (signInError) {
        setFieldErrors({ password: errorCopy[role].wrongPassword });
        toast.error(`${errorCopy[role].wrongPassword}. Please try again.`);
        return;
      }

      toast.success(`Welcome to the ${role} portal!`);
      router.push(`/${role}-dashboard`);
      router.refresh();
    } catch {
      toast.error("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (hasError: boolean) => `rounded-md border px-3 py-3 font-normal outline-none transition focus-visible:ring-2 ${hasError ? "border-red-500 focus-visible:ring-red-500" : "border-[hsl(220_15%_90%)] focus-visible:border-[var(--navy)] focus-visible:ring-[var(--navy)]"}`;

  return (
    <main className="min-h-screen bg-[hsl(220_15%_95%)] font-body">
      <section className="bg-[var(--navy)] px-4 py-16 text-center md:py-24">
        <a href="/" className="mx-auto mb-8 flex w-fit items-center gap-2 text-sm text-white/70 transition hover:text-white"><Home className="h-4 w-4" />Back to Home</a>
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/10"><PortalIcon role={role} /></div>
        <h1 className="font-heading text-4xl font-bold text-white md:text-5xl">{title}</h1>
        <p className="mt-3 text-white/70">{portalSubtitle[role]}</p>
      </section>
      <section className="mx-auto -mt-8 w-full max-w-md px-4 pb-12">
        <div className="rounded-2xl border border-[hsl(220_15%_90%)] bg-white p-8 shadow-lg">
          <img src="/manus-storage/school-logo_15e2310a.jpg" alt="D'Blossom Model Private Schools" className="mx-auto mb-4 h-16 w-16 rounded-full object-cover" />
          <h2 className="font-heading text-2xl font-bold text-[var(--navy)]">{role === "admin" ? "Admin Login" : `${role === "student" ? "Student" : "Teacher"} Login`}</h2>
          <p className="mt-1 text-sm text-slate-500">{role === "admin" ? hint : role === "student" ? "Secondary School Only (JSS1 – SS3)" : "Sign in to manage your assigned classes."}</p>
          <form onSubmit={submit} className="mt-7 grid gap-5" noValidate>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">{identifierLabel}<input value={identifier} onChange={(event) => { setIdentifier(event.target.value); clearField("identifier"); }} className={inputClass(Boolean(fieldErrors.identifier))} placeholder={identifierPlaceholder} autoComplete="username" aria-invalid={Boolean(fieldErrors.identifier)} />{fieldErrors.identifier && <span className="text-xs text-red-500">{fieldErrors.identifier}</span>}</label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">Password<input type="password" value={password} onChange={(event) => { setPassword(event.target.value); clearField("password"); }} className={inputClass(Boolean(fieldErrors.password))} autoComplete="current-password" aria-invalid={Boolean(fieldErrors.password)} />{fieldErrors.password && <span className="text-xs text-red-500">{fieldErrors.password}</span>}</label>
            <button type="submit" disabled={loading} className="rounded-md bg-[var(--navy)] px-4 py-3 font-semibold text-white transition active:scale-[0.98] disabled:opacity-60">{loading ? "Logging in…" : role === "admin" ? "Login to Dashboard" : "Login"}</button>
          </form>
          <a href="/" className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 transition hover:text-[var(--navy)]"><Home className="h-4 w-4" />Back to Home</a>
        </div>
      </section>
    </main>
  );
}
