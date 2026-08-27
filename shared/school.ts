export const CLASSES = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"] as const;
export const TERMS = ["First Term", "Second Term", "Third Term"] as const;
export const SUBJECTS = ["English Language", "Mathematics", "Basic Science", "Social Studies", "Computer Studies", "Civic Education", "Agricultural Science", "Home Economics"] as const;
export const SUBJECT_STORAGE_KEY = "dbms_subjects";

// Uploaded school records use "Surname FirstName" order, so the given first name is the second token.
export function firstNameFromFullName(fullName: string | null | undefined) {
  const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[1] : parts[0] ?? "";
}

export function getSubjects(): string[] {
  if (typeof window === "undefined") return [...SUBJECTS];
  try {
    const stored = window.localStorage.getItem(SUBJECT_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") && parsed.length ? parsed : [...SUBJECTS];
  } catch {
    return [...SUBJECTS];
  }
}

export function saveSubjects(subjects: string[]) {
  const unique = Array.from(new Set(subjects.map((subject) => subject.trim()).filter(Boolean)));
  if (typeof window !== "undefined") window.localStorage.setItem(SUBJECT_STORAGE_KEY, JSON.stringify(unique));
  return unique;
}

export function resetSubjects() {
  const defaults = [...SUBJECTS];
  if (typeof window !== "undefined") window.localStorage.setItem(SUBJECT_STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

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

export type AdminRegistrationErrors = Record<string, string>;

export function validateStudentRegistration(input: { fullName: string; admissionNumber: string; className: string; password?: string }, editing = false): AdminRegistrationErrors {
  const errors: AdminRegistrationErrors = {};
  if (!input.fullName.trim()) errors.fullName = "Full name is required.";
  if (!input.admissionNumber.trim()) errors.admissionNumber = "Admission number is required.";
  if (!input.className.trim()) errors.className = "Class is required.";
  if (!editing && !input.password?.trim()) errors.password = "Password is required for a new student.";
  return errors;
}

export function validateTeacherRegistration(input: { fullName: string; staffId: string; password?: string }, editing = false): AdminRegistrationErrors {
  const errors: AdminRegistrationErrors = {};
  if (!input.fullName.trim()) errors.fullName = "Full name is required.";
  if (!input.staffId.trim()) errors.staffId = "Staff ID is required.";
  if (!editing && !input.password?.trim()) errors.password = "Password is required for a new teacher.";
  return errors;
}

export function hasValidationErrors(errors: AdminRegistrationErrors) {
  return Object.keys(errors).length > 0;
}

export function isAdminRegistrationFormOpen(editingId: number | null, showForm: boolean) {
  return editingId !== null || showForm;
}
