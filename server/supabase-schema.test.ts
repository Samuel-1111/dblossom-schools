import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/0005_teachers_table.sql", "utf8");

describe("Supabase schema compatibility", () => {
  it("defines the dedicated teachers table and profile relationship", () => {
    expect(migration).toContain("create table if not exists public.teachers");
    expect(migration).toContain("profile_id uuid references public.profiles(id)");
    expect(migration).toContain("full_name text not null");
    expect(migration).toContain("staff_id text");
    expect(migration).toContain("password text");
  });

  it("protects teacher records and enforces unique staff identifiers", () => {
    expect(migration).toContain("teachers_staff_id_unique_idx");
    expect(migration).toContain("alter table public.teachers enable row level security");
    expect(migration).toContain("teachers_admin_all");
    expect(migration).toContain("teachers_self_read");
  });
});
