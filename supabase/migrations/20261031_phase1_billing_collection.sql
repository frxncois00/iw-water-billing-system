-- Phase 1. Run after schema.sql and 20261031_staff_rbac.sql.
-- Existing customer accounts, bills, and payments are retained.
begin;

create table public.rate_tiers (
  id bigint generated always as identity primary key,
  min_m3 numeric(12,2) not null check (min_m3 >= 0),
  max_m3 numeric(12,2) check (max_m3 > min_m3),
  rate_per_m3 numeric(10,2) not null default 0 check (rate_per_m3 >= 0),
  fixed_charge numeric(12,2) check (fixed_charge >= 0),
  effective_from date not null,
  is_active boolean not null default true,
  check (fixed_charge is null or rate_per_m3 = 0),
  unique (effective_from, min_m3)
);
create index rate_tiers_effective_idx on public.rate_tiers(effective_from desc, min_m3);
insert into public.rate_tiers(min_m3,max_m3,rate_per_m3,fixed_charge,effective_from) values
  (0,10,0,185,date '2025-01-01'),(10,20,20,null,date '2025-01-01'),
  (20,30,22,null,date '2025-01-01'),(30,null,25,null,date '2025-01-01');

alter table public.bills add column if not exists usage_m3 numeric(12,2);
alter table public.bills add column if not exists water_charge numeric(12,2);
alter table public.bills add column if not exists penalty_amount numeric(12,2) not null default 0;
alter table public.bills add column if not exists previous_balance numeric(12,2) not null default 0;
alter table public.bills add column if not exists total_amount numeric(12,2);
alter table public.bills add column if not exists created_by uuid references auth.users(id);
update public.bills set usage_m3=water_used, water_charge=amount, total_amount=amount
  where usage_m3 is null or water_charge is null or total_amount is null;
alter table public.bills alter column usage_m3 set not null;
alter table public.bills alter column water_charge set not null;
alter table public.bills alter column total_amount set not null;

alter table public.payments add column if not exists customer_id uuid references public.customers(id);
alter table public.payments add column if not exists or_number text unique;
alter table public.payments add column if not exists tendered numeric(12,2);
alter table public.payments add column if not exists change_amount numeric(12,2) not null default 0;
alter table public.payments add column if not exists balance_after numeric(12,2);
alter table public.payments add column if not exists status text not null default 'valid';
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check check (method in ('Cash','GCash','Bank Transfer','Other'));
alter table public.payments add constraint payments_status_check check (status in ('valid','voided'));
update public.payments p set customer_id=b.customer_id from public.bills b
  where p.bill_id=b.id and p.customer_id is null;

create table public.payment_allocations (
  payment_id uuid not null references public.payments(id) on delete restrict,
  bill_id uuid not null references public.bills(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  primary key(payment_id,bill_id)
);
insert into public.payment_allocations(payment_id,bill_id,amount)
select id,bill_id,amount from public.payments where status='valid';
create index payment_allocations_bill_idx on public.payment_allocations(bill_id);

-- Unlike a SEQUENCE, this row counter rolls back on failure, avoiding gaps.
create table public.or_counters (receipt_year integer primary key, last_number bigint not null);
-- Only the private SECURITY DEFINER function can read or update this counter.
alter table public.or_counters enable row level security;
create or replace function public.next_or_number()
returns text language plpgsql security definer set search_path = public as $$
declare v_year integer := extract(year from (now() at time zone 'Asia/Manila'))::integer; v_number bigint;
begin
  insert into public.or_counters(receipt_year,last_number) values(v_year,1)
    on conflict(receipt_year) do update set last_number=public.or_counters.last_number+1
    returning last_number into v_number;
  return 'OR-' || v_year::text || '-' || lpad(v_number::text,6,'0');
end;
$$;
revoke all on function public.next_or_number() from public, anon, authenticated;

create table public.bill_items (
  id bigint generated always as identity primary key,
  bill_id uuid not null references public.bills(id) on delete restrict,
  description text not null,
  quantity numeric(12,2),
  unit_rate numeric(12,2),
  amount numeric(12,2) not null
);
create index bill_items_bill_idx on public.bill_items(bill_id);

-- The newest active effective-date set applies. Fixed charge covers the first block.
create or replace function public.compute_water_charge(usage numeric)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare v_date date; t record; v_total numeric := 0; v_found boolean := false;
begin
  if public.get_my_role() not in ('cashier','admin') then raise exception 'Staff access required'; end if;
  if usage is null or usage < 0 then raise exception 'Usage must be nonnegative'; end if;
  select max(effective_from) into v_date from public.rate_tiers where is_active and effective_from <= current_date;
  if v_date is null then raise exception 'No active water rate is configured'; end if;
  for t in select * from public.rate_tiers where effective_from=v_date and is_active order by min_m3 loop
    v_found := true;
    if t.fixed_charge is not null then
      v_total := v_total + t.fixed_charge;
    elsif usage > t.min_m3 then
      v_total := v_total + greatest(least(usage,coalesce(t.max_m3,usage))-t.min_m3,0)*t.rate_per_m3;
    end if;
  end loop;
  if not v_found then raise exception 'No active water rate is configured'; end if;
  return round(v_total,2);
end;
$$;

-- Keep old bills' stored charges. New bills store their own charges only;
-- previous_balance is a displayed snapshot, not a second receivable.
create or replace function public.calculate_bill()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.current_reading < new.previous_reading then raise exception 'Current reading cannot be less than previous reading'; end if;
  new.water_used := new.current_reading-new.previous_reading;
  new.usage_m3 := new.water_used;
  new.amount := round(new.water_charge+new.penalty_amount,2);
  new.total_amount := new.amount+new.previous_balance;
  new.balance := round(new.amount-new.amount_paid,2);
  if new.balance < 0 then raise exception 'Bill payments exceed the billed amount'; end if;
  new.status := case when new.balance=0 then 'paid' when new.amount_paid>0 then 'partial' else 'unpaid' end;
  return new;
end;
$$;

-- The old payment trigger sums payments.bill_id and cannot handle allocations.
drop trigger if exists payments_apply on public.payments;
-- RPCs own every bill write now; the old direct-write guard blocks their updates.
drop trigger if exists bills_guard_payment_totals on public.bills;
create or replace function public.refresh_bill_from_allocations(p_bill_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_paid numeric;
begin
  select coalesce(sum(a.amount),0) into v_paid from public.payment_allocations a
    join public.payments p on p.id=a.payment_id where a.bill_id=p_bill_id and p.status='valid';
  update public.bills set amount_paid=v_paid where id=p_bill_id;
end;
$$;
revoke all on function public.refresh_bill_from_allocations(uuid) from public, anon, authenticated;

create or replace function public.create_bill(
  p_customer_id uuid,p_billing_month date,p_due_date date,p_current_reading numeric,p_first_previous_reading numeric default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_customer public.customers%rowtype; v_last public.bills%rowtype; v_previous numeric; v_usage numeric;
  v_charge numeric; v_prior numeric; v_id uuid; v_date date; t record; v_line numeric;
begin
  if public.get_my_role() <> 'cashier' then raise exception 'Cashier access required'; end if;
  if extract(day from p_billing_month) <> 1 then raise exception 'Billing month must be the first day of a month'; end if;
  select * into v_customer from public.customers where id=p_customer_id for update;
  if not found or v_customer.status <> 'active' then raise exception 'Select an active customer'; end if;
  if exists(select 1 from public.bills where customer_id=p_customer_id and billing_month=p_billing_month) then
    raise exception 'A bill already exists for this customer and month';
  end if;
  select * into v_last from public.bills where customer_id=p_customer_id order by billing_month desc limit 1;
  if found and p_billing_month <= v_last.billing_month then raise exception 'Choose a month after the latest bill'; end if;
  v_previous := case when v_last.id is null then coalesce(p_first_previous_reading,0) else v_last.current_reading end;
  if p_current_reading < v_previous then raise exception 'Current reading must be at least the previous reading'; end if;
  v_usage := p_current_reading-v_previous;
  v_charge := public.compute_water_charge(v_usage);
  select coalesce(sum(balance),0) into v_prior from public.bills where customer_id=p_customer_id and balance>0;
  select max(effective_from) into v_date from public.rate_tiers where is_active and effective_from<=current_date;
  insert into public.bills(customer_id,billing_month,due_date,previous_reading,current_reading,
    rate_per_m3,water_charge,previous_balance,usage_m3,total_amount,created_by)
  values(p_customer_id,p_billing_month,p_due_date,v_previous,p_current_reading,0,v_charge,v_prior,v_usage,v_charge+v_prior,auth.uid())
  returning id into v_id;
  for t in select * from public.rate_tiers where effective_from=v_date and is_active order by min_m3 loop
    v_line := case when t.fixed_charge is not null then t.fixed_charge
      else greatest(least(v_usage,coalesce(t.max_m3,v_usage))-t.min_m3,0)*t.rate_per_m3 end;
    if v_line > 0 then
      insert into public.bill_items(bill_id,description,quantity,unit_rate,amount)
      values(v_id,case when t.fixed_charge is not null then 'Minimum charge (0–10 m³)'
        else (t.min_m3+1)::text || '–' || coalesce(t.max_m3::text,'above') || ' m³' end,
        case when t.fixed_charge is not null then least(v_usage,coalesce(t.max_m3,v_usage))
          else greatest(least(v_usage,coalesce(t.max_m3,v_usage))-t.min_m3,0) end,
        case when t.fixed_charge is not null then null else t.rate_per_m3 end,round(v_line,2));
    end if;
  end loop;
  return v_id;
end;
$$;

create or replace function public.record_payment(
  p_customer_id uuid,p_amount numeric,p_method text,p_reference_no text default null,p_tendered numeric default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_customer public.customers%rowtype; v_remaining numeric; v_total numeric; v_take numeric;
  v_bill public.bills%rowtype; v_first uuid; v_id uuid;
begin
  if public.get_my_role() <> 'cashier' then raise exception 'Cashier access required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payment amount must be positive'; end if;
  if p_method not in ('Cash','GCash','Bank Transfer') then raise exception 'Invalid payment method'; end if;
  if p_method <> 'Cash' and nullif(trim(coalesce(p_reference_no,'')),'') is null then raise exception 'Reference number is required'; end if;
  if p_method='Cash' and (p_tendered is null or p_tendered < p_amount) then raise exception 'Cash tendered must cover the payment'; end if;
  select * into v_customer from public.customers where id=p_customer_id for update;
  if not found then raise exception 'Customer not found'; end if;
  select coalesce(sum(balance),0) into v_total from public.bills where customer_id=p_customer_id and balance>0;
  if p_amount > v_total then raise exception 'Payment exceeds the running balance; customer credit is available in Phase 3'; end if;
  select id into v_first from public.bills where customer_id=p_customer_id and balance>0
    order by due_date,billing_month,id limit 1;
  insert into public.payments(bill_id,customer_id,or_number,amount,method,reference_no,
    tendered,change_amount,balance_after,collected_by)
  values(v_first,p_customer_id,public.next_or_number(),p_amount,p_method,nullif(trim(p_reference_no),''),
    case when p_method='Cash' then p_tendered else null end,
    case when p_method='Cash' then p_tendered-p_amount else 0 end,v_total-p_amount,auth.uid())
  returning id into v_id;
  v_remaining := p_amount;
  for v_bill in select * from public.bills where customer_id=p_customer_id and balance>0
      order by due_date,billing_month,id for update loop
    exit when v_remaining <= 0;
    v_take := least(v_remaining,v_bill.balance);
    insert into public.payment_allocations(payment_id,bill_id,amount) values(v_id,v_bill.id,v_take);
    perform public.refresh_bill_from_allocations(v_bill.id);
    v_remaining := v_remaining-v_take;
  end loop;
  return v_id;
end;
$$;

-- Remove all direct cashier write routes, including the prior customer edit RPC.
drop policy if exists bills_cashier_insert on public.bills;
drop policy if exists bills_cashier_update on public.bills;
drop policy if exists payments_cashier_insert on public.payments;
drop policy if exists payments_cashier_update on public.payments;
drop policy if exists customers_cashier_insert on public.customers;
drop policy if exists customers_cashier_update on public.customers;
revoke execute on function public.admin_update_customer(uuid,text,text,text,text,text) from authenticated;
revoke execute on function public.recalculate_bill_payments(uuid) from authenticated;

alter table public.rate_tiers enable row level security;
alter table public.bill_items enable row level security;
alter table public.payment_allocations enable row level security;
create policy rate_tiers_staff_read on public.rate_tiers for select to authenticated
  using(public.get_my_role() in ('cashier','admin'));
create policy bill_items_staff_read on public.bill_items for select to authenticated
  using(public.get_my_role() in ('cashier','admin'));
create policy bill_items_customer_read on public.bill_items for select to authenticated
  using(public.is_active_customer() and exists (
    select 1 from public.bills where id=bill_id and customer_id=(select auth.uid())));
create policy allocations_staff_read on public.payment_allocations for select to authenticated
  using(public.get_my_role() in ('cashier','admin'));
grant select on public.rate_tiers,public.bill_items,public.payment_allocations to authenticated;
revoke all on function public.compute_water_charge(numeric) from public,anon;
revoke all on function public.create_bill(uuid,date,date,numeric,numeric) from public,anon;
revoke all on function public.record_payment(uuid,numeric,text,text,numeric) from public,anon;
grant execute on function public.compute_water_charge(numeric) to authenticated;
grant execute on function public.create_bill(uuid,date,date,numeric,numeric) to authenticated;
grant execute on function public.record_payment(uuid,numeric,text,text,numeric) to authenticated;
revoke all on table public.or_counters from anon,authenticated;

commit;
