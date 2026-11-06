-- Staff-only walk-in billing adjustments for usage and cubic rate.
begin;

alter table public.bills add column if not exists usage_adjusted boolean not null default false;
alter table public.bills add column if not exists rate_adjusted boolean not null default false;
alter table public.bills add column if not exists adjustment_note text;

create table if not exists public.billing_adjustments (
  id bigint generated always as identity primary key,
  bill_id uuid not null references public.bills(id) on delete restrict,
  usage_m3 numeric(12,2),
  rate_per_m3 numeric(12,2),
  note text not null,
  adjusted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.billing_adjustments enable row level security;
drop policy if exists billing_adjustments_staff_read on public.billing_adjustments;
create policy billing_adjustments_staff_read on public.billing_adjustments
  for select to authenticated using (public.get_my_role() in ('admin','cashier'));
grant select on public.billing_adjustments to authenticated;

create or replace function public.create_staff_bill(
  p_customer_id uuid,
  p_billing_month date,
  p_due_date date,
  p_current_reading numeric,
  p_first_previous_reading numeric default null,
  p_usage_m3 numeric default null,
  p_rate_per_m3 numeric default null,
  p_adjustment_note text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.get_my_role();
  v_customer public.customers%rowtype;
  v_last public.bills%rowtype;
  v_previous numeric;
  v_current numeric;
  v_meter_usage numeric;
  v_usage numeric;
  v_charge numeric;
  v_prior numeric;
  v_id uuid;
  v_date date;
  t record;
  v_line numeric;
  v_note text := nullif(trim(coalesce(p_adjustment_note,'')),'');
begin
  if v_role not in ('admin','cashier') then raise exception 'Staff access required'; end if;
  if extract(day from p_billing_month) <> 1 then raise exception 'Billing month must be the first day of a month'; end if;
  if p_usage_m3 is not null and p_usage_m3 < 0 then raise exception 'Adjusted usage must be nonnegative'; end if;
  if p_rate_per_m3 is not null and p_rate_per_m3 < 0 then raise exception 'Adjusted rate must be nonnegative'; end if;
  if (p_usage_m3 is not null or p_rate_per_m3 is not null) and v_note is null then
    raise exception 'An adjustment note is required';
  end if;

  select * into v_customer from public.customers where id=p_customer_id for update;
  if not found or v_customer.status <> 'active' then raise exception 'Select an active customer'; end if;
  if exists(select 1 from public.bills where customer_id=p_customer_id and billing_month=p_billing_month) then
    raise exception 'A bill already exists for this customer and month';
  end if;
  select * into v_last from public.bills where customer_id=p_customer_id order by billing_month desc limit 1;
  if found and p_billing_month <= v_last.billing_month then raise exception 'Choose a month after the latest bill'; end if;

  v_previous := case when v_last.id is null then coalesce(p_first_previous_reading,0) else v_last.current_reading end;
  if p_current_reading is null or p_current_reading < v_previous then
    raise exception 'Current reading must be at least the previous reading';
  end if;
  v_meter_usage := p_current_reading-v_previous;
  v_usage := coalesce(p_usage_m3,v_meter_usage);
  v_current := case when p_usage_m3 is null then p_current_reading else v_previous+v_usage end;

  if p_rate_per_m3 is null then
    v_charge := public.compute_water_charge(v_usage);
  else
    v_charge := round(v_usage*p_rate_per_m3,2);
  end if;
  select coalesce(sum(balance),0) into v_prior from public.bills where customer_id=p_customer_id and balance>0;
  select max(effective_from) into v_date from public.rate_tiers where is_active and effective_from<=(now() at time zone 'Asia/Manila')::date;

  insert into public.bills(customer_id,billing_month,due_date,previous_reading,current_reading,
    rate_per_m3,water_charge,previous_balance,usage_m3,total_amount,created_by,
    usage_adjusted,rate_adjusted,adjustment_note)
  values(p_customer_id,p_billing_month,p_due_date,v_previous,v_current,
    coalesce(p_rate_per_m3,0),v_charge,v_prior,v_usage,v_charge+v_prior,auth.uid(),
    p_usage_m3 is not null,p_rate_per_m3 is not null,v_note)
  returning id into v_id;

  if p_rate_per_m3 is not null then
    insert into public.bill_items(bill_id,description,quantity,unit_rate,amount)
    values(v_id,'Staff-adjusted cubic charge',v_usage,p_rate_per_m3,v_charge);
  else
    for t in select * from public.rate_tiers where effective_from=v_date and is_active order by min_m3 loop
      v_line := case when t.fixed_charge is not null then t.fixed_charge
        else greatest(least(v_usage,coalesce(t.max_m3,v_usage))-t.min_m3,0)*t.rate_per_m3 end;
      if v_line > 0 then
        insert into public.bill_items(bill_id,description,quantity,unit_rate,amount)
        values(v_id,case when t.fixed_charge is not null then 'Minimum charge (0-10 m3)'
          else (t.min_m3+1)::text || '-' || coalesce(t.max_m3::text,'above') || ' m3' end,
          case when t.fixed_charge is not null then least(v_usage,coalesce(t.max_m3,v_usage))
            else greatest(least(v_usage,coalesce(t.max_m3,v_usage))-t.min_m3,0) end,
          case when t.fixed_charge is not null then null else t.rate_per_m3 end,round(v_line,2));
      end if;
    end loop;
  end if;

  if p_usage_m3 is not null or p_rate_per_m3 is not null then
    insert into public.billing_adjustments(bill_id,usage_m3,rate_per_m3,note,adjusted_by)
    values(v_id,p_usage_m3,p_rate_per_m3,v_note,auth.uid());
  end if;
  return v_id;
end;
$$;

revoke all on function public.create_staff_bill(uuid,date,date,numeric,numeric,numeric,numeric,text) from public,anon;
grant execute on function public.create_staff_bill(uuid,date,date,numeric,numeric,numeric,numeric,text) to authenticated;

commit;
