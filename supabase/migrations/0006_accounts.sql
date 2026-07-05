-- Accounts: assets & liabilities (brief §6, §8.3)
create table accounts (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references households(id) on delete cascade,
  name                 text not null,
  class                text not null check (class in ('asset','liability')),
  subtype              text not null check (subtype in
    ('transaction','savings','credit_card','mortgage','personal_loan',
     'superannuation','investment','property','vehicle','cash','other')),
  institution          text,
  balance_mode         text not null default 'tracked'
                         check (balance_mode in ('tracked','statement')),
  opening_balance      numeric(14,2) not null default 0,
  opening_date         date not null default current_date,
  statement_balance    numeric(14,2),        -- used when balance_mode = 'statement'
  include_in_net_worth boolean not null default true,
  archived             boolean not null default false,
  sort_order           int not null default 0,
  created_at           timestamptz not null default now()
);
create index accounts_household_id_idx on accounts(household_id);

alter table accounts enable row level security;

create policy "read household accounts" on accounts
  for select using (is_household_member(household_id));
create policy "write household accounts" on accounts
  for all using (is_household_member(household_id))
          with check (is_household_member(household_id));
