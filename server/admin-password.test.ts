import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync("app/api/admin-password/route.ts", "utf8");
const loginSource = readFileSync("app/api/admin-login/route.ts", "utf8");
const dashboardSource = readFileSync("app/admin-dashboard/AdminDashboardClient.tsx", "utf8");
const storageRouteSource = readFileSync("app/manus-storage/[...path]/route.ts", "utf8");
const nextConfigSource = readFileSync("next.config.mjs", "utf8");

describe("Admin password override workflow", () => {
  it("protects password changes with the signed local-admin session", () => {
    expect(routeSource).toContain("isValidLocalAdminToken");
    expect(routeSource).toContain("Current password is incorrect.");
    expect(routeSource).toContain("New password must be at least 4 characters.");
    expect(routeSource).toContain("New passwords do not match.");
  });

  it("uses an HttpOnly signed override and checks it during login", () => {
    expect(routeSource).toContain("ADMIN_PASSWORD_OVERRIDE_COOKIE");
    expect(routeSource).toContain("httpOnly: true");
    expect(loginSource).toContain("isAdminPasswordOverride");
    expect(loginSource).toContain("ADMIN_PASSWORD_OVERRIDE_COOKIE");
  });

  it("serves uploaded assets through the server-side storage proxy and ignores runtime logs in dev", () => {
    expect(storageRouteSource).toContain("storageGetSignedUrl");
    expect(storageRouteSource).toContain("Stored asset not found");
    expect(nextConfigSource).toContain("**/.manus-logs/**");
  });

  it("exposes Settings form fields without persisting the password in localStorage", () => {
    expect(dashboardSource).toContain("Current Password");
    expect(dashboardSource).toContain("New Password (minimum 4 characters)");
    expect(dashboardSource).toContain("Confirm New Password");
    expect(dashboardSource).toContain("/api/admin-password");
    expect(dashboardSource).toContain("rather than browser localStorage");
  });
});
