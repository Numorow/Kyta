-- Members list with emails for the Settings screen (brief §8.8). SECURITY
-- DEFINER to read auth.users, but guarded by is_household_member(hid) so a
-- caller only ever sees members of a household they themselves belong to.
create or replace function household_members_detail(hid uuid)
returns table(user_id uuid, role text, display_name text, email text)
language sql security definer stable
set search_path = public as $$
  select hm.user_id, hm.role, hm.display_name, u.email::text
  from household_members hm
  join auth.users u on u.id = hm.user_id
  where hm.household_id = hid and is_household_member(hid);
$$;

revoke execute on function household_members_detail(uuid) from public;
revoke execute on function household_members_detail(uuid) from anon;
grant execute on function household_members_detail(uuid) to authenticated;
