import { describe, expect, it } from "vitest";
import { calculateSubjects, summarizeSubjects } from "../shared/school";

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
