# D'Blossom Model Private Schools

This repository contains the D'Blossom school website and management platform built with Next.js, Supabase, and responsive portal workflows for administrators, teachers, and students.

## Run outside Manus

Read [PORTABLE_DEPLOYMENT.md](./PORTABLE_DEPLOYMENT.md) before starting. In summary, install Node.js 20 or newer, run `pnpm install`, configure the required Supabase and server environment variables, then run `pnpm build` followed by `pnpm start`. The downloaded source includes the standalone production launcher and does not require Manus Forge when `STORAGE_PROVIDER=supabase` is configured with an existing Supabase Storage bucket.

The application is not an offline package: records, authentication, and media remain in the connected Supabase project. Never commit `.env` files or expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.

## Project commands

Use `pnpm dev` for local development, `pnpm test` for the deterministic regression suite, `pnpm check` for TypeScript validation, and `pnpm build` for the production artifact. Set `RUN_SUPABASE_INTEGRATION=true` only when you intentionally want the live Supabase connectivity probe to run.

## Supabase setup

Apply the SQL files under `supabase/migrations/` in filename order in the target Supabase SQL Editor. Verify that the SQL Editor is connected to the same project configured in `NEXT_PUBLIC_SUPABASE_URL`. The dedicated teacher migration is `0005_teachers_table.sql`.


## Current Supabase architecture

The connected `dblossom-school` Supabase project is the source of truth for the school backend. Its existing core tables use UUID primary keys, so new features are built around UUID relationships rather than the older bigint assumptions in the earliest Manus migrations.

The current platform structure includes:

- **Auth & roles:** Supabase Auth + `profiles` (admin, teacher, student, parent)
- **Academic core:** students, teachers, classes, subjects, academic sessions, terms, results, attendance
- **Parent:** parent profiles, parent/student links, notifications, notification preferences, messages, calendar
- **Finance:** fee categories, invoices, invoice items, partial payments, receipts, result-access payments and grants
- **Learning:** assignments, submissions, learning materials, lesson plans
- **Operations:** promotions, result locks, staff permissions, audit logs, student documents
- **Admissions:** online applications, status tracking, interviews, documents and applicant-to-student conversion
- **Communications:** all/parent/targeted/pinned announcements
- **Paystack:** result-access initialization and verification run as Supabase Edge Functions

### Paystack result checking

Result checking is locked until the signed-in student has a successful **₦1,000 NGN** Paystack transaction. The amount and currency are enforced server-side and again in the database. The student's result rows are also not sent to the browser until a valid result-access grant exists.

Deployments require these Supabase Function secrets:

```
PAYSTACK_SECRET_KEY=your_paystack_secret
PUBLIC_SITE_URL=https://your-school-domain.example
```

The Paystack secret must stay in Supabase Edge Function Secrets and must never be placed in a `NEXT_PUBLIC_` variable or committed to Git.

### Parent linking

Admin → **Linking** supports fast student lookup by **student name or admission number**. The administrator can link either a teacher or parent without scrolling through the full student list. When a parent email is supplied, the system uses a secure Supabase Auth invitation instead of storing a parent password in the school database.

### Empty states

Empty school content is intentionally calm. If the school has no announcements, messages, assignments, events or other optional records, the portal shows a neutral empty state such as **“No announcements yet.”** It does not display red error styling for ordinary empty data.

### Important schema note

The connected Supabase project was already using a UUID-based schema before this expansion, while the oldest Manus migration files describe a different legacy bigint schema. Do **not** reset the production database with the old migration chain. Before adopting a new local migration workflow, capture the connected remote schema with `supabase db pull` and make that remote baseline the starting point. Supabase recommends pulling an existing remote schema before introducing local migration history.


## Production readiness status

This repository is being hardened for real school usage, not demo usage.

Before production launch, the following external platform configuration is mandatory:

1. **Supabase plan:** the connected project is currently on the Free plan. Move production to at least Pro before relying on it for school operations. Supabase documents that Free projects can pause after inactivity and do not provide downloadable database backups; paid plans provide daily backups.
2. **Backups/PITR:** enable an appropriate backup policy and PITR if the school's recovery requirements need point-in-time recovery.
3. **Auth:** enable leaked-password protection, custom SMTP, suitable sign-in rate limits, and a real administrator Auth account with a `profiles.role` of `admin` or `super_admin`.
4. **Paystack:** set `PAYSTACK_SECRET_KEY` and configure the signed Paystack webhook URL described in `supabase/PAYSTACK_SETUP.md`.
5. **Database:** treat the connected remote Supabase schema as production truth. Establish a clean version-controlled migration baseline with `supabase db pull` before using automated migration deployment.
6. **Load test:** run k6 against a staging/preview environment with realistic student credentials before a result-release event. Test at least 1,000 concurrent result checks and measure p95/p99 latency, error rate, Auth 429s, Edge Function latency, database CPU/IO, pooler connections and cache hit rate.
7. **Storage:** production school media uses the Supabase `school-media` bucket; sensitive student documents must use the private `student-documents` bucket and signed URLs.

### Current database verification

- 42/42 public tables have RLS enabled.
- Duplicate result rows were found and removed; a unique constraint now enforces one result per student + subject + term.
- Teacher/student profile links were reconciled for the existing Auth users.
- Teacher class assignments were reconciled from the existing class-teacher records.
- Fee payment writes are transactionally locked to prevent concurrent overpayment.
- Result payment initialization is idempotent.
- Paystack verification has a signed webhook fallback.
- Admin/teacher authorization no longer depends on editable Auth user metadata.
- Admin large-list APIs and result review use bounded pagination.
- Supabase Performance Advisor reports only unused-index INFO findings; no missing-index warning remains.
- Supabase Security Advisor currently reports one remaining warning: leaked-password protection is disabled.

### Verification limitation

A production build and a 1,000-user load test have **not** been executed from this ChatGPT environment. The GitHub connector can inspect and modify the repository, while the production Supabase project can be inspected directly, but this environment does not have the repository's full local dependency installation or a safe staging credential set for a genuine concurrent-user test. Therefore this system must **not** be labelled production-certified until CI/build verification and staging load testing are completed.
