// This module is imported only by server-side routes and storage adapters.
// Avoid a `server-only` package import so the same helpers remain testable in Vitest
// and runnable in a plain Node.js download outside the Next.js bundler.
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is incomplete");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
