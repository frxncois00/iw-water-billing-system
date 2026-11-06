-- Rate effective dates follow the utility's Asia/Manila business date.
begin;

create or replace function public.compute_water_charge(usage numeric)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare v_date date; t record; v_total numeric := 0; v_found boolean := false;
begin
  if public.get_my_role() not in ('cashier','admin') then raise exception 'Staff access required'; end if;
  if usage is null or usage < 0 then raise exception 'Usage must be nonnegative'; end if;
  select max(effective_from) into v_date
    from public.rate_tiers
    where is_active and effective_from <= (now() at time zone 'Asia/Manila')::date;
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

commit;
