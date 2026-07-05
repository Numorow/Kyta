-- CSV import support (brief §8.2)

-- One row per import run — provenance + lets an import be rolled back as a unit.
create table import_batches (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  account_id   uuid references accounts(id) on delete set null,
  filename     text,
  row_count    int not null default 0,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
create index import_batches_household_id_idx on import_batches(household_id);

alter table transactions
  add column import_batch_id uuid references import_batches(id) on delete set null;
create index transactions_import_batch_idx on transactions(import_batch_id);

-- Saved column mapping per account so re-importing the same bank's export is
-- one click. mapping jsonb holds column indices + amount mode + date format.
create table import_mappings (
  household_id uuid not null references households(id) on delete cascade,
  account_id   uuid not null references accounts(id) on delete cascade,
  mapping      jsonb not null,
  updated_at   timestamptz not null default now(),
  primary key (household_id, account_id)
);

alter table import_batches enable row level security;
alter table import_mappings enable row level security;

create policy "write household import_batches" on import_batches
  for all using (is_household_member(household_id))
          with check (is_household_member(household_id));
create policy "write household import_mappings" on import_mappings
  for all using (is_household_member(household_id))
          with check (is_household_member(household_id));
