import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ADMIN_USERNAME = "DivineBlossom";
const ADMIN_DEFAULT_PASSWORD = "DBMS";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!form.username) next.username = "Username is required";
    if (!form.password) next.password = "Password is required";
    if (Object.keys(next).length) return setErrors(next);
    if (form.username !== ADMIN_USERNAME) { setErrors({ username: "Username not recognised" }); return toast.error("Username not recognised. Please check your username."); }
    if (form.password !== (localStorage.getItem("admin_password") || ADMIN_DEFAULT_PASSWORD)) { setErrors({ password: "Incorrect password" }); return toast.error("Incorrect password. Please try again."); }
    localStorage.setItem("admin_logged_in", "true"); toast.success("Welcome, Admin!"); navigate("/admin-dashboard");
  };
  return <div className="flex min-h-screen items-center justify-center bg-primary p-4"><Link href="/" className="absolute left-5 top-5 flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground"><Home size={16} /> Back to Home</Link><Card className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm"><CardHeader className="p-0 text-center"><div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full bg-gold text-gold-foreground"><ShieldCheck size={28} /></div><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole size={22} /></div><CardTitle className="font-heading text-2xl font-bold text-primary">Admin Login</CardTitle><p className="text-sm text-muted-foreground">School Management System</p></CardHeader><CardContent className="p-0 pt-6"><form className="space-y-5" onSubmit={submit}><div><label className="mb-2 block text-sm font-medium">Username</label><Input aria-invalid={Boolean(errors.username)} className={errors.username ? "field-invalid" : ""} value={form.username} onChange={(e) => { setForm({ ...form, username: e.target.value }); setErrors({ ...errors, username: undefined }); }} />{errors.username && <p className="field-error">{errors.username}</p>}</div><div><label className="mb-2 block text-sm font-medium">Password</label><Input aria-invalid={Boolean(errors.password)} type="password" className={errors.password ? "field-invalid" : ""} value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: undefined }); }} />{errors.password && <p className="field-error">{errors.password}</p>}</div><Button className="w-full bg-primary text-primary-foreground"><LockKeyhole size={16} /> Login to Dashboard</Button></form></CardContent></Card></div>;
}
