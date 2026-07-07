-- Let a user set their own display name (2Up attribution). household_members has
-- no client UPDATE policy, and a member must not be able to change their own
-- role, so this SECURITY DEFINER RPC updates ONLY display_name for the caller's
-- own membership row(s). Empty/blank clears it (falls back to the email prefix).
create or replace function set_my_display_name(p_name text)
returns void
language sql volatile
security definer
set search_path = public as $$
  update household_members
    set display_name = nullif(btrim(p_name), '')
    where user_id = auth.uid();
$$;

revoke execute on function set_my_display_name(text) from public;
revoke execute on function set_my_display_name(text) from anon;
grant execute on function set_my_display_name(text) to authenticated;
