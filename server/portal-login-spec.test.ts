import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/portal-login/PortalLogin.tsx", "utf8");
const routeSource = readFileSync("app/api/portal-login/route.ts", "utf8");

describe("shared portal login specification", () => {
  it("contains role-specific labels, loading copy, and validation feedback", () => {
    expect(source).toContain("Admission number not found");
    expect(source).toContain("Staff ID not found");
    expect(source).toContain("Username is required");
    expect(source).toContain("Logging in…");
    expect(source).toContain("border-red-500 focus-visible:ring-red-500");
  });

  it("keeps server-side administrator authentication and uses local credential resolution for portals", () => {
    expect(source).toContain('fetch("/api/admin-login"');
    expect(source).toContain('fetch("/api/portal-login"');
    expect(source).not.toContain('supabase.rpc("resolve_portal_login"');
    expect(source).toContain('toast.success("Welcome, Admin!")');
    expect(routeSource).toContain('role === "student" ? "admission_number" : "staff_id"');
    expect(routeSource).toContain("fallbackPasswords");
    expect(routeSource).toContain("firstNameFromFullName");
    expect(routeSource).toContain('role === "student" ? [firstName]');
    expect(routeSource).toContain("candidates.flatMap");
    expect(routeSource).toContain("createLocalStudentToken");
    expect(routeSource).toContain("local_session: true");
    expect(source).toContain("resolved.local_session");
    expect(routeSource).toContain("validPasswords.includes(password)");
    expect(routeSource).toContain('status: 404');
    expect(routeSource).toContain('status: 401');
    expect(routeSource).toContain("profile_id: user.id");
    expect(routeSource).toContain('select("id,student_number,full_name,status")');
    expect(source).toContain("/manus-storage/school-logo_57ffb7b0.jpg");
    expect(readFileSync("app/teacher-portal/page.tsx", "utf8")).toContain("Staff ID or email");
  });

  it("renders the required shared portal structure", () => {
    expect(source).toContain("Back to Home");
    expect(source).toContain("bg-primary");
    expect(source).toContain("font-heading");
    expect(source).toContain("rounded-2xl");
  });

  it("uses the student name in the downloaded report filename", () => {
    const reportSource = readFileSync("app/student-dashboard/StudentDashboardClient.tsx", "utf8");
    expect(reportSource).toContain("safeFilenamePart");
    expect(reportSource).toContain("d-blossom-report-card-${safeFilenamePart(fullName)}");
  });
});
