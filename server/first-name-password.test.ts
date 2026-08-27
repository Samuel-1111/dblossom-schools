import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { firstNameFromFullName } from "../shared/school";

const portalRoute = readFileSync("app/api/portal-login/route.ts", "utf8");
const adminSource = readFileSync("app/admin-dashboard/AdminDashboardClient.tsx", "utf8");
const studentRefresh = readFileSync("scripts/refresh-student-first-name-passwords.mjs", "utf8");
const teacherRefresh = readFileSync("scripts/refresh-teacher-first-name-passwords.mjs", "utf8");

describe("first-name portal password specification", () => {
  it("derives the given first-name token from uploaded surname-first names", () => {
    expect(firstNameFromFullName("Onigbinde Nifemi")).toBe("Nifemi");
    expect(firstNameFromFullName("Oparinde Olaide M.")).toBe("Olaide");
    expect(firstNameFromFullName("SingleName")).toBe("SingleName");
  });

  it("uses first-name fallback verification for both portal roles", () => {
    expect(portalRoute).toContain("firstNameFromFullName");
    expect(portalRoute).toContain('role === "student" ? [firstName]');
    expect(studentRefresh).toContain("password: firstName(fullName)");
    expect(teacherRefresh).toContain("password: firstName(fullName)");
  });

  it("documents the Admin optional override and default behavior", () => {
    expect(adminSource).toContain("Optional new password (default: first name)");
    expect(adminSource).toContain("Optional override (default: first name)");
    expect(adminSource).toContain("Leave blank to use the student&apos;s first name");
    expect(adminSource).toContain("Leave blank to use the teacher&apos;s first name");
    expect(adminSource).toContain("passwordForNewStudent");
    expect(adminSource).toContain("passwordForNewTeacher");
  });
});
