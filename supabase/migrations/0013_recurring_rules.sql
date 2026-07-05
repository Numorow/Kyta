-- Recurring rules: bills, subscriptions, wages (brief §6, §8.5)
create table recurring_rules (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  type          text not null check (type in ('income','expense')),
  amount        numeric(14,2) not null,       -- positive magnitude
  account_id    uuid references accounts(id) on delete set null,
  category_id   uuid references categories(id) on delete set null,
  frequency     text not null check (frequency in
                  ('weekly','fortnightly','monthly','quarterly','annually','custom')),
  interval_count int not null default 1,
  anchor_date   date not null,
  day_of_month  int,
  end_date      date,
  next_due_date date,
  auto_post     boolean not null default false, -- defaults off: manual mark-as-paid
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index recurring_rules_household_id_idx on recurring_rules(household_id);
create index recurring_rules_account_id_idx on recurring_rules(account_id);
create index recurring_rules_category_id_idx on recurring_rules(category_id);

-- Wire the transactions FK now that the target table exists.
alter table transactions
  add constraint transactions_recurring_rule_id_fkey
  foreign key (recurring_rule_id) references recurring_rules(id) on delete set null;

alter table recurring_rules enable row level security;

create policy "write household recurring_rules" on recurring_rules
  for all using (is_household_member(household_id))
          with check (is_household_member(household_id));
