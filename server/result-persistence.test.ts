import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const teacherSource = readFileSync("app/teacher-dashboard/TeacherDashboardClient.tsx", "utf8");
const teacherRouteSource = readFileSync("app/api/teacher/records/route.ts", "utf8");
const adminRouteSource = readFileSync("app/api/admin/records/route.ts", "utf8");
const adminClientSource = readFileSync("app/admin-dashboard/AdminDashboardClient.tsx", "utf8");

describe("Result persistence and role boundaries", () => {
  it("persists the assigned student, subject, term, session, scores, and recorder", () => {
    expect(teacherSource).toContain('action: "save-result"');
    expect(teacherSource).toContain("subject_scores");
    expect(teacherSource).toContain("Complete the CA and Exam scores for every subject");
    expect(teacherRouteSource).toContain('if (action === "save-result")');
    expect(teacherRouteSource).toContain("student_id: target.student.id");
    expect(teacherRouteSource).toContain("subject_id: subject.id");
    expect(teacherRouteSource).toContain("term_id: target.term.id");
    expect(teacherRouteSource).toContain("ca_score: ca");
    expect(teacherRouteSource).toContain("exam_score: exam");
    expect(teacherSource).toContain("subject_ids: subjects.map((subject) => subject.id)");
    expect(teacherSource).toContain("const existingSubjects = Array.from");
    expect(teacherSource).toContain("deleteLoadedSubject");
    expect(teacherRouteSource).toContain('if (action === "delete-subject")');
    expect(teacherRouteSource).toContain("That subject is not part of the assigned class.");
    expect(teacherRouteSource).toContain('.eq("subject_id", subject.id)');
  });

  it("keeps Admin result mutations limited to protected comment updates", () => {
    expect(adminClientSource).toContain('adminRequest("PATCH", "results"');
    expect(adminClientSource).toContain("Result uploads are teacher-only.");
    expect(adminRouteSource).toContain('table === "events" || table === "gallery_images" ? cleanMediaPayload(table, body) : cleanPayload(table, body)');
    expect(adminRouteSource).toContain("teacher_comment");
    expect(adminRouteSource).toContain("principal_comment");
    expect(adminRouteSource).toContain("students(full_name, admission_number, class_id, classes(name))");
    expect(adminRouteSource).toContain("subjects(name)");
    expect(adminRouteSource).toContain("terms(name, session_id, academic_sessions(name))");
    expect(adminRouteSource).toContain("result_ids");
    expect(adminRouteSource).toContain('table !== "students" && table !== "teachers" && table !== "results"');
    expect(adminClientSource).toContain("Delete result");
  });
});
