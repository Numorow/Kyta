-- Savings goals (next phase: Goals & forecasting).
--
-- Progress comes from explicit contribution rows — the single source of truth,
-- mirroring budget_actuals — NOT from a linked account's balance: one account
-- can back several goals, an account holds non-goal money too, and a goal can
-- exist before any account. `linked_account_id` is optional display-only
-- metadata ("available in this account"). Goals are archived via `is_active`
-- (the recurring_rules house convention), never hard-deleted, to keep history.
create table goals (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,
  name              text not null,
  target_amount     numeric(14,2) not null check (target_amount > 0),
  target_date       date,                                             -- optional deadline
  linked_account_id uuid references accounts(id) on delete set null,  -- optional, display only
  color             text,
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);
create index goals_household_id_idx on goals(household_id);
create index goals_linked_account_id_idx on goals(linked_account_id);

alter table goals enable row level security;

create policy "write household goals" on goals
  for all using (is_household_member(household_id))
          with check (is_household_member(household_id));

-- Contributions toward a goal. Signed: + deposit / − withdrawal, so `saved`
-- can go down. household_id is denormalised onto the child so the FOR ALL
-- with-check, the realtime household filter, and goal_progress all work.
create table goal_contributions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  goal_id      uuid not null references goals(id) on delete cascade,
  contrib_date date not null default current_date,
  amount       numeric(14,2) not null,   -- signed: + deposit / − withdrawal
  note         text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
create index goal_contributions_household_id_idx on goal_contributions(household_id);
create index goal_contributions_goal_id_idx on goal_contributions(goal_id);

alter table goal_contributions enable row level security;

create policy "write household goal_contributions" on goal_contributions
  for all using (is_household_member(household_id))
          with check (is_household_member(household_id));

-- Saved-per-goal (mirrors budget_actuals). SECURITY INVOKER (the default) means
-- the caller's RLS on goal_contributions applies, so it only ever sees rows for
-- the caller's own household.
create or replace function goal_progress(p_household uuid)
returns table(goal_id uuid, saved numeric)
language sql stable
set search_path = public as $$
  select gc.goal_id, sum(gc.amount) as saved
  from goal_contributions gc
  where gc.household_id = p_household
  group by gc.goal_id;
$$;

revoke execute on function goal_progress(uuid) from public;
revoke execute on function goal_progress(uuid) from anon;
grant execute on function goal_progress(uuid) to authenticated;
