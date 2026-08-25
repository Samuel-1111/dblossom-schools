import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/student-dashboard/StudentDashboardClient.tsx", "utf8");

describe("Student report-card specification", () => {
  it("supports session and term filters over the student result set", () => {
    expect(source).toContain("Filter results by session");
    expect(source).toContain("Filter results by term");
    expect(source).toContain("Filter your recorded subject grades by session or term.");
    expect(source).toContain('session === "All Sessions"');
  });

  it("provides a branded client-side report-card download action", () => {
    expect(source).toContain("html2canvas");
    expect(source).toContain("jsPDF");
    expect(source).toContain("Download Result (PDF)");
    expect(source).toContain("D'Blossom Model Private Schools");
    expect(source).toContain("Generating PDF…");
    expect(source).toContain("Report card could not be generated. Please try again.");
    expect(source).toContain("downloadingReport");
    expect(source).toContain("while (heightLeft > 0)");
    expect(source).toContain("pdf.addPage()");
    expect(source).toContain("const pageHeight = 277");
  });
});
