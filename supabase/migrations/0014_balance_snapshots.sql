-- Net worth snapshots (brief §6, §8.6). Immutable historical points: the
-- totals are stored as computed at snapshot time and never recomputed, so
-- later edits to current balances don't rewrite history.
create table balance_snapshots (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,
  snapshot_date     date not null,
  total_assets      numeric(14,2) not null,
  total_liabilities numeric(14,2) not null,
  net_worth         numeric(14,2) not null,
  breakdown         jsonb,                      -- per-account detail at capture
  created_at        timestamptz not null default now(),
  unique (household_id, snapshot_date)
);
create index balance_snapshots_household_id_idx on balance_snapshots(household_id);

alter table balance_snapshots enable row level security;

create policy "write household balance_snapshots" on balance_snapshots
  for all using (is_household_member(household_id))
          with check (is_household_member(household_id));
