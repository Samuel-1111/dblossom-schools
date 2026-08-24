import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const guide = readFileSync("PORTABLE_DEPLOYMENT.md", "utf8");
const storage = readFileSync("server/storage.ts", "utf8");

describe("portable deployment contract", () => {
  it("documents normal Node production startup and required external configuration", () => {
    expect(guide).toContain("pnpm install");
    expect(guide).toContain("pnpm build");
    expect(guide).toContain("pnpm start");
    expect(guide).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(guide).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(guide).toContain("JWT_SECRET");
  });

  it("supports Supabase Storage outside Manus while retaining Forge compatibility", () => {
    expect(storage).toContain('process.env.STORAGE_PROVIDER === "supabase"');
    expect(storage).toContain("createServiceClient().storage");
    expect(storage).toContain("ENV.forgeApiUrl");
    expect(guide).toContain("STORAGE_PROVIDER=supabase");
  });
});
