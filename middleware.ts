import { type NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/admin-dashboard/:path*",
    "/teacher-dashboard/:path*",
    "/student-dashboard/:path*",
    "/parent-dashboard/:path*",
    "/api/admin/:path*",
  ],
};
