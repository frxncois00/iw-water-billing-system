-- Replace development tier defaults with one administrator-managed cubic rate.
-- Existing bills and their stored amounts are not changed.
begin;

create table if not exists public.rate_change_log (
  id bigint generated always as identity primary key,
  rate_per_m3 numeric(10,2) not null check (rate_per_m3 >= 0),
  effective_from date not null,
  reason text not null check (char_length(trim(reason)) >= 3),
  changed_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.rate_change_log enable row level security;
drop policy if exists rate_change_log_staff_read on public.rate_change_log;
create policy rate_change_log_staff_read on public.rate_change_log for select to authenticated
  using (public.get_my_role() in ('admin','cashier'));
grant select on public.rate_change_log to authenticated;

-- Retire all seeded tier/fixed-charge rows. A confirmed rate is added from Admin.
update public.rate_tiers set is_active=false;

create or replace function public.set_cubic_rate(p_rate numeric,p_effective_from date,p_reason text)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_id bigint; v_reason text := trim(coalesce(p_reason,''));
begin
  if public.get_my_role() <> 'admin' then raise exception 'Administrator access required'; end if;
  if p_rate is null or p_rate < 0 then raise exception 'Cubic rate must be zero or greater'; end if;
  if p_effective_from is null then raise exception 'Effective date is required'; end if;
  if char_length(v_reason) < 3 then raise exception 'Enter a reason for the rate change'; end if;

  -- Tiered and fixed-charge rows stay retired. Single-rate history remains available.
  update public.rate_tiers set is_active=false
    where min_m3<>0 or max_m3 is not null or fixed_charge is not null;
  insert into public.rate_tiers(min_m3,max_m3,rate_per_m3,fixed_charge,effective_from,is_active)
  values(0,null,round(p_rate,2),null,p_effective_from,true)
  on conflict(effective_from,min_m3) do update set
    max_m3=null,rate_per_m3=excluded.rate_per_m3,fixed_charge=null,is_active=true
  returning id into v_id;
  insert into public.rate_change_log(rate_per_m3,effective_from,reason,changed_by)
  values(round(p_rate,2),p_effective_from,v_reason,auth.uid());
  return v_id;
end;
$$;

revoke all on function public.set_cubic_rate(numeric,date,text) from public,anon;
grant execute on function public.set_cubic_rate(numeric,date,text) to authenticated;

commit;
