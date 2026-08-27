import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loginSource = readFileSync("app/portal-login/PortalLogin.tsx", "utf8");
const adminSource = readFileSync("app/admin-dashboard/AdminDashboardClient.tsx", "utf8");
const routeSource = readFileSync("app/api/portal-login/route.ts", "utf8");

describe("visible first-name portal credentials", () => {
  it("uses visible text inputs for portal and Admin password entry", () => {
    expect(loginSource).toContain('<input type="text" value={password}');
    expect(loginSource).not.toContain('<input type="password" value={password}');
    expect(adminSource).toContain('type="text" aria-label="Student password override"');
    expect(adminSource).toContain('type="text" aria-label="Teacher password override"');
    expect(adminSource).toContain('type="text" minLength={1} placeholder="Current Password"');
    expect(adminSource).not.toContain('type="password" aria-label="Student password override"');
    expect(adminSource).not.toContain('type="password" aria-label="Teacher password override"');
  });

  it("accepts the first-name rule case-insensitively and keeps short Teacher auth compatible", () => {
    expect(routeSource).toContain("authCompatiblePassword");
    expect(routeSource).toContain("validPasswords.some");
    expect(routeSource).toContain("login_password");
    expect(loginSource).toContain("resolved.login_password ?? password");
  });
});
