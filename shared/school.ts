export const CLASSES = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"] as const;
export const TERMS = ["First Term", "Second Term", "Third Term"] as const;
export const SUBJECTS = ["English Language", "Mathematics", "Basic Science", "Social Studies", "Computer Studies", "Civic Education", "Agricultural Science", "Home Economics"] as const;

export type SubjectScore = { name: string; caScore: number; examScore: number; total: number; grade: string };

export function gradeFor(total: number) {
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 40) return "D";
  return "F";
}

export function calculateSubjects(items: Array<{ name: string; caScore: number; examScore: number }>): SubjectScore[] {
  return items.map((item) => {
    const caScore = Math.max(0, Math.min(30, Number(item.caScore) || 0));
    const examScore = Math.max(0, Math.min(70, Number(item.examScore) || 0));
    const total = caScore + examScore;
    return { name: item.name, caScore, examScore, total, grade: gradeFor(total) };
  });
}

export function summarizeSubjects(subjects: SubjectScore[]) {
  const totalScore = subjects.reduce((sum, subject) => sum + subject.total, 0);
  const average = subjects.length ? Math.round((totalScore / subjects.length) * 100) / 100 : 0;
  return { totalScore, average };
}
