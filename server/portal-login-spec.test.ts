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
    expect(routeSource).toContain("record.password !== password");
    expect(routeSource).toContain("profile_id: user.id");
  });

  it("renders the required shared portal structure", () => {
    expect(source).toContain("Back to Home");
    expect(source).toContain("bg-[var(--navy)]");
    expect(source).toContain("font-heading");
    expect(source).toContain("rounded-2xl");
  });
});
