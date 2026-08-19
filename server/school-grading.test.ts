import { describe, expect, it } from "vitest";
import { calculateSubjects, gradeFor, summarizeSubjects } from "../shared/school";

describe("school grading", () => {
  it("uses the required grade bands", () => {
    expect(gradeFor(70)).toBe("A");
    expect(gradeFor(60)).toBe("B");
    expect(gradeFor(50)).toBe("C");
    expect(gradeFor(40)).toBe("D");
    expect(gradeFor(39)).toBe("F");
  });

  it("caps CA and exam scores and calculates totals", () => {
    const subjects = calculateSubjects([{ name: "Mathematics", caScore: 40, examScore: 90 }, { name: "English", caScore: 20, examScore: 45 }]);
    expect(subjects).toEqual([
      { name: "Mathematics", caScore: 30, examScore: 70, total: 100, grade: "A" },
      { name: "English", caScore: 20, examScore: 45, total: 65, grade: "B" },
    ]);
    expect(summarizeSubjects(subjects)).toEqual({ totalScore: 165, average: 82.5 });
  });
});
