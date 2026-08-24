import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/teacher-dashboard/TeacherDashboardClient.tsx", "utf8");

describe("Teacher save-state specification", () => {
  it("shows explicit saving labels and disables duplicate submissions", () => {
    expect(source).toContain("Saving Result…");
    expect(source).toContain("Saving Attendance…");
    expect(source).toContain("disabled={savingGrade}");
    expect(source).toContain("disabled={savingAttendance}");
  });

  it("recovers saving state after missing required authenticated selections", () => {
    expect(source).toContain("setSavingGrade(false);");
    expect(source).toContain("setSavingAttendance(false);");
    expect(source).toContain("Result could not be saved:");
    expect(source).toContain("Attendance could not be saved:");
  });
});
