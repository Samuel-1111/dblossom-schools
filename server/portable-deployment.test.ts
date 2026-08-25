import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readme = readFileSync("README.md", "utf8");
const guide = readFileSync("PORTABLE_DEPLOYMENT.md", "utf8");
const storage = readFileSync("server/storage.ts", "utf8");
const studentCompatibility = readFileSync("supabase/migrations/0006_student_identifier_compatibility.sql", "utf8");
const setupAll = readFileSync("supabase/SETUP_ALL.sql", "utf8");

describe("portable deployment contract", () => {
  it("provides a root download entry point", () => {
    expect(readme).toContain("PORTABLE_DEPLOYMENT.md");
    expect(readme).toContain("pnpm install");
    expect(readme).toContain("pnpm start");
  });

  it("documents normal Node production startup and required external configuration", () => {
    expect(guide).toContain("pnpm install");
    expect(guide).toContain("pnpm build");
    expect(guide).toContain("pnpm start");
    expect(guide).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(guide).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(guide).toContain("JWT_SECRET");
    expect(guide).toContain("VITE_APP_LOGO");
    expect(guide).toContain("NEXT_PUBLIC_SCHOOL_LOGO_URL");
    expect(guide).toContain("all seven migrations");
    expect(studentCompatibility).toContain("students_admission_number_unique_idx");
    expect(setupAll).toContain("0001_school_management.sql");
    expect(setupAll).toContain("0006_student_identifier_compatibility.sql");
    expect(setupAll).toContain("0007_media_metadata_compatibility.sql");
  });

  it("supports Supabase Storage outside Manus while retaining Forge compatibility", () => {
    expect(storage).toContain('process.env.STORAGE_PROVIDER === "supabase"');
    expect(storage).toContain("createServiceClient().storage");
    expect(storage).toContain("ENV.forgeApiUrl");
    expect(guide).toContain("STORAGE_PROVIDER=supabase");
  });
});
