# Vercel + Supabase deployment checklist

The website can deploy successfully while its Supabase-backed operations still fail. Vercel deployment status confirms that the build/hosting step succeeded; it does not confirm that the correct Supabase project and server credentials are configured.

## Vercel Production environment variables

In Vercel, open the D'Blossom project, then **Settings → Environment Variables**. Add the following values for **Production** (and Preview/Development too if those environments are used):

- `SUPABASE_URL`: the URL of the intended Supabase project.
- `SUPABASE_SECRET_KEY`: the server-only Supabase secret/service-role key. If the project already uses `SUPABASE_SERVICE_ROLE_KEY`, the backend also accepts that name.
- `ADMIN_USERNAME`: the administrator username.
- `ADMIN_PASSWORD`: a strong administrator password used to sign the HTTP-only admin session cookie.
- `PAYSTACK_SECRET_KEY`: required only for server-side Paystack payment verification and webhooks.

The browser uses the publishable key in `js/config.js`. A publishable/anon key is expected to be public and must only be used with correctly configured Supabase Row Level Security (RLS). **Never place the Supabase secret/service-role key in browser JavaScript or commit it to GitHub.**

After saving environment variables, redeploy the intended Vercel environment. Environment changes do not update an already-created deployment automatically.

## Verify Supabase

After deployment, open:

- `/api/supabase-health` — reports whether the server credentials work and whether the `profiles` table is available. It never returns keys or table data.
- `/api/admin-login` — GET should return a configured status; POST verifies the administrator credentials and sets the session cookie.

If `/api/supabase-health` reports that the `profiles` table is missing, verify the intended Supabase project's schema/migrations before creating anything. Do not blindly reset the database or run duplicate migrations.

## What deployment success means

A successful Vercel deployment proves the source was deployed. The Supabase health endpoint, real login, and authorized create/read/update/delete operations still need to be tested against the intended production database.
