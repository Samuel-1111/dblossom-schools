import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("accepts the configured publishable credentials shape", () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(url).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
    expect(key).toMatch(/^sb_publishable_/);
  });

  it.runIf(process.env.RUN_SUPABASE_INTEGRATION === "true")(
    "accepts the configured publishable credentials at the REST endpoint",
    async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`${url}/auth/v1/settings`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          signal: controller.signal,
        });
        expect(response.status).toBeLessThan(400);
      } finally {
        clearTimeout(timeout);
      }
    },
  );
});

export {};
