# Setup & deployment runbook

The app is fully built and the Supabase project (`household-finance`, ref
`dzxcrkoseqpjhwmthgyk`, region ap-southeast-2) already has all migrations and
Edge Functions deployed. The steps below are the few things that must be done
in the Supabase / Vercel dashboards (they can't be scripted safely from here).

## 1. Supabase Auth — URL configuration (required)

Authentication → URL Configuration:
- **Site URL**: your deployed URL (e.g. `https://finance.yourdomain.com`), or
  `http://localhost:5173` while developing.
- **Redirect URLs**: add the same origin(s). Magic-link and email-confirmation
  links redirect here (the app passes `emailRedirectTo: window.location.origin`).

Without this, magic-link / confirmation emails bounce users to the wrong place.

## 2. Supabase Auth — hardening (recommended)

- Authentication → Policies: enable **Leaked password protection**
  (HaveIBeenPwned check). Flagged by the security advisor.
- Offer (don't force) MFA to the two users.

## 3. Scheduled jobs (optional — powers auto-post & monthly snapshots)

Two Edge Functions are deployed but not yet scheduled:
`cron-post-recurring` (posts `auto_post` bills on their due date) and
`cron-snapshot` (monthly net-worth snapshot). Both are guarded by a shared
secret. Manual "mark as paid" and "Take snapshot" work without any of this;
scheduling only adds the automation.

1. Generate a random secret and set it as an Edge Function secret named
   `CRON_SECRET` (Edge Functions → Secrets, or `supabase secrets set`).
2. Enable the `pg_cron` and `pg_net` extensions (Database → Extensions).
3. Schedule the calls (SQL editor — replace `<SECRET>`):

```sql
-- Daily ~01:00 AEST (15:00 UTC) — post any due auto_post bills
select cron.schedule('post-recurring-daily', '0 15 * * *', $$
  select net.http_post(
    url := 'https://dzxcrkoseqpjhwmthgyk.supabase.co/functions/v1/cron-post-recurring',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<SECRET>')
  );
$$);

-- Monthly on the 1st ~01:00 AEST — capture a net-worth snapshot
select cron.schedule('snapshot-monthly', '0 15 1 * *', $$
  select net.http_post(
    url := 'https://dzxcrkoseqpjhwmthgyk.supabase.co/functions/v1/cron-snapshot',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<SECRET>')
  );
$$);
```

## 4. Vercel deployment

- Import the repo, framework preset **Vite**.
- Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (from `.env`).
- The service-role key is **never** set on the frontend — it lives only in the
  Supabase Edge Function environment.

## 5. Backups

Database → Backups: enable point-in-time recovery / scheduled backups. This is
the couple's only copy of their financial data.

## 6. (Later) Real invite emails

Invites currently generate a shareable link you send yourself. To email them
automatically, add a transactional-email provider (e.g. Resend) and extend the
invite flow with a send step — deferred for MVP per the build brief.
