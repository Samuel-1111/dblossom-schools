'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, GraduationCap, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "../../utils/supabase/client";

type PortalRole = "student" | "teacher" | "parent" | "admin";

const schoolLogoUrl = "/manus-storage/school-logo_57ffb7b0.jpg";

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
  parent: { notFound: "Parent account not found", wrongPassword: "Incorrect password" },
};

const portalSubtitle: Record<PortalRole, string> = {
  student: "Access your results and academic records",
  teacher: "Access your class management tools",
  admin: "School Management System",
  parent: "Stay connected with your child's school",
};

function PortalIcon({ role }: { role: PortalRole }) {
  if (role === "student") return <GraduationCap className="h-12 w-12 text-[var(--gold)]" aria-hidden="true" />;
  if (role === "parent") return <Users className="h-12 w-12 text-[var(--gold)]" aria-hidden="true" />;
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
    if (!identifier.trim()) nextErrors.identifier = role === "admin" ? "Admin email is required" : `${identifierLabel} is required`;
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
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedIdentifier, password });
        if (error || !data.user) {
          const message = error?.message?.toLowerCase().includes("invalid login credentials")
            ? errorCopy.admin.wrongPassword
            : "Unable to sign in right now. Please try again.";
          setFieldErrors({ password: message });
          toast.error(message);
          return;
        }
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
        if (!profile || !["admin", "super_admin"].includes(String(profile.role))) {
          await supabase.auth.signOut();
          const message = "This account is not authorised for the administrator portal.";
          setFieldErrors({ identifier: message });
          toast.error(message);
          return;
        }
        toast.success("Welcome, Admin!");
        router.push("/admin-dashboard");
        router.refresh();
        return;
      }

      const response = await fetch("/api/portal-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, identifier: normalizedIdentifier, password }),
      });
      const resolved = await response.json().catch(() => ({})) as { login_email?: string; local_session?: boolean; error?: string };
      const loginEmail = response.ok ? resolved.login_email : null;
      if (!loginEmail) {
        const missingIdentifier = response.status === 404;
        const error = missingIdentifier ? errorCopy[role].notFound : response.status === 401 ? errorCopy[role].wrongPassword : (resolved.error ?? "Unable to sign in right now");
        setFieldErrors(missingIdentifier ? { identifier: error } : { password: error });
        toast.error(missingIdentifier ? `${error}. Please check your ${role === "student" ? "admission number" : role === "parent" ? "parent email or phone" : "staff ID"}.` : `${error}. Please try again.`);
        return;
      }

      if (role === "student" && resolved.local_session) {
        toast.success("Welcome to the student portal!");
        router.push("/student-dashboard");
        router.refresh();
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

  const inputClass = (hasError: boolean) => `rounded-md border px-3 py-3 font-normal outline-none transition focus-visible:ring-2 ${hasError ? "border-red-500 focus-visible:ring-red-500" : "border-border focus-visible:border-primary focus-visible:ring-primary"}`;

  return (
    <main className="min-h-screen bg-secondary/30 font-body">
      <section className="bg-primary px-4 py-16 text-center md:py-24">
        <a href="/" className="mx-auto mb-8 flex w-fit items-center gap-2 text-sm text-primary-foreground/70 transition hover:text-primary-foreground"><Home className="h-4 w-4" />Back to Home</a>
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/10"><PortalIcon role={role} /></div>
        <h1 className="font-heading text-4xl font-bold text-primary-foreground md:text-5xl">{title}</h1>
        <p className="mt-3 text-primary-foreground/70">{portalSubtitle[role]}</p>
      </section>
      <section className="mx-auto -mt-8 w-full max-w-md px-4 pb-12">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          <img src={schoolLogoUrl} alt="D'Blossom Model Private Schools" className="mx-auto mb-4 h-16 w-16 rounded-full object-cover" />
          <h2 className="font-heading text-2xl font-bold text-[var(--navy)]">{role === "admin" ? "Admin Login" : `${role === "student" ? "Student" : role === "parent" ? "Parent" : "Teacher"} Login`}</h2>
          <p className="mt-1 text-sm text-slate-500">{hint}</p>
          <form onSubmit={submit} className="mt-7 grid gap-5" noValidate>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">{identifierLabel}<input value={identifier} onChange={(event) => { setIdentifier(event.target.value); clearField("identifier"); }} className={inputClass(Boolean(fieldErrors.identifier))} placeholder={identifierPlaceholder} autoComplete="username" aria-invalid={Boolean(fieldErrors.identifier)} />{fieldErrors.identifier && <span className="text-xs text-red-500">{fieldErrors.identifier}</span>}</label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">Password<input type="password" value={password} onChange={(event) => { setPassword(event.target.value); clearField("password"); }} className={inputClass(Boolean(fieldErrors.password))} autoComplete="current-password" aria-invalid={Boolean(fieldErrors.password)} />{fieldErrors.password && <span className="text-xs text-red-500">{fieldErrors.password}</span>}</label>
            <button type="submit" disabled={loading} className="rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60">{loading ? "Logging in…" : role === "admin" ? "Login to Dashboard" : "Login"}</button>
          </form>
          <a href="/" className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 transition hover:text-[var(--navy)]"><Home className="h-4 w-4" />Back to Home</a>
        </div>
      </section>
    </main>
  );
}
