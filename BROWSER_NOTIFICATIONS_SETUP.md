# Browser message notifications
1. Run `supabase/migrations/20261009_browser_push_subscriptions.sql` in the school's Supabase SQL Editor.
2. Install dependencies with `npm install`.
3. Generate VAPID keys with `npx web-push generate-vapid-keys`.
4. Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (for example `mailto:school-admin@example.com`) to your deployment host's server-side environment variables (Netlify Site configuration or Vercel Project Settings, depending on where this repository is deployed). Never commit the private key.
5. Redeploy when the Vercel build limit allows it.
6. Sign in on each device as parent, teacher, and administrator and click **Enable browser notifications** once. Permission/subscription is per browser and device.
7. Test by sending a parent message, teacher reply, and parent-to-admin message. The recipient should receive a browser notification even when the portal tab is not open, provided their browser/device supports push and notifications are permitted.
