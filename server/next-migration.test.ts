import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const schema = readFileSync(`${root}/supabase/migrations/0001_school_management.sql`, "utf8");
const legacySchema = readFileSync(`${root}/supabase/migrations/0002_legacy_workflows.sql`, "utf8");
const hardeningSchema = readFileSync(`${root}/supabase/migrations/0003_role_hardening.sql`, "utf8");
const studentCompatibilitySchema = readFileSync(`${root}/supabase/migrations/0006_student_identifier_compatibility.sql`, "utf8");
const mediaCompatibilitySchema = readFileSync(`${root}/supabase/migrations/0007_media_metadata_compatibility.sql`, "utf8");
const resultPositionSchema = readFileSync(`${root}/supabase/migrations/0008_result_position_compatibility.sql`, "utf8");
const studentCredentialsSchema = readFileSync(`${root}/supabase/migrations/0009_student_portal_credentials.sql`, "utf8");
const portalLogin = readFileSync(`${root}/app/portal-login/PortalLogin.tsx`, "utf8");
const adminLogin = readFileSync(`${root}/app/admin-login/page.tsx`, "utf8");
const studentLogin = readFileSync(`${root}/app/student-portal/page.tsx`, "utf8");
const studentDashboard = readFileSync(`${root}/app/student-dashboard/page.tsx`, "utf8");
const teacherDashboard = readFileSync(`${root}/app/teacher-dashboard/TeacherDashboardClient.tsx`, "utf8");
const teacherLogin = readFileSync(`${root}/app/teacher-portal/page.tsx`, "utf8");
const nextConfig = readFileSync(`${root}/next.config.mjs`, "utf8");
const devLauncher = readFileSync(`${root}/scripts/start-dev.mjs`, "utf8");

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

  it("defines the preserved school workflow tables and identifier resolver", () => {
    for (const table of ["portal_credentials", "results", "payments", "events", "gallery_images", "complaints"]) {
      expect(legacySchema).toContain(`create table if not exists public.${table}`);
      expect(legacySchema).toContain(`alter table public.${table} enable row level security`);
    }
    expect(legacySchema).toContain("resolve_portal_login");
    expect(legacySchema).toContain("recorded_by = auth.uid()");
  });

  it("hardens role-scoped teacher writes and student reads", () => {
    expect(hardeningSchema).toContain("create or replace function public.is_teacher()");
    expect(hardeningSchema).toContain("create or replace function public.is_student()");
    expect(hardeningSchema).toContain("public.is_teacher() and recorded_by = auth.uid()");
    expect(hardeningSchema).toContain("public.is_student() and exists");
    expect(hardeningSchema).toContain("attendance_student_date_unique");
  });

  it("keeps legacy and portable student identifiers compatible", () => {
    expect(studentCompatibilitySchema).toContain("add column if not exists admission_number text");
    expect(studentCompatibilitySchema).toContain("add column if not exists full_name text");
    expect(studentCompatibilitySchema).toContain("add column if not exists password text");
    expect(studentCompatibilitySchema).toContain("students_admission_number_unique_idx");
    expect(studentCompatibilitySchema).toContain("set admission_number = student_number");
    expect(mediaCompatibilitySchema).toContain("add column if not exists category text not null default 'Other'");
    expect(mediaCompatibilitySchema).toContain("add column if not exists status text not null default 'Published'");
    expect(resultPositionSchema).toContain("add column if not exists position integer");
    expect(resultPositionSchema).toContain("results_student_position_idx");
    expect(studentCredentialsSchema).toContain("add column if not exists password text");
  });

  it("preserves the amended portal credential labels", () => {
    expect(studentLogin).toContain('identifierLabel="Admission Number"');
    expect(teacherLogin).toContain('identifierLabel="Staff ID or email"');
    expect(adminLogin).toContain('identifierLabel="Username"');
    expect(portalLogin).toContain('fetch("/api/portal-login"');
    expect(studentDashboard).toContain("admission_number");
    expect(teacherDashboard).toContain("admission_number");
  });

  it("isolates development artifacts from production output", () => {
    expect(nextConfig).toContain('distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next"');
    expect(devLauncher).toContain('rm(".next-dev"');
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
