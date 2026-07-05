-- Budgets (brief §6, §8.4)
create table budgets (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id  uuid not null references categories(id) on delete cascade,
  period       text not null check (period in ('weekly','fortnightly','monthly','annual')),
  amount       numeric(14,2) not null,
  rollover     boolean not null default false,
  start_date   date not null default date_trunc('month', current_date),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (household_id, category_id, period)
);
create index budgets_household_id_idx on budgets(household_id);
create index budgets_category_id_idx on budgets(category_id);

alter table budgets enable row level security;

create policy "write household budgets" on budgets
  for all using (is_household_member(household_id))
          with check (is_household_member(household_id));

-- Actual spend per category within a date window (brief §8.4). Expenses are
-- stored negative, so negate the sum to get spend as a positive number.
-- SECURITY INVOKER (the default) means the caller's RLS on transactions
-- applies, so this only ever sees the caller's own household.
create or replace function budget_actuals(p_household uuid, p_from date, p_to date)
returns table(category_id uuid, spend numeric)
language sql stable
set search_path = public as $$
  select t.category_id, -sum(t.amount) as spend
  from transactions t
  where t.household_id = p_household
    and t.type = 'expense'
    and t.category_id is not null
    and t.txn_date between p_from and p_to
  group by t.category_id;
$$;

revoke execute on function budget_actuals(uuid, date, date) from public;
revoke execute on function budget_actuals(uuid, date, date) from anon;
grant execute on function budget_actuals(uuid, date, date) to authenticated;
