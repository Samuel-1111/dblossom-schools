import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/0010_requested_schema_reconciliation.sql"), "utf8");
const setup = fs.readFileSync(path.join(process.cwd(), "supabase/SETUP_ALL.sql"), "utf8");

describe("requested Supabase SMS/schema migration", () => {
  it("is idempotent and never drops or resets existing data", () => {
    expect(migration.toLowerCase()).not.toMatch(/drop\s+(table|database|schema)|truncate\s+table|delete\s+from/);
    expect(migration).toContain("if not exists");
    expect(migration).toContain("alter table if exists public.students");
  });

  it("contains every requested student field, timestamp, table, and RLS surface", () => {
    for (const text of [
      "boarding_status text",
      "password text",
      "subjects\n  add column if not exists created_at",
      "create table if not exists public.complaints",
      "create table if not exists public.gallery_images",
      "create table if not exists public.events",
      "alter table public.complaints enable row level security",
      "alter table public.gallery_images enable row level security",
      "alter table public.events enable row level security",
    ]) expect(migration).toContain(text);
    expect(setup).toContain("0010_requested_schema_reconciliation.sql");
  });
});
