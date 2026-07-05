-- seed_default_categories writes into whatever household_id it's handed, so no
-- external caller should reach it. create_household (SECURITY DEFINER, owned by
-- postgres) still calls it fine because it runs as the definer, which retains
-- execute as the function owner.
revoke execute on function seed_default_categories(uuid) from anon;
revoke execute on function seed_default_categories(uuid) from authenticated;
