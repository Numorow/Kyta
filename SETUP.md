# Setup & deployment runbook

The app is fully built and the Supabase project (`household-finance`, ref
`dzxcrkoseqpjhwmthgyk`, region ap-southeast-2) has migrations 0001–0017 and the
Edge Functions deployed. The steps below are the few things that must be done
in the Supabase / Vercel dashboards (they can't be scripted safely from here).

> **This phase (Goals & forecasting) adds migrations `0018_savings_goals.sql`
> and `0019_realtime_goals.sql`, which are NOT yet applied.** Apply them and
> regenerate types before the goals feature works against the live DB — see §7.
> Forecast and Reports insights need no migration (pure client logic over
> existing tables).

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

**Status: LIVE.** Deployed at https://app-two-puce-99.vercel.app, and the Vercel
project is connected to the GitHub repo (github.com/Numorow/Kyta) — pushing to
`main` auto-deploys to production. `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
are set in the project for Production + Preview. The steps below are the
original one-time setup, kept for reference.

- Import the repo, framework preset **Vite**.
- Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (from `.env`).
- The service-role key is **never** set on the frontend — it lives only in the
  Supabase Edge Function environment.
- `vercel.json` (committed) handles SPA routing so deep links like `/goals` and
  `/forecast` don't 404 on refresh, plus baseline security headers.
- `package.json` pins `engines.node` to `22.x`; set Node 22 in Project Settings
  → Build too so Vercel builds on the same major.

## 5. Backups

Database → Backups: enable point-in-time recovery / scheduled backups. This is
the couple's only copy of their financial data.

## 6. (Later) Real invite emails

Invites currently generate a shareable link you send yourself. To email them
automatically, add a transactional-email provider (e.g. Resend) and extend the
invite flow with a send step — deferred for MVP per the build brief.

## 7. Apply this phase's migrations (Goals) + regenerate types

The Goals feature needs two new migrations applied to the finance project.
**Important:** target ref `dzxcrkoseqpjhwmthgyk` — do not run these against any
other project. With the Supabase CLI:

```bash
supabase link --project-ref dzxcrkoseqpjhwmthgyk   # one-time, needs your access token
supabase db push                                   # applies 0018_savings_goals + 0019_realtime_goals
supabase gen types typescript --linked > src/types/database.ts   # replace the hand-added types
```

`src/types/database.ts` currently carries **hand-written** `goals`,
`goal_contributions` and `goal_progress` types (marked with a NOTE) so the app
builds before the migration is applied — the `gen types` step above replaces
them with the real generated file. Commit the regenerated file.

## 8. Verify household RLS isolation (recommended)

Two ways to prove household A can't read household B, both through the real
anon-key path (a superuser/pgTAP check would bypass RLS and prove nothing):

- `npm run verify:rls` — the standalone script (households + members).
- `npx vitest run src/lib/rls-isolation.test.ts` — the same flow plus the newer
  tables (goals, goal_contributions, balance_snapshots, payslips). Both need two
  confirmed test accounts with no household yet (see the file headers for the
  env vars). They stay skipped in the default `npm test`.
