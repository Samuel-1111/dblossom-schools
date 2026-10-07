import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/0011_parent_links_payments.sql", "utf8");
const setup = readFileSync("supabase/SETUP_ALL.sql", "utf8");
const paymentInit = readFileSync("supabase/functions/paystack-result-access/index.ts", "utf8");
const paymentVerify = readFileSync("supabase/functions/paystack-result-verify/index.ts", "utf8");
const studentPage = readFileSync("app/student-dashboard/StudentDashboardClient.tsx", "utf8");
const studentSearch = readFileSync("app/api/admin/student-links/route.ts", "utf8");
const linkingUi = readFileSync("app/admin-dashboard/AdminLinking.tsx", "utf8");

describe("parent linking and paid result access", () => {
  it("adds the missing student profile compatibility column and non-destructive link/payment tables", () => {
    expect(migration).toContain("add column if not exists profile_id uuid");
    expect(migration).toContain("create table if not exists public.parent_profiles");
    expect(migration).toContain("create table if not exists public.parent_student_links");
    expect(migration).toContain("create table if not exists public.teacher_student_links");
    expect(migration).toContain("create table if not exists public.result_access_payments");
    expect(migration).toContain("check (amount_kobo = 100000)");
    expect(migration).toContain("check (currency = 'NGN')");
    expect(migration).not.toMatch(/drop\s+table|truncate\s+table|delete\s+from/i);
    expect(setup).toContain("0011_parent_links_payments.sql");
  });

  it("keeps the Paystack secret in Supabase Edge Functions and verifies status, amount, and currency", () => {
    expect(paymentInit).toContain("PAYSTACK_SECRET_KEY");
    expect(paymentInit).toContain("amount: String(AMOUNT_KOBO)");
    expect(paymentInit).toContain('currency: "NGN"');
    expect(paymentVerify).toContain('transaction?.status === "success"');
    expect(paymentVerify).toContain("Number(transaction.amount) === AMOUNT_KOBO");
    expect(paymentVerify).toContain('transaction.currency === "NGN"');
    expect(paymentVerify).toContain("result_access_grants");
  });

  it("gates results with a neutral payment state and keeps ordinary empty states calm", () => {
    expect(studentPage).toContain("hasResultAccess");
    expect(studentPage).toContain("Pay ₦1,000 to Check Results");
    expect(studentPage).toContain("No announcements yet.");
    expect(studentPage).toContain("No results recorded for this selection.");
    expect(studentPage).toContain("border-slate-200 bg-slate-50");
  });

  it("supports fast student search and both parent and teacher linking", () => {
    expect(studentSearch).toContain("full_name.ilike");
    expect(studentSearch).toContain("admission_number.ilike");
    expect(studentSearch).toContain("parent_student_links");
    expect(studentSearch).toContain("teacher_student_links");
    expect(linkingUi).toContain("Search student name or admission number");
    expect(linkingUi).toContain("Save ${type} link");
  });
});
