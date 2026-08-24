# D'Blossom Model Private Schools

This repository contains the D'Blossom school website and management platform built with Next.js, Supabase, and responsive portal workflows for administrators, teachers, and students.

## Run outside Manus

Read [PORTABLE_DEPLOYMENT.md](./PORTABLE_DEPLOYMENT.md) before starting. In summary, install Node.js 20 or newer, run `pnpm install`, configure the required Supabase and server environment variables, then run `pnpm build` followed by `pnpm start`. The downloaded source includes the standalone production launcher and does not require Manus Forge when `STORAGE_PROVIDER=supabase` is configured with an existing Supabase Storage bucket.

The application is not an offline package: records, authentication, and media remain in the connected Supabase project. Never commit `.env` files or expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.

## Project commands

Use `pnpm dev` for local development, `pnpm test` for the deterministic regression suite, `pnpm check` for TypeScript validation, and `pnpm build` for the production artifact. Set `RUN_SUPABASE_INTEGRATION=true` only when you intentionally want the live Supabase connectivity probe to run.

## Supabase setup

Apply the SQL files under `supabase/migrations/` in filename order in the target Supabase SQL Editor. Verify that the SQL Editor is connected to the same project configured in `NEXT_PUBLIC_SUPABASE_URL`. The dedicated teacher migration is `0005_teachers_table.sql`.
