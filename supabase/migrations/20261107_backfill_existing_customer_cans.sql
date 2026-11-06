-- Assign CANs to legacy service accounts that predate the application workflow.
-- Existing CANs are preserved. Issued bills, payments, meters, and customer IDs
-- are not changed.
begin;

do $$
declare
  v_account record;
  v_can text;
begin
  for v_account in
    select id
    from public.contract_accounts
    where can is null
    order by created_at, id
    for update
  loop
    loop
      v_can := floor(100000000 + random() * 900000000)::bigint::text;
      exit when not exists (
        select 1 from public.contract_accounts where upper(can) = upper(v_can)
      );
    end loop;

    update public.contract_accounts
      set can = v_can, updated_at = now()
      where id = v_account.id and can is null;
  end loop;
end;
$$;

commit;
