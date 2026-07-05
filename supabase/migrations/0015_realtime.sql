-- Enable Realtime on the tables the dashboard reflects live, so when one
-- partner adds/edits something the other's screen updates (brief §8.1, §5).
-- RLS still applies to realtime streams, so each client only receives changes
-- for its own household.
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table accounts;
alter publication supabase_realtime add table budgets;
