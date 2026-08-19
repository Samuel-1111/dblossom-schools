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
