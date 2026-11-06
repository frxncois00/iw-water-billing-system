begin;
-- Older installations may still tie every customer ID to a portal profile.
alter table public.customers drop constraint if exists customers_id_fkey;
create table public.customer_migrations (
 customer_id uuid primary key references public.customers(id),
 property_type text not null,
 connection_date date,
 opening_balance numeric(12,2) not null default 0 check(opening_balance>=0),
 notes text,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.customer_migrations enable row level security;
create policy staff_read on public.customer_migrations for select to authenticated using(public.get_my_role() in ('admin','cashier'));
grant select on public.customer_migrations to authenticated;
create function public.add_existing_customer(p_name text,p_mobile text,p_email text,p_address text,p_type text,p_meter text,p_reading numeric,p_connection date,p_balance numeric,p_status text,p_notes text)
returns uuid language plpgsql security definer set search_path=public as $$
declare c uuid:=gen_random_uuid(); a uuid; n text;
begin
 if public.get_my_role() is distinct from 'admin' then raise exception 'Administrator access required'; end if;
 if nullif(trim(p_name),'') is null or nullif(trim(p_mobile),'') is null or nullif(trim(p_address),'') is null or nullif(trim(p_type),'') is null or nullif(trim(p_meter),'') is null then raise exception 'Complete all required customer fields'; end if;
 if p_reading is null or p_reading<0 or p_balance is null or p_balance<0 or p_status not in ('active','inactive') then raise exception 'Invalid reading, balance, or status'; end if;
 lock table public.contract_accounts in share row exclusive mode;
 if exists(select 1 from public.contract_accounts where upper(trim(meter_no))=upper(trim(p_meter))) then raise exception 'Meter number already registered'; end if;
 loop
 n:=floor(100000000+random()*900000000)::bigint::text;
 exit when not exists(select 1 from public.contract_accounts where can=n);
 end loop;
 insert into public.customers(id,address,contact_no,meter_no,status) values(c,trim(p_address),trim(p_mobile),upper(trim(p_meter)),p_status);
 insert into public.contract_accounts(can,legacy_customer_id,account_name,service_address,meter_no,installation_reading,status) values(n,c,trim(p_name),trim(p_address),upper(trim(p_meter)),p_reading,p_status) returning id into a;
 insert into public.account_contacts(account_id,phone,email) values(a,trim(p_mobile),nullif(trim(p_email),''));
 insert into public.customer_migrations(customer_id,property_type,connection_date,opening_balance,notes,created_by) values(c,p_type,p_connection,p_balance,p_notes,auth.uid());
 return c;
end $$;
revoke all on function public.add_existing_customer(text,text,text,text,text,text,numeric,date,numeric,text,text) from public,anon;
grant execute on function public.add_existing_customer(text,text,text,text,text,text,numeric,date,numeric,text,text) to authenticated;
commit;
