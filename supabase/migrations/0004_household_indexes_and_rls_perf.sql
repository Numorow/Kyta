-- Cover FKs used for lookups (advisor: unindexed_foreign_keys).
create index if not exists household_invites_household_id_idx on household_invites(household_id);
create index if not exists household_invites_invited_by_idx on household_invites(invited_by);
-- household_members' PK is (household_id, user_id); a lookup by user_id alone
-- (e.g. "find all my households") can't use that composite index efficiently.
create index if not exists household_members_user_id_idx on household_members(user_id);

-- auth.uid() wrapped in a scalar subselect is evaluated once per statement
-- instead of once per row (advisor: auth_rls_initplan).
drop policy "read own membership rows" on household_members;
create policy "read own membership rows" on household_members
  for select using (user_id = (select auth.uid()) or is_household_member(household_id));
