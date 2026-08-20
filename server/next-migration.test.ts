import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const schema = readFileSync(`${root}/supabase/migrations/0001_school_management.sql`, "utf8");

describe("Next.js + Supabase migration contract", () => {
  it("defines every requested school table and enables RLS", () => {
    for (const table of ["profiles", "classes", "students", "subjects", "attendance", "grades", "announcements"]) {
      expect(schema).toContain(`create table if not exists public.${table}`);
      expect(schema).toContain(`alter table public.${table} enable row level security`);
    }
    expect(schema).toContain("create or replace function public.handle_new_user()");
    expect(schema).toContain("create trigger on_auth_user_created");
  });

  it("includes admin, teacher, and own-record policy boundaries", () => {
    expect(schema).toContain("public.is_admin()");
    expect(schema).toContain("teacher_id = auth.uid()");
    expect(schema).toContain("profile_id = auth.uid()");
    expect(schema).not.toContain("service_role");
  });

  it("includes all migrated portal entry routes", () => {
    for (const route of [
      "app/student-portal/page.tsx",
      "app/teacher-portal/page.tsx",
      "app/admin-login/page.tsx",
      "app/student-dashboard/page.tsx",
      "app/teacher-dashboard/page.tsx",
      "app/admin-dashboard/page.tsx",
      "app/auth/callback/route.ts",
      "middleware.ts",
    ]) {
      expect(existsSync(`${root}/${route}`)).toBe(true);
    }
  });
});
