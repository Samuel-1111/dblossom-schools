# Supabase Edge Functions

Deploy the result-access payment functions from the Supabase project:

```bash
supabase functions deploy paystack-result-access
supabase functions deploy paystack-result-verify
supabase secrets set PAYSTACK_SECRET_KEY=your_paystack_secret PUBLIC_SITE_URL=https://your-school-domain.example
```

The Paystack secret stays in Supabase Function Secrets. It must not be added to Netlify or exposed in browser code. The functions initialize and verify exactly **₦1,000 (100000 kobo) in NGN**, then write `result_access_payments` and `result_access_grants` through the service-role client held by the Edge Function runtime.
