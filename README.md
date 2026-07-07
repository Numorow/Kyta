# 2Up

Private, shared finance tracker for two — spending vs budget, income, upcoming bills, goals, cashflow forecast, and net worth. Spec: [`FINANCE-TRACKER-BUILD-BRIEF.md`](../FINANCE-TRACKER-BUILD-BRIEF.md).

## Stack

React + Vite + TypeScript, Tailwind CSS v4 + shadcn/ui, TanStack Table/Query, Recharts, react-hook-form + zod, date-fns, Supabase (Postgres/Auth/RLS/Realtime/Edge Functions), vite-plugin-pwa.

## Setup

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

`.env` holds only the public anon key — never the service-role key (that stays server-side in Supabase Edge Functions).

## Scripts

- `npm run dev` — dev server
- `npm run build` — typecheck + production build
- `npm run lint` — oxlint
