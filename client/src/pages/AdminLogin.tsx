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
  return <div className="flex min-h-screen items-center justify-center bg-[#0f1f3d] p-4"><Link href="/" className="absolute left-5 top-5 flex items-center gap-2 text-sm text-white/70 hover:text-white"><Home size={16} /> Back to Home</Link><Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"><CardHeader className="text-center"><div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-[#f5a623] text-[#0f1f3d]"><ShieldCheck size={28} /></div><CardTitle className="font-serif text-3xl text-[#0f1f3d]">Admin Login</CardTitle><p className="text-sm text-slate-500">School Management System</p></CardHeader><CardContent><form className="space-y-5" onSubmit={submit}><div><label className="mb-2 block text-sm font-medium">Username</label><Input className={errors.username ? "border-red-500 focus-visible:ring-red-500" : ""} value={form.username} onChange={(e) => { setForm({ ...form, username: e.target.value }); setErrors({ ...errors, username: undefined }); }} />{errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}</div><div><label className="mb-2 block text-sm font-medium">Password</label><Input type="password" className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""} value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: undefined }); }} />{errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}</div><Button className="w-full bg-[#0f1f3d] text-white hover:bg-[#173b49]"><LockKeyhole size={16} /> Login to Dashboard</Button></form></CardContent></Card></div>;
}
