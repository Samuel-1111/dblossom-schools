export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import { isValidLocalAdminToken, LOCAL_ADMIN_COOKIE } from "../../utils/local-admin";
import { AdminDashboardClient } from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const localAdmin = await isValidLocalAdminToken(cookieStore.get(LOCAL_ADMIN_COOKIE)?.value);
  if (localAdmin) return <AdminDashboardClient fullName="D'Blossom Administrator" />;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  return <AdminDashboardClient fullName={profile.full_name ?? user.email ?? "Administrator"} />;
}
