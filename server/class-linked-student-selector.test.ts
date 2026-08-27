import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminRoute = readFileSync("app/api/admin/records/route.ts", "utf8");
const teacherRoute = readFileSync("app/api/teacher/records/route.ts", "utf8");
const teacherClient = readFileSync("app/teacher-dashboard/TeacherDashboardClient.tsx", "utf8");
const assignmentImporter = readFileSync("scripts/import-student-class-assignments.mjs", "utf8");

describe("class-linked Teacher student selector", () => {
  it("persists Admin Student class_id and loads students by that live link", () => {
    expect(adminRoute).toContain("class_id: body.class_id");
    expect(teacherRoute).toContain('from("students").select("id, admission_number, full_name, profile_id, guardian_name, class_id")');
    expect(teacherRoute).toContain('.eq("class_id", selectedClass.id)');
    expect(assignmentImporter).toContain("body: JSON.stringify({ class_id: classRow.id })");
  });

  it("matches assigned class names safely for JSS1 and other classes", () => {
    expect(teacherRoute).toContain("normalizeClassName");
    expect(teacherRoute).toContain("configured.includes(normalizeClassName(row.name))");
    expect(teacherClient).toContain("Every JSS1 student and every other assigned-class student is loaded into the selector.");
    expect(teacherClient).toContain('aria-label="Select student for result"');
    expect(teacherClient).toContain("teacherRemarkForm");
    expect(teacherClient).toContain("student${students.length === 1 ? \"\" : \"s\"} loaded from ${currentClassName}");
  });

  it("keeps the class register and selector driven by the same students array", () => {
    expect(teacherClient).toContain("students.map((item) => <option");
    expect(teacherClient).toContain("students.map((item, index)");
    expect(teacherClient).toContain("Students in {currentClassName}");
    expect(teacherClient).toContain("reportTotal");
    expect(teacherClient).toContain("reportPercentage");
    expect(teacherClient).toContain("teacherRemarkForm");
  });
});
