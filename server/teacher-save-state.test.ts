import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/teacher-dashboard/TeacherDashboardClient.tsx", "utf8");
const pageSource = readFileSync("app/teacher-dashboard/page.tsx", "utf8");

describe("Teacher save-state specification", () => {
  it("shows explicit saving labels and disables duplicate submissions", () => {
    expect(source).toContain("Saving Result…");
    expect(source).toContain("Saving Attendance…");
    expect(source).toContain("disabled={savingGrade}");
    expect(source).toContain("disabled={savingAttendance}");
    expect(source).toContain("This workspace is view-only because no class is assigned");
    expect(source).toContain("canUpload");
    expect(pageSource).toContain("const canUpload = /class teacher/i.test(portalRole)");
  });

  it("recovers saving state after missing required authenticated selections", () => {
    expect(source).toContain("setSavingGrade(false);");
    expect(source).toContain("setSavingAttendance(false);");
    expect(source).toContain("Result could not be saved:");
    expect(source).toContain("Academic session (e.g. 2025/2026)");
    expect(source).toContain("Enter an academic session before saving the result.");
    expect(source).toContain("session, score, max_score");
    expect(source).toContain("Attendance could not be saved:");
  });
});
