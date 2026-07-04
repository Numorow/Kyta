-- Supabase grants EXECUTE to anon/authenticated directly on new functions
-- (separate from PUBLIC), so the earlier "revoke ... from public" didn't
-- touch anon's direct grant. Revoke it explicitly.
revoke execute on function is_household_member(uuid) from anon;
revoke execute on function create_household(text) from anon;
