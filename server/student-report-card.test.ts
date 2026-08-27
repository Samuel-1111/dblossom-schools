import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/student-dashboard/StudentDashboardClient.tsx", "utf8");
const pageSource = readFileSync("app/student-dashboard/page.tsx", "utf8");

describe("Student report-card specification", () => {
  it("supports session and term filters over the student result set", () => {
    expect(source).toContain("Filter results by session");
    expect(source).toContain("Filter results by term");
    expect(source).toContain("Filter your recorded subject grades by session or term.");
    expect(source).toContain('session === "All Sessions"');
  });

  it("provides a branded client-side report-card download action", () => {
    expect(source).not.toContain("html2canvas");
    expect(source).toContain("jsPDF");
    expect(source).toContain("Download Result (PDF)");
    expect(source).toContain("D'Blossom Model Private Schools");
    expect(source).toContain("Generating PDF…");
    expect(source).toContain("Report card could not be generated. Please try again.");
    expect(source).toContain("Teacher Remark");
    expect(source).toContain("CA Score");
    expect(source).toContain("Exam Score");
    expect(source).toContain("Total");
    expect(source).toContain("Grade");
    expect(source).not.toContain('<th className="px-3 py-3">Term</th>');
    expect(source).not.toContain('<th className="px-3 py-3">Percentage</th>');
    expect(source).not.toContain('title="Position"');
    expect(source).toContain("downloadingReport");
    expect(source).toContain("pdf.addPage()");
    expect(source).toContain("pdf.addImage(logoData");
    expect(source).toContain("pdf.splitTextToSize(teacherRemark");
    expect(source).toContain("item.teacher_comment?.trim()");
    expect(pageSource).toContain("teacher_comment, principal_comment");
    expect(pageSource).toContain("teacher_comment: item.teacher_comment");
  });
});
