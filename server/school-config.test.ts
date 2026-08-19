import { describe, expect, it } from "vitest";

describe("school contact configuration", () => {
  it("has the required complaint email and payment WhatsApp destination", () => {
    expect(process.env.SCHOOL_CONTACT_EMAIL).toBeTruthy();
    expect(process.env.SCHOOL_CONTACT_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(process.env.SCHOOL_WHATSAPP_NUMBER).toBeTruthy();
    expect(process.env.SCHOOL_WHATSAPP_NUMBER).toMatch(/^\d{8,15}$/);
  });
});
