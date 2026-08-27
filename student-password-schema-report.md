# Student Password and Requested Schema Report

## Student CSV password handling

The uploaded student CSV was read from the available `students.csv` file. It contained 122 rows and 119 unique admission numbers. For each unique student record, the final surname from `Full Name` was used as the portal password and submitted through the live Student portal-login flow. All 119 unique student login identities were provisioned or refreshed successfully; there were zero not-found, invalid, unavailable, or other failures. Password values are intentionally not recorded in this report.

The Student login route also retains a compatibility fallback: when the live `students` table has no password column, it validates the surname-derived password from the student full name. This keeps existing imported records usable while the schema is being reconciled.

## Requested Supabase schema

The project now includes an idempotent migration at `supabase/migrations/0010_requested_schema_reconciliation.sql` and the same block at the end of `supabase/SETUP_ALL.sql`. It adds `students.boarding_status`, `students.password`, `subjects.created_at`, and creates `public.complaints`, `public.gallery_images`, and `public.events` with the matching timestamp/content fields and RLS policies.

A live REST schema check showed that the connected Supabase project currently lacks `students.boarding_status`, `students.password`, and `subjects.created_at`, and does not expose the three requested tables. The application database connection is separate from that Supabase REST project, so the migration must be run once in the target Supabase SQL Editor before those physical columns/tables can exist there. The application remains login-ready through the surname compatibility path in the meantime.
