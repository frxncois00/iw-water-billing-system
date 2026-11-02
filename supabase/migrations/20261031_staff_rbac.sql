-- Run after supabase/schema.sql on the existing project. This preserves customer accounts.
begin;

alter table public.profiles add column if not exists email text;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'cashier', 'customer'));
update public.profiles p set email = u.email from auth.users u where p.id = u.id and p.email is distinct from u.email;

-- Public sign-up is enabled, so every new Auth user starts as a customer.
-- Staff roles must be assigned in SQL Editor; otherwise anyone could sign up as cashier.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_meter text := upper(trim(coalesce(new.raw_user_meta_data ->> 'meter_no', '')));
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 'customer');
  if requested_meter <> '' then
    insert into public.customers (id, contact_no, address, meter_no, status)
    values (new.id, trim(coalesce(new.raw_user_meta_data ->> 'contact_no', '')),
      trim(coalesce(new.raw_user_meta_data ->> 'address', '')), requested_meter, 'pending');
  end if;
  return new;
end;
$$;

-- Existing Auth users may predate the original trigger.
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), 'customer'
from auth.users u on conflict (id) do update set email = excluded.email;

do $$
begin
  if not exists (select 1 from auth.users where lower(email) = 'admin@isabelwaters.com')
     or not exists (select 1 from auth.users where lower(email) = 'cashier@isabelwaters.com') then
    raise exception 'Both admin@isabelwaters.com and cashier@isabelwaters.com must exist in Auth > Users';
  end if;
end $$;
update public.profiles set role = 'admin' where id = (select id from auth.users where lower(email) = 'admin@isabelwaters.com');
update public.profiles set role = 'cashier' where id = (select id from auth.users where lower(email) = 'cashier@isabelwaters.com');

create or replace function public.get_my_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;
revoke all on function public.get_my_role() from public, anon;
grant execute on function public.get_my_role() to authenticated;

-- Keep the original is_admin helper used elsewhere, with the new role source.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.get_my_role() = 'admin'
$$;
create or replace function public.is_cashier()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.get_my_role() = 'cashier'
$$;
revoke all on function public.is_cashier() from public, anon;
grant execute on function public.is_cashier() to authenticated;

create or replace function public.admin_update_customer(
  p_customer_id uuid, p_full_name text, p_contact_no text,
  p_address text, p_meter_no text, p_status text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_cashier() then raise exception 'Cashier access required'; end if;
  if nullif(trim(p_full_name), '') is null or nullif(trim(p_address), '') is null
     or nullif(trim(p_meter_no), '') is null then
    raise exception 'Name, address, and meter number are required';
  end if;
  update public.profiles set full_name = trim(p_full_name)
  where id = p_customer_id and role = 'customer';
  if not found then raise exception 'Customer profile not found'; end if;
  update public.customers set
    contact_no = trim(coalesce(p_contact_no, '')),
    address = trim(p_address), meter_no = upper(trim(p_meter_no)), status = p_status
  where id = p_customer_id;
  if not found then raise exception 'Customer record not found'; end if;
end;
$$;

create or replace function public.guard_customer_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_cashier() then
    if new.id is distinct from old.id or new.meter_no is distinct from old.meter_no
      or new.status is distinct from old.status or new.created_at is distinct from old.created_at then
      raise exception 'Customers may change only contact number and address';
    end if;
  end if;
  new.meter_no := upper(trim(new.meter_no));
  new.updated_at := now();
  return new;
end;
$$;

alter table public.payments add column if not exists collected_by uuid references auth.users(id) on delete set null;
create index if not exists payments_collector_date_idx on public.payments(collected_by, paid_at desc);
create or replace function public.guard_payment_collector()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_cashier() or new.collected_by is distinct from auth.uid() then
      raise exception 'Payments must be recorded by the signed-in cashier';
    end if;
  elsif new.collected_by is distinct from old.collected_by then
    raise exception 'Payment cashier cannot be changed';
  end if;
  return new;
end;
$$;
drop trigger if exists payments_guard_collector on public.payments;
create trigger payments_guard_collector before insert or update on public.payments
  for each row execute function public.guard_payment_collector();

-- Paid totals may only change through apply_payment(), not by editing a bill.
create or replace function public.guard_bill_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.amount_paid <> 0 then
    raise exception 'A new bill cannot have payments before a payment is recorded';
  end if;
  return new;
end;
$$;
drop trigger if exists bills_guard_insert on public.bills;
create trigger bills_guard_insert before insert on public.bills
  for each row execute function public.guard_bill_insert();

create or replace function public.guard_bill_payment_totals()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and pg_trigger_depth() = 1
    and (new.amount_paid is distinct from old.amount_paid or new.balance is distinct from old.balance
      or new.status is distinct from old.status) then
    raise exception 'Bill payment totals are updated from the payment ledger';
  end if;
  return new;
end;
$$;
drop trigger if exists bills_guard_payment_totals on public.bills;
create trigger bills_guard_payment_totals before update on public.bills
  for each row execute function public.guard_bill_payment_totals();

-- Replace old admin-write policies. Existing customers keep their own read access.
drop policy if exists profiles_admin_all on public.profiles;
drop policy if exists profiles_own_read on public.profiles;
create policy profiles_self_staff_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.get_my_role() = 'admin'
    or (public.get_my_role() = 'cashier' and role = 'customer'));

drop policy if exists customers_admin_all on public.customers;
drop policy if exists customers_own_read on public.customers;
drop policy if exists customers_own_contact_update on public.customers;
create policy customers_staff_read on public.customers for select to authenticated
  using (public.get_my_role() in ('admin', 'cashier') or id = (select auth.uid()));
create policy customers_cashier_insert on public.customers for insert to authenticated
  with check (public.get_my_role() = 'cashier');
create policy customers_cashier_update on public.customers for update to authenticated
  using (public.get_my_role() = 'cashier') with check (public.get_my_role() = 'cashier');
create policy customers_own_contact_update on public.customers for update to authenticated
  using (id = (select auth.uid()) and public.get_my_role() = 'customer')
  with check (id = (select auth.uid()) and public.get_my_role() = 'customer');

drop policy if exists bills_admin_all on public.bills;
drop policy if exists bills_active_customer_read on public.bills;
create policy bills_staff_read on public.bills for select to authenticated
  using (public.get_my_role() in ('admin', 'cashier'));
create policy bills_customer_read on public.bills for select to authenticated
  using (customer_id = (select auth.uid()) and public.is_active_customer());
create policy bills_cashier_insert on public.bills for insert to authenticated
  with check (public.get_my_role() = 'cashier' and exists (
    select 1 from public.customers where id = customer_id and status = 'active'));
create policy bills_cashier_update on public.bills for update to authenticated
  using (public.get_my_role() = 'cashier') with check (public.get_my_role() = 'cashier');

drop policy if exists payments_admin_all on public.payments;
drop policy if exists payments_active_customer_read on public.payments;
create policy payments_staff_read on public.payments for select to authenticated
  using (public.get_my_role() in ('admin', 'cashier'));
create policy payments_customer_read on public.payments for select to authenticated
  using (public.is_active_customer() and exists (
    select 1 from public.bills where id = bill_id and customer_id = (select auth.uid())));
create policy payments_cashier_insert on public.payments for insert to authenticated
  with check (public.get_my_role() = 'cashier' and collected_by = (select auth.uid()));
create policy payments_cashier_update on public.payments for update to authenticated
  using (public.get_my_role() = 'cashier')
  with check (public.get_my_role() = 'cashier');

drop policy if exists water_rates_admin_all on public.water_rates;
drop policy if exists settings_admin_all on public.settings;
create policy settings_staff_read on public.settings for select to authenticated
  using (public.get_my_role() in ('admin', 'cashier'));

-- Existing broad grants remain safe because RLS denies admin writes.
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.bills enable row level security;
alter table public.payments enable row level security;
alter table public.water_rates enable row level security;
alter table public.settings enable row level security;

commit;
