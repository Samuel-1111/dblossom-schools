import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync("app/page.tsx", "utf8");

describe("public media rendering", () => {
  it("reads events and gallery images from Supabase", () => {
    expect(pageSource).toContain('supabase.from("gallery_images")');
    expect(pageSource).toContain('supabase.from("events")');
    expect(pageSource).toContain("image_url");
  });

  it("keeps explicit empty states when no public media exists", () => {
    expect(pageSource).toContain("School life moments will appear here");
    expect(pageSource).toContain("Upcoming school events will appear here");
  });
});
