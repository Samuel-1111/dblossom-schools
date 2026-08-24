import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/api/admin/media-upload/route.ts", "utf8");
const clientSource = readFileSync("app/admin-dashboard/AdminDashboardClient.tsx", "utf8");

describe("Admin media upload contract", () => {
  it("requires the local administrator session and updates only event/gallery records", () => {
    expect(source).toContain("isValidLocalAdminToken");
    expect(source).toContain('table !== "events" && table !== "gallery_images"');
    expect(source).toContain("storagePut");
    expect(source).toContain('update({ image_url: uploaded.url })');
  });

  it("enforces supported image types and the 5 MB limit", () => {
    expect(source).toContain("5 * 1024 * 1024");
    expect(source).toContain("image/jpeg");
    expect(source).toContain("image/png");
    expect(source).toContain("image/webp");
    expect(source).toContain("Image must be 5 MB or smaller");
    expect(clientSource).toContain("uploadMedia");
    expect(clientSource).toContain("5 * 1024 * 1024");
  });
});
