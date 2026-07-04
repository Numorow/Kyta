-- Both functions are meant for signed-in household members only; the anon
-- role has no valid auth.uid() and no business calling either.
revoke execute on function is_household_member(uuid) from public;
grant execute on function is_household_member(uuid) to authenticated;

revoke execute on function create_household(text) from public;
grant execute on function create_household(text) to authenticated;
