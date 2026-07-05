-- The "write" (FOR ALL) policy already covers SELECT, so the separate "read"
-- (FOR SELECT) policy is redundant and forces Postgres to evaluate two
-- permissive policies on every read. Drop the read policies; the FOR ALL
-- policy alone gives members full read+write on their household's rows.
drop policy "read household accounts" on accounts;
drop policy "read household categories" on categories;
drop policy "read household transactions" on transactions;
