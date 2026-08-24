import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const aliases = ["about", "academics", "gallery", "events", "payment", "complaint"] as const;

describe("public section routes", () => {
  it.each(aliases)("renders a route-specific page for /%s", (name) => {
    const source = readFileSync(`app/${name}/page.tsx`, "utf8");
    expect(source).toContain("PublicSectionPage");
    expect(source).not.toContain("redirect(\"/#");
  });

  it("keeps live Payment and Complaint forms on their dedicated routes", () => {
    expect(readFileSync("app/payment/page.tsx", "utf8")).toContain('PublicSubmissions section="payment"');
    expect(readFileSync("app/complaint/page.tsx", "utf8")).toContain('PublicSubmissions section="complaint"');
  });
});
