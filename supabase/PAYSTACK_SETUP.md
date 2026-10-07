# Paystack Result Access Setup

The school result-access flow uses Supabase Edge Functions.

## Required Supabase secrets

Set these in the Supabase project's Edge Function Secrets:

- `PAYSTACK_SECRET_KEY`
- `PUBLIC_SITE_URL`

Use the Paystack **secret** key only. Never expose it to the browser or commit it to Git.

## Functions

- `paystack-result-access` — creates a server-side ₦1,000 transaction reference and asks Paystack for a checkout URL.
- `paystack-result-verify` — verifies the reference directly with Paystack and creates the student's result-access grant only after Paystack reports a successful ₦1,000 NGN transaction.

Both functions require a valid Supabase Auth JWT.

## Required browser flow

1. Student signs in through Supabase Auth.
2. Student selects result checking.
3. Browser calls `paystack-result-access`.
4. Student completes Paystack checkout.
5. Browser calls `paystack-result-verify?reference=...`.
6. Supabase records the successful payment and grant.
7. Student result queries become available.

The database RLS policy independently blocks unpaid student result reads, so hiding the result UI is not the security boundary.

## Production check

Before the school goes live, test one successful ₦1,000 payment and one failed/cancelled payment. Confirm:

- failed payment creates no grant;
- wrong student cannot verify another student's reference;
- amount below/above ₦1,000 is rejected;
- result rows are unavailable before payment;
- result rows become available after successful verification.
