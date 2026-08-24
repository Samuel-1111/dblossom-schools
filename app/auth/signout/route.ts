import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { LOCAL_ADMIN_COOKIE } from "../../../utils/local-admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  response.cookies.delete(LOCAL_ADMIN_COOKIE);
  return response;
}
