-- Household & membership (brief §2, §6, §7)
create extension if not exists "pgcrypto";

create table households (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  base_currency char(3) not null default 'AUD',
  created_at    timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text,
  role         text not null default 'member' check (role in ('owner','member')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email        text not null,
  token        text not null unique default encode(gen_random_bytes(16),'hex'),
  invited_by   uuid references auth.users(id),
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '14 days'),
  created_at   timestamptz not null default now()
);

-- Security definer so RLS policies can check membership without recursing
-- through household_members' own (also RLS-protected) select policy.
create or replace function is_household_member(hid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- Atomic household creation: insert the household + seat the creator as owner
-- in one transaction. Security definer because the caller isn't a member yet
-- (nothing to satisfy is_household_member with) at the moment of creation.
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

  -- Milestone 5 extends this to also seed default categories.
  return new_household_id;
end;
$$;

alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;

create policy "read own household" on households
  for select using (is_household_member(id));
-- No insert/update/delete policy: households are only created via the
-- create_household() security-definer RPC above, never a direct client insert.

create policy "read own membership rows" on household_members
  for select using (user_id = auth.uid() or is_household_member(household_id));
-- No insert/update/delete policy here either: membership rows are only ever
-- written by create_household() (owner seat) or the accept-invite Edge
-- Function (member seat via the invite token), both security-definer.

create policy "read household invites" on household_invites
  for select using (is_household_member(household_id));

create policy "create household invites" on household_invites
  for insert with check (is_household_member(household_id));

create policy "manage household invites" on household_invites
  for update using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy "delete household invites" on household_invites
  for delete using (is_household_member(household_id));
-- accept (token -> membership row) is redeemed by the invitee, who isn't yet
-- a member, so that step runs in the accept-invite Edge Function with the
-- service-role key, not through these policies.
