-- Categories (brief §6). Created ahead of budgets (Milestone 5) because
-- transactions.category_id references this table.
create table categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  kind         text not null check (kind in ('income','expense','transfer')),
  parent_id    uuid references categories(id) on delete set null,
  color        text,
  icon         text,
  is_system    boolean not null default false,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index categories_household_id_idx on categories(household_id);
create index categories_parent_id_idx on categories(parent_id);

alter table categories enable row level security;

create policy "read household categories" on categories
  for select using (is_household_member(household_id));
create policy "write household categories" on categories
  for all using (is_household_member(household_id))
          with check (is_household_member(household_id));

-- Seed the default category set (brief §6) for a household. Called by
-- create_household so every new household starts with a sensible set.
create or replace function seed_default_categories(hid uuid)
returns void language sql security definer
set search_path = public as $$
  insert into categories (household_id, name, kind, is_system) values
    (hid, 'Wages/Salary',        'income',   true),
    (hid, 'Bonus',               'income',   true),
    (hid, 'Interest/Dividends',  'income',   true),
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

-- Extend create_household to also seed default categories atomically.
create or replace function create_household(household_name text)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  new_household_id uuid;
begin
  insert into households (name) values (household_name)
    returning id into new_household_id;

  insert into household_members (household_id, user_id, role)
    values (new_household_id, auth.uid(), 'owner');

  perform seed_default_categories(new_household_id);

  return new_household_id;
end;
$$;

revoke execute on function create_household(text) from public;
revoke execute on function create_household(text) from anon;
grant execute on function create_household(text) to authenticated;
