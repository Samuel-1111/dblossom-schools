import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const teacherSource = readFileSync("app/teacher-dashboard/TeacherDashboardClient.tsx", "utf8");
const adminRouteSource = readFileSync("app/api/admin/records/route.ts", "utf8");
const adminClientSource = readFileSync("app/admin-dashboard/AdminDashboardClient.tsx", "utf8");

describe("Result persistence and role boundaries", () => {
  it("persists the assigned student, subject, term, session, scores, and recorder", () => {
    expect(teacherSource).toContain('supabase.from("results")');
    expect(teacherSource).toContain("student_id: student.id");
    expect(teacherSource).toContain("subject_id: subject.id");
    expect(teacherSource).toContain("term_id: termRow.id");
    expect(teacherSource).toContain("ca_score: ca");
    expect(teacherSource).toContain("exam_score: exam");
    expect(teacherSource).toContain("Complete the CA and Exam scores for every subject");
  });

  it("keeps Admin result mutations limited to protected comment updates", () => {
    expect(adminClientSource).toContain('adminRequest("PATCH", "results"');
    expect(adminClientSource).toContain("Result uploads are teacher-only.");
    expect(adminRouteSource).toContain('table === "events" || table === "gallery_images" ? cleanMediaPayload(table, body) : cleanPayload(table, body)');
    expect(adminRouteSource).toContain("teacher_comment");
    expect(adminRouteSource).toContain("principal_comment");
    expect(adminRouteSource).toContain('table !== "students" && table !== "teachers" && table !== "results"');
    expect(adminClientSource).toContain("Delete result");
  });
});
