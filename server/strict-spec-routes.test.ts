import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), "utf8");

describe("secured portal specification route contracts", () => {
  it("keeps the required local login copy and identifiers", () => {
    const login = read("app/portal-login/PortalLogin.tsx") + read("app/student-portal/page.tsx") + read("app/teacher-portal/page.tsx") + read("app/admin-login/page.tsx");
    expect(login).toContain("Back to Home");
    expect(login).toContain("Logging in…");
    expect(login).toContain("Admission Number");
    expect(login).toContain("Staff ID");
    expect(login).toContain("Username");
    expect(login).toContain("Password");
  });

  it("keeps student result filtering and PDF download contracts", () => {
    const student = read("app/student-dashboard/StudentDashboardClient.tsx") + read("app/student-portal/page.tsx");
    expect(student).toContain("Results");
    expect(student).toContain("Download Result (PDF)");
    expect(student).toContain("No results recorded for this selection.");
    expect(student).toContain("term");
    expect(student).toContain("session");
  });

  it("keeps teacher assigned-class result entry and save-state contracts", () => {
    const teacher = read("app/teacher-dashboard/TeacherDashboardClient.tsx") + read("app/teacher-portal/page.tsx");
    expect(teacher).toContain("Upload Result");
    expect(teacher).toContain("Saving Result…");
    expect(teacher).toContain("Select student");
    expect(teacher).toContain("Save Result");
    expect(teacher).toContain("assigned class");
    expect(teacher).toContain("assignedClass");
  });

  it("keeps the Admin Results table and nine-module navigation contract", () => {
    const admin = read("app/admin-dashboard/AdminDashboardClient.tsx");
    expect(admin).toContain("Student");
    expect(admin).toContain("Average");
    expect(admin).toContain("Results");
    for (const label of ["Students", "Teachers", "Payments", "Events", "Gallery", "Complaints", "Subjects", "Settings"]) {
      expect(admin).toContain(label);
    }
  });
});
