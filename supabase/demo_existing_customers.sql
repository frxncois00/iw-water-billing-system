-- Optional fictional demo data. Run after 20261108_existing_customers.sql.
-- Uses an existing administrator for audit attribution; creates no login users.
begin;
do $$
declare admin_id uuid; r record;
begin
 select id into admin_id from public.profiles where role='admin' order by created_at limit 1;
 if admin_id is null then raise exception 'An administrator is required'; end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 for r in select * from (values
 ('Elena Mercado','09170000001','elena.mercado@example.com','14 Sampaguita Street, Isabel','Residential','DEMO-MTR-001',124.50),
 ('Rafael Dela Cruz','09170000002','rafael.delacruz@example.com','28 Mabini Street, Isabel','Residential','DEMO-MTR-002',86.25),
 ('Lourdes Navarro','09170000003','lourdes.navarro@example.com','7 Rizal Street, Isabel','Commercial','DEMO-MTR-003',340.00),
 ('Miguel Santos','09170000004','miguel.santos@example.com','19 Acacia Street, Isabel','Residential','DEMO-MTR-004',57.75)
 ) as sample(name,mobile,email,address,property,meter,reading)
 loop
 if not exists(select 1 from public.customers where meter_no=r.meter) then
 perform public.add_existing_customer(r.name,r.mobile,r.email,r.address,r.property,r.meter,r.reading,date '2024-01-15',0,'active','FICTIONAL DEMO CUSTOMER. Phone is illustrative and unverified; do not contact.');
 end if;
 end loop;
end $$;
commit;
