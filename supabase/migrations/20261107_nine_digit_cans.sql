-- Standardize every Contract Account Number as nine random digits.
-- Existing valid nine-digit CANs remain unchanged. Legacy/alphanumeric CANs
-- receive a new numeric CAN without changing the account UUID, bills, or meter.
begin;

alter table public.contract_accounts drop constraint if exists contract_accounts_can_format;
do $$
declare v_account record; v_can text;
begin
  for v_account in
    select id from public.contract_accounts
    where can is null or can !~ '^\d{9}$'
    order by created_at,id for update
  loop
    loop
      v_can := floor(100000000 + random() * 900000000)::bigint::text;
      exit when not exists(select 1 from public.contract_accounts where can=v_can);
    end loop;
    update public.contract_accounts set can=v_can,updated_at=now() where id=v_account.id;
  end loop;
end;
$$;

alter table public.contract_accounts
  add constraint contract_accounts_can_format check (can is null or can ~ '^\d{9}$');

commit;
