-- ISABEL WATERS | Billing & Collection
-- Run once in the Supabase SQL Editor on a new project.
-- Auth users are created through Supabase Auth, never by inserting into auth.users here.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key references public.profiles(id) on delete cascade,
  contact_no text not null default '',
  address text not null default '',
  meter_no text not null unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meter_no_not_blank check (length(trim(meter_no)) > 0)
);
create unique index if not exists customers_meter_no_ci_idx on public.customers (upper(meter_no));
create index if not exists customers_status_idx on public.customers(status);

create table if not exists public.water_rates (
  id bigint generated always as identity primary key,
  rate_per_m3 numeric(10,2) not null check (rate_per_m3 >= 0),
  effective_from date not null unique,
  created_at timestamptz not null default now()
);
create index if not exists water_rates_effective_idx on public.water_rates(effective_from desc);

create sequence if not exists public.bill_number_seq;
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  bill_no text not null unique default ('IW-' || lpad(nextval('public.bill_number_seq')::text, 6, '0')),
  customer_id uuid not null references public.customers(id) on delete restrict,
  billing_month date not null check (extract(day from billing_month) = 1),
  bill_date date not null default current_date,
  due_date date not null,
  previous_reading numeric(12,2) not null check (previous_reading >= 0),
  current_reading numeric(12,2) not null check (current_reading >= previous_reading),
  water_used numeric(12,2) not null default 0,
  rate_per_m3 numeric(10,2) not null check (rate_per_m3 >= 0),
  amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  balance numeric(12,2) not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
  created_at timestamptz not null default now(),
  unique (customer_id, billing_month),
  constraint amount_paid_within_bill check (amount_paid >= 0 and amount_paid <= amount)
);
create index if not exists bills_month_idx on public.bills(billing_month desc);
create index if not exists bills_customer_idx on public.bills(customer_id, billing_month desc);
create index if not exists bills_due_idx on public.bills(due_date) where status <> 'paid';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('Cash', 'GCash', 'Other')),
  reference_no text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists payments_bill_idx on public.payments(bill_id, paid_at desc);

create table if not exists public.settings (
  key text primary key,
  value numeric(14,2) not null check (value >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

create or replace function public.is_active_customer()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.customers c
    join public.profiles p on p.id = c.id
    where c.id = (select auth.uid()) and c.status = 'active' and p.role = 'customer'
  );
$$;

-- For registration validation. The unique meter constraint remains the final race-safe check.
create or replace function public.is_meter_number_available(requested_meter text)
returns boolean language sql stable security definer set search_path = '' as $$
  select nullif(trim(requested_meter), '') is not null
    and not exists (
      select 1 from public.customers where upper(meter_no) = upper(trim(requested_meter))
    );
$$;

-- One transaction for the staff review form, including approval or deactivation.
create or replace function public.admin_update_customer(
  p_customer_id uuid, p_full_name text, p_contact_no text,
  p_address text, p_meter_no text, p_status text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Access denied'; end if;
  if nullif(trim(p_full_name), '') is null or nullif(trim(p_address), '') is null
     or nullif(trim(p_meter_no), '') is null then
    raise exception 'Name, address, and meter number are required';
  end if;
  update public.profiles set full_name = trim(p_full_name)
  where id = p_customer_id and role = 'customer';
  if not found then raise exception 'Customer profile not found'; end if;
  update public.customers set
    contact_no = trim(coalesce(p_contact_no, '')),
    address = trim(p_address),
    meter_no = upper(trim(p_meter_no)),
    status = p_status
  where id = p_customer_id;
  if not found then raise exception 'Customer record not found'; end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  requested_meter text := upper(trim(coalesce(new.raw_user_meta_data ->> 'meter_no', '')));
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 'customer');

  -- Staff users created manually in Auth have no meter metadata. Promote their profile
  -- with the SQL Editor after creation; they never receive a customer row.
  if requested_meter <> '' then
    insert into public.customers (id, contact_no, address, meter_no, status)
    values (
      new.id,
      trim(coalesce(new.raw_user_meta_data ->> 'contact_no', '')),
      trim(coalesce(new.raw_user_meta_data ->> 'address', '')),
      requested_meter,
      'pending'
    );
  end if;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Existing Auth users predate the trigger. Backfill their profiles and any
-- registrations with meter metadata without changing an already reviewed status.
insert into public.profiles (id, full_name, role)
select id, trim(coalesce(raw_user_meta_data ->> 'full_name', '')), 'customer'
from auth.users
on conflict (id) do nothing;

insert into public.customers (id, contact_no, address, meter_no, status)
select id,
  trim(coalesce(raw_user_meta_data ->> 'contact_no', '')),
  trim(coalesce(raw_user_meta_data ->> 'address', '')),
  upper(trim(raw_user_meta_data ->> 'meter_no')),
  'pending'
from auth.users
where nullif(trim(raw_user_meta_data ->> 'meter_no'), '') is not null
on conflict do nothing;

create or replace function public.guard_customer_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.id is distinct from old.id
      or new.meter_no is distinct from old.meter_no
      or new.status is distinct from old.status
      or new.created_at is distinct from old.created_at then
      raise exception 'Customers may change only contact number and address';
    end if;
  end if;
  new.meter_no := upper(trim(new.meter_no));
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists customers_guard_update on public.customers;
create trigger customers_guard_update before update on public.customers
  for each row execute function public.guard_customer_update();

create or replace function public.calculate_bill()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.current_reading < new.previous_reading then
    raise exception 'Current reading cannot be less than previous reading';
  end if;
  new.water_used := new.current_reading - new.previous_reading;
  new.amount := round(new.water_used * new.rate_per_m3, 2);
  new.balance := round(new.amount - new.amount_paid, 2);
  if new.balance < 0 then
    raise exception 'Bill payments cannot exceed the billed amount';
  end if;
  new.status := case
    when new.balance = 0 then 'paid'
    when new.amount_paid > 0 then 'partial'
    else 'unpaid'
  end;
  return new;
end;
$$;
drop trigger if exists bills_calculate on public.bills;
create trigger bills_calculate before insert or update on public.bills
  for each row execute function public.calculate_bill();

-- Recalculate from the ledger on inserts, edits, and deletions. Locking the bill
-- serializes concurrent collections; an overpayment aborts the payment transaction.
create or replace function public.recalculate_bill_payments(target_bill uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  total_paid numeric(12,2);
begin
  perform 1 from public.bills where id = target_bill for update;
  if not found then return; end if;
  select coalesce(sum(amount), 0) into total_paid
  from public.payments where bill_id = target_bill;
  update public.bills set amount_paid = total_paid where id = target_bill;
end;
$$;

create or replace function public.apply_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.recalculate_bill_payments(new.bill_id);
  elsif tg_op = 'DELETE' then
    perform public.recalculate_bill_payments(old.bill_id);
  else
    -- Stable ordering avoids a deadlock if an edit moves a payment between bills.
    if old.bill_id = new.bill_id then
      perform public.recalculate_bill_payments(new.bill_id);
    elsif old.bill_id < new.bill_id then
      perform public.recalculate_bill_payments(old.bill_id);
      perform public.recalculate_bill_payments(new.bill_id);
    else
      perform public.recalculate_bill_payments(new.bill_id);
      perform public.recalculate_bill_payments(old.bill_id);
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists payments_apply on public.payments;
create trigger payments_apply after insert or update or delete on public.payments
  for each row execute function public.apply_payment();

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.water_rates enable row level security;
alter table public.bills enable row level security;
alter table public.payments enable row level security;
alter table public.settings enable row level security;

create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy profiles_own_read on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy customers_admin_all on public.customers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy customers_own_read on public.customers for select to authenticated
  using (id = (select auth.uid()));
create policy customers_own_contact_update on public.customers for update to authenticated
  using (id = (select auth.uid()) and not public.is_admin())
  with check (id = (select auth.uid()) and not public.is_admin());

create policy water_rates_public_read on public.water_rates for select to anon, authenticated
  using (true);
create policy water_rates_admin_all on public.water_rates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy bills_admin_all on public.bills for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy bills_active_customer_read on public.bills for select to authenticated
  using (customer_id = (select auth.uid()) and public.is_active_customer());

create policy payments_admin_all on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy payments_active_customer_read on public.payments for select to authenticated
  using (public.is_active_customer() and exists (
    select 1 from public.bills where id = bill_id and customer_id = (select auth.uid())
  ));

create policy settings_admin_all on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.water_rates to anon;
grant select on public.profiles, public.customers, public.water_rates,
  public.bills, public.payments, public.settings to authenticated;
grant insert, update, delete on public.profiles, public.customers,
  public.water_rates, public.bills, public.payments, public.settings to authenticated;
grant usage on sequence public.bill_number_seq to authenticated;
revoke all on function public.recalculate_bill_payments(uuid) from public, anon, authenticated;
revoke all on function public.is_admin() from public;
revoke all on function public.is_active_customer() from public;
revoke all on function public.is_meter_number_available(text) from public;
revoke all on function public.admin_update_customer(uuid,text,text,text,text,text) from public;
grant execute on function public.is_admin(), public.is_active_customer() to authenticated;
grant execute on function public.is_meter_number_available(text) to anon, authenticated;
grant execute on function public.admin_update_customer(uuid,text,text,text,text,text) to authenticated;

insert into public.water_rates (rate_per_m3, effective_from)
values (18.50, date '2025-01-01')
on conflict (effective_from) do nothing;
insert into public.settings (key, value)
values ('monthly_collection_goal', 100000.00)
on conflict (key) do nothing;

-- Optional demo data: create these two Auth users in the Supabase dashboard first.
-- The block only seeds rows for demo users that exist; it never invents credentials.
do $$
declare
  demo record;
begin
  for demo in
    select u.id, u.email, v.full_name, v.meter_no, v.address, v.previous_reading, v.current_reading
    from (values
      ('sample.maria@isabelwaters.example', 'Maria Santos', 'IW-DEMO-001', 'Poblacion, Isabel, Leyte', 125, 139),
      ('sample.juan@isabelwaters.example', 'Juan Dela Cruz', 'IW-DEMO-002', 'Marvel, Isabel, Leyte', 87, 96)
    ) as v(email, full_name, meter_no, address, previous_reading, current_reading)
    join auth.users u on lower(u.email) = v.email
  loop
    insert into public.profiles (id, full_name, role)
    values (demo.id, demo.full_name, 'customer')
    on conflict (id) do update set full_name = excluded.full_name;
    insert into public.customers (id, contact_no, address, meter_no, status)
    values (demo.id, '09170000000', demo.address, demo.meter_no, 'active')
    on conflict (id) do update set address = excluded.address, meter_no = excluded.meter_no, status = 'active';
    insert into public.bills (customer_id, billing_month, due_date, previous_reading, current_reading, rate_per_m3)
    values (
      demo.id,
      (date_trunc('month', current_date) - interval '1 month')::date,
      (date_trunc('month', current_date) + interval '10 days')::date,
      demo.previous_reading,
      demo.current_reading,
      18.50
    ) on conflict (customer_id, billing_month) do nothing;
  end loop;
end $$;

-- First staff account:
-- 1. Create the user in Supabase Dashboard > Authentication > Users > Add user.
--    Do not provide meter_no metadata (the trigger creates only its profile).
-- 2. Replace the email below and run this statement in SQL Editor:
-- update public.profiles set role = 'admin'
-- where id = (select id from auth.users where lower(email) = lower('staff@example.com'));
-- 3. Staff sign in at /portal. Never expose a service-role key in Vite.
