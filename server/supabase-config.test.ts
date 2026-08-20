import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("accepts the configured publishable credentials at the REST endpoint", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(url).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
    expect(key).toMatch(/^sb_publishable_/);

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key!, Authorization: `Bearer ${key}` },
    });
    expect(response.status).toBeLessThan(400);
  }, 15000);
});

export {};
