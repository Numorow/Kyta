-- Transactions (brief §6, §8.2). Signed convention: negative = money out,
-- positive = money in.
create table transactions (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,
  account_id        uuid not null references accounts(id) on delete restrict,
  txn_date          date not null,
  amount            numeric(14,2) not null,    -- signed: - out / + in
  type              text not null check (type in ('income','expense','transfer')),
  category_id       uuid references categories(id) on delete set null,
  description       text,
  merchant          text,
  notes             text,
  transfer_group_id uuid,                       -- links the two legs of a transfer
  recurring_rule_id uuid,                       -- FK added in Milestone 6
  status            text not null default 'cleared' check (status in ('cleared','pending')),
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now()
);
create index transactions_household_date_idx on transactions (household_id, txn_date desc);
create index transactions_account_id_idx on transactions (account_id);
create index transactions_category_id_idx on transactions (category_id);
create index transactions_transfer_group_idx on transactions (transfer_group_id);

alter table transactions enable row level security;

create policy "read household transactions" on transactions
  for select using (is_household_member(household_id));
create policy "write household transactions" on transactions
  for all using (is_household_member(household_id))
          with check (is_household_member(household_id));

-- Current balance per account (brief §10):
--   tracked   → opening_balance + Σ(cleared signed transactions)
--   statement → statement_balance (last entered)
-- security_invoker = true is critical: without it the view runs as its owner
-- (postgres) and bypasses RLS on accounts/transactions, leaking other
-- households' balances. With it, the caller's RLS applies.
create view account_balances
  with (security_invoker = true) as
select
  a.id           as account_id,
  a.household_id,
  a.class,
  a.include_in_net_worth,
  case
    when a.balance_mode = 'statement' then coalesce(a.statement_balance, 0)
    else a.opening_balance + coalesce((
      select sum(t.amount)
      from transactions t
      where t.account_id = a.id
        and t.status = 'cleared'
    ), 0)
  end as balance
from accounts a
where not a.archived;

-- Net worth right now (brief §10): Σ(included asset balances) − Σ(included
-- liability balances). Liabilities are stored as positive magnitudes, so
-- subtract them. Grouped by household so RLS on the underlying view scopes it.
create view net_worth_current
  with (security_invoker = true) as
select
  ab.household_id,
  coalesce(sum(ab.balance) filter (where ab.class = 'asset'), 0)     as total_assets,
  coalesce(sum(ab.balance) filter (where ab.class = 'liability'), 0) as total_liabilities,
  coalesce(sum(ab.balance) filter (where ab.class = 'asset'), 0)
    - coalesce(sum(ab.balance) filter (where ab.class = 'liability'), 0) as net_worth
from account_balances ab
where ab.include_in_net_worth
group by ab.household_id;
