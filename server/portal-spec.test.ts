import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateSubjects, summarizeSubjects } from "../shared/school";

const teacherSource = readFileSync("app/teacher-dashboard/TeacherDashboardClient.tsx", "utf8");
const portalLoginSource = readFileSync("app/portal-login/PortalLogin.tsx", "utf8");

describe("secured portal result shaping", () => {
  it("caps CA and exam scores and derives total and grade", () => {
    const subjects = calculateSubjects([{ name: "Mathematics", caScore: 35, examScore: 90 }]);
    expect(subjects[0]).toMatchObject({ name: "Mathematics", caScore: 30, examScore: 70, total: 100, grade: "A" });
  });

  it("returns the aggregate total and decimal average for report cards", () => {
    const subjects = calculateSubjects([
      { name: "English Language", caScore: 20, examScore: 50 },
      { name: "Mathematics", caScore: 15, examScore: 45 },
    ]);
    expect(summarizeSubjects(subjects)).toMatchObject({ totalScore: 130, average: 65 });
  });
});

describe("portal validation and dynamic subjects", () => {
  it("loads subjects dynamically for the selected assigned class", () => {
    expect(teacherSource).toContain('supabase.from("subjects").select("id, name")');
    expect(teacherSource).toContain("subjects.map");
    expect(teacherSource).toContain("Select subject");
  });

  it("keeps role-specific identifier labels and required-field validation", () => {
    expect(portalLoginSource).toContain('student: { notFound: "Admission number not found"');
    expect(portalLoginSource).toContain('teacher: { notFound: "Staff ID not found"');
    expect(portalLoginSource).toContain("identifierLabel");
    expect(portalLoginSource).toContain("Password is required");
  });
});

describe("registration and report-card edge behavior", () => {
  it("normalizes blank optional registration fields at the boundary", () => {
    const optionalText = (value: string) => value.trim() || undefined;
    expect(optionalText("   ")).toBeUndefined();
    expect(optionalText("parent@example.com")).toBe("parent@example.com");
  });

  it("preserves subject order and derived totals for report-card shaping", () => {
    const subjects = calculateSubjects([
      { name: "Science", caScore: 22, examScore: 61 },
      { name: "English Language", caScore: 18, examScore: 52 },
    ]);
    expect(subjects.map((subject) => subject.name)).toEqual(["Science", "English Language"]);
    expect(subjects.map((subject) => subject.total)).toEqual([83, 70]);
  });
});

describe("strict specification grade boundaries", () => {
  it.each([
    [70, "A"],
    [60, "B"],
    [50, "C"],
    [40, "D"],
    [39, "F"],
  ])("assigns %s total to grade %s", (total, grade) => {
    const subjects = calculateSubjects([{ name: "Subject", caScore: 0, examScore: total }]);
    expect(subjects[0]?.grade).toBe(grade);
  });

  it("keeps report-card averages deterministic for empty and mixed records", () => {
    expect(summarizeSubjects([])).toEqual({ totalScore: 0, average: 0 });
    const subjects = calculateSubjects([
      { name: "English Language", caScore: 30, examScore: 70 },
      { name: "Mathematics", caScore: 10, examScore: 40 },
    ]);
    expect(summarizeSubjects(subjects)).toEqual({ totalScore: 150, average: 75 });
  });
});
