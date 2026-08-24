import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/public-nav/PublicNav.tsx", "utf8");
const page = readFileSync("app/page.tsx", "utf8");

describe("public responsive navigation", () => {
  it("provides an accessible mobile menu with close-on-selection behavior", () => {
    expect(source).toContain("Open navigation menu");
    expect(source).toContain("Close navigation menu");
    expect(source).toContain("aria-expanded={open}");
    expect(source).toContain("setOpen(false)");
  });

  it("preserves public sections and portal entry actions", () => {
    expect(source).toContain("/student-portal");
    expect(source).toContain("/admin-login");
    expect(page).toContain("<PublicNav />");
  });
});
