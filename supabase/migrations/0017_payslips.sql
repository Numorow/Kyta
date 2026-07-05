-- Payslips: gross-income granularity (brief §16.2 — gross, PAYG, super
-- guarantee), on top of the net income that lands in the bank.
create table payslips (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references households(id) on delete cascade,
  member_label          text,                         -- whose pay, e.g. 'Kyle'
  employer              text,
  pay_date              date not null,
  gross                 numeric(14,2) not null,
  tax                   numeric(14,2) not null default 0, -- PAYG withheld
  deductions            numeric(14,2) not null default 0, -- other, reduces net
  super                 numeric(14,2) not null default 0, -- super guarantee (employer)
  net                   numeric(14,2) not null,           -- gross - tax - deductions
  deposit_account_id    uuid references accounts(id) on delete set null,
  super_account_id      uuid references accounts(id) on delete set null,
  -- Links to the transactions this payslip generated, so deleting the payslip
  -- can cleanly reverse them.
  income_transaction_id uuid references transactions(id) on delete set null,
  super_transaction_id  uuid references transactions(id) on delete set null,
  created_by            uuid references auth.users(id),
  created_at            timestamptz not null default now()
);
create index payslips_household_date_idx on payslips(household_id, pay_date desc);

alter table payslips enable row level security;

create policy "write household payslips" on payslips
  for all using (is_household_member(household_id))
          with check (is_household_member(household_id));

-- New households should get a Super Contributions income category so super
-- guarantee lands somewhere sensible.
create or replace function seed_default_categories(hid uuid)
returns void language sql security definer
set search_path = public as $$
  insert into categories (household_id, name, kind, is_system) values
    (hid, 'Wages/Salary',        'income',   true),
    (hid, 'Bonus',               'income',   true),
    (hid, 'Interest/Dividends',  'income',   true),
    (hid, 'Super Contributions', 'income',   true),
    (hid, 'Refunds',             'income',   true),
    (hid, 'Other Income',        'income',   true),
    (hid, 'Mortgage/Rent',       'expense',  true),
    (hid, 'Utilities',           'expense',  true),
    (hid, 'Groceries',           'expense',  true),
    (hid, 'Transport/Fuel',      'expense',  true),
    (hid, 'Insurance',           'expense',  true),
    (hid, 'Health/Medical',      'expense',  true),
    (hid, 'Dining/Takeaway',     'expense',  true),
    (hid, 'Subscriptions',       'expense',  true),
    (hid, 'Kids',                'expense',  true),
    (hid, 'Pets',                'expense',  true),
    (hid, 'Shopping',            'expense',  true),
    (hid, 'Home Maintenance',    'expense',  true),
    (hid, 'Entertainment',       'expense',  true),
    (hid, 'Fees/Charges',        'expense',  true),
    (hid, 'Gifts/Donations',     'expense',  true),
    (hid, 'Miscellaneous',       'expense',  true),
    (hid, 'Transfer',            'transfer', true),
    (hid, 'Savings',             'transfer', true),
    (hid, 'Credit Card Payment', 'transfer', true),
    (hid, 'Offset',              'transfer', true);
$$;

revoke execute on function seed_default_categories(uuid) from public;
revoke execute on function seed_default_categories(uuid) from anon;
revoke execute on function seed_default_categories(uuid) from authenticated;
