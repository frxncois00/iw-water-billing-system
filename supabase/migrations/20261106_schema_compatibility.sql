-- Compatibility migration for projects where the requested-documents migration
-- was not applied completely. Safe to run more than once.
begin;

alter table public.contract_accounts
  add column if not exists installation_reading numeric(12,2)
  check (installation_reading is null or installation_reading >= 0);

alter table public.service_cases
  add column if not exists customer_message text;

alter table public.service_applications
  add column if not exists customer_message text;

commit;
