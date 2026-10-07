import { createClient } from "./server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { authorized: false as const, supabase, user: null };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "super_admin"].includes(String(profile.role))) {
    return { authorized: false as const, supabase, user };
  }

  return { authorized: true as const, supabase, user };
}
