export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import { AdminDashboardClient } from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "super_admin"].includes(String(profile.role))) redirect("/");

  return <AdminDashboardClient fullName={profile.full_name ?? user.email ?? "Administrator"} />;
}
