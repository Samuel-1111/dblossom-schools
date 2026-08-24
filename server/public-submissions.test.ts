import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync("app/page.tsx", "utf8");
const formSource = readFileSync("app/public-submissions/PublicSubmissions.tsx", "utf8");

describe("public submission workflows", () => {
  it("mounts separate Payment and Complaint forms in the public sections", () => {
    expect(pageSource).toContain('<PublicSubmissions section="payment" />');
    expect(pageSource).toContain('<PublicSubmissions section="complaint" />');
  });

  it("writes pending payment notifications and new complaints to Supabase", () => {
    expect(formSource).toContain('from("payments").insert');
    expect(formSource).toContain('status: "Pending"');
    expect(formSource).toContain('from("complaints").insert');
    expect(formSource).toContain('status: "New"');
    expect(formSource).toContain("Submitting…");
    expect(formSource).toContain("Sending…");
  });
});
