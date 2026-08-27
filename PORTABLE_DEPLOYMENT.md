# D'Blossom portable deployment

The downloaded source is a Next.js application and can be installed, built, and started on a normal Node.js host. Use Node.js 20 or newer, run `pnpm install`, then `pnpm build` and `pnpm start`. The application listens on the host-provided `PORT`; do not hard-code a port in the hosting provider.

## Required external configuration

The application is not a self-contained offline desktop program because student records, teacher records, results, authentication, and media are stored remotely. A non-Manus deployment requires the following server-side environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET`. Never place the service-role key in browser code or commit it to the repository.

The current project also contains legacy TiDB/MySQL helpers, so provide `DATABASE_URL` if those server helpers are used by the chosen deployment path. The active portal data path uses Supabase and its role policies.

Set `VITE_APP_LOGO` to a public logo URL when deploying outside Manus. Next.js exposes that value to browser components as `NEXT_PUBLIC_SCHOOL_LOGO_URL`; if it is omitted, the current Manus storage path remains as a compatibility fallback. Never commit `.env` files or expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.

## Media without Manus

Set `STORAGE_PROVIDER=supabase` and optionally `SUPABASE_STORAGE_BUCKET=school-media`. Create that bucket in the connected Supabase Storage project and configure it for public media URLs, or adapt the storage adapter to signed URLs for a private bucket. The server storage adapter retains the Manus Forge provider when Forge variables are present, but downloaded deployments can use the Supabase Storage fallback instead.

## Supabase schema

Run `supabase/SETUP_ALL.sql` once in the target Supabase SQL Editor, or apply every SQL file in `supabase/migrations/` in filename order. In particular, `0005_teachers_table.sql` defines the dedicated teacher registration fields, profile linkage, staff ID index, and RLS policies. Verify the resulting schema in the same Supabase project used by `NEXT_PUBLIC_SUPABASE_URL`. A hosted deployment must apply all migrations through `0010_requested_schema_reconciliation.sql`, not only the teacher-table alteration, because the application also needs `profiles`, `portal_credentials`, role policies, the portal login function, admission-number compatibility fields, media metadata, optional report-card position metadata, student credentials, `students.boarding_status`, `subjects.created_at`, and the requested `complaints`, `gallery_images`, and `events` tables. Every migration is idempotent and preserves existing rows. If the connected Supabase project reports missing columns or tables, run `supabase/SETUP_ALL.sql` once in that project’s SQL Editor; the application’s legacy SQL connection is separate from Supabase Postgres and cannot apply Supabase DDL.

Student and teacher login starts through the server-side `/api/portal-login` route. It resolves the local admission number or staff ID from Supabase, provisions or refreshes the corresponding Supabase Auth identity, links the nullable `profile_id`, and then creates the normal Supabase Auth browser session. This avoids requiring the optional `resolve_portal_login` RPC for local credential resolution, while the migrations remain the authoritative schema setup.

## Test commands

Run `pnpm test` for the deterministic local suite. The live Supabase connectivity probe is intentionally skipped by default so a temporary network outage does not make a downloaded project’s test run hang. Set `RUN_SUPABASE_INTEGRATION=true` when you explicitly want to test the configured Supabase endpoint, then run `pnpm test` again.

## Responsive behavior

The public pages and portal entry routes have been checked at phone, tablet, laptop, and wide-desktop widths. The layouts use responsive navigation, wrapping controls, scrollable data tables, mobile-safe spacing, and fixed mobile navigation where specified.

## What works after download

With the dependencies installed and the required Supabase and storage settings supplied, the downloaded project can run outside Manus using the normal Next.js production command. Manus-only preview helpers, checkpoint metadata, and Forge storage are not required when `STORAGE_PROVIDER=supabase` is configured. Existing data remains in Supabase; downloading the source does not download or duplicate the database contents.
