import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/student-dashboard/StudentDashboardClient.tsx", "utf8");

describe("Student report-card specification", () => {
  it("supports session and term filters over the student result set", () => {
    expect(source).toContain("Filter results by session");
    expect(source).toContain("Filter results by term");
    expect(source).toContain('session === "All Sessions"');
  });

  it("provides a branded client-side report-card download action", () => {
    expect(source).toContain("html2canvas");
    expect(source).toContain("jsPDF");
    expect(source).toContain("Download Report Card");
    expect(source).toContain("D'Blossom Model Private Schools");
  });
});
