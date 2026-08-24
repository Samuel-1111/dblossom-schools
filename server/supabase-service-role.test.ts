import { describe, expect, it } from "vitest";

describe("Supabase service-role configuration", () => {
  it("authenticates against the lightweight REST metadata endpoint without exposing the key", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(url).toBeTruthy();
    expect(key).toBeTruthy();

    const response = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key!, Authorization: `Bearer ${key!}` },
    });
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
  }, 30_000);
});
