-- Reconciliation model (brief §10): account balances are SIGNED from the
-- household's net-worth perspective — assets positive, liabilities negative
-- (debt reduces equity). Combined with the uniform signed-transaction
-- convention (expense = money out = negative), a credit-card purchase makes
-- the liability balance more negative (more owed), and net worth is simply the
-- sum of every included balance. total_liabilities is surfaced as a positive
-- magnitude for display.
create or replace view net_worth_current
  with (security_invoker = true) as
select
  ab.household_id,
  coalesce(sum(ab.balance) filter (where ab.class = 'asset'), 0)      as total_assets,
  coalesce(-sum(ab.balance) filter (where ab.class = 'liability'), 0) as total_liabilities,
  coalesce(sum(ab.balance), 0)                                        as net_worth
from account_balances ab
where ab.include_in_net_worth
group by ab.household_id;
