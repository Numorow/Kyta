-- Live-sync goals + contributions so a partner's saving shows on the other's
-- screen (brief §8.1, matching 0015). RLS still scopes each realtime stream per
-- household. Note: `add table` errors if the table is already published, so run
-- this migration exactly once.
alter publication supabase_realtime add table goals;
alter publication supabase_realtime add table goal_contributions;
