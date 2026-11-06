-- Offline service customers do not require portal profiles or auth users.
-- This is the same identity separation used by activate_application.
-- Existing rows, primary keys, and bill/payment references remain unchanged.
begin;
alter table public.customers drop constraint if exists customers_id_fkey;
commit;
