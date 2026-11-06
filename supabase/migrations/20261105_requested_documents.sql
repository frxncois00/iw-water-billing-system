-- Run once after 20261104_accounts_applications_concerns.sql.
begin;
-- One bounded file per staff-requested item. A rejected item can be resubmitted.
create table public.requirement_files (
  requirement_id uuid primary key references public.application_requirements(id) on delete cascade,
  mime_type text not null,
  content bytea not null check(octet_length(content) between 1 and 2097152)
);
alter table public.requirement_files enable row level security;
revoke all on public.requirement_files from public,anon,authenticated;

create function public.request_checklist(p_reference text,p_token uuid)
returns table(requirement_id uuid, label text, state text)
language sql stable security definer set search_path='' as $$
  select r.id,r.requirement_name,r.status from public.application_requirements r
  join public.service_applications a on a.id=r.application_id
  where a.reference_no=p_reference and a.tracking_token=p_token order by r.created_at
$$;

create function public.decode_request_file(p_content text,p_type text) returns bytea
language plpgsql immutable set search_path='' as $$
declare payload bytea;
begin
  if length(p_content)>2796204 then raise exception 'Maximum file size is 2 MB'; end if;
  payload := decode(p_content,'base64');
  if not coalesce(case p_type
    when 'application/pdf' then substring(payload from 1 for 5)=decode('255044462d','hex')
    when 'image/png' then substring(payload from 1 for 8)=decode('89504e470d0a1a0a','hex')
    when 'image/jpeg' then substring(payload from 1 for 3)=decode('ffd8ff','hex')
    else false end,false) then raise exception 'Use a PDF, PNG or JPEG file'; end if;
  return payload;
end;
$$;
revoke all on function public.decode_request_file(text,text) from public,anon,authenticated;

create function public.submit_requested_file(p_reference text,p_token uuid,p_requirement uuid,p_content text,p_type text)
returns void language plpgsql security definer set search_path='' as $$
declare payload bytea;
begin
  perform 1 from public.application_requirements r join public.service_applications a on a.id=r.application_id
    where r.id=p_requirement and a.reference_no=p_reference and a.tracking_token=p_token
      and r.status in ('requested','rejected') and a.status not in ('activated','rejected','cancelled')
    for update of r;
  if not found then raise exception 'This document is not awaiting submission'; end if;
  payload:=public.decode_request_file(p_content,p_type);
  insert into public.requirement_files values(p_requirement,p_type,payload)
    on conflict(requirement_id) do update set mime_type=excluded.mime_type,content=excluded.content;
  update public.application_requirements set status='submitted',reviewed_at=null,reviewed_by=null where id=p_requirement;
end;
$$;

create function public.read_requested_file(p_requirement uuid)
returns table(mime text,encoded text) language sql stable security definer set search_path='' as $$
  select mime_type,encode(content,'base64') from public.requirement_files
  where requirement_id=p_requirement and public.get_my_role() in ('cashier','admin')
$$;
revoke all on function public.request_checklist(text,uuid),public.submit_requested_file(text,uuid,uuid,text,text),
  public.read_requested_file(uuid) from public,anon,authenticated;
grant execute on function public.request_checklist(text,uuid),public.submit_requested_file(text,uuid,uuid,text,text) to anon,authenticated;
grant execute on function public.read_requested_file(uuid) to authenticated;

-- The original legacy billing anchor required an Auth profile. A walk-in
-- applicant can have service without an online login. Keep every existing ID
-- and ledger reference, and allow a new independent billing anchor.
alter table public.customers drop constraint customers_id_fkey;
alter table public.contract_accounts add column installation_reading numeric(12,2)
  check (installation_reading>=0);
alter table public.service_cases add column customer_message text;
alter table public.service_applications add column customer_message text;
create function public.activate_application(p_id uuid,p_can text,p_meter text,p_reading numeric,p_message text)
returns uuid language plpgsql security definer set search_path='' as $$
declare app public.service_applications%rowtype; anchor uuid:=gen_random_uuid(); account uuid;
begin
  if public.get_my_role() is distinct from 'cashier' then raise exception 'Cashier access required'; end if;
  select * into strict app from public.service_applications where id=p_id for update;
  if app.linked_account_id is not null then return app.linked_account_id; end if;
  if app.status<>'installation' or nullif(trim(p_can),'') is null or nullif(trim(p_meter),'') is null
    or p_reading is null or p_reading<0 then raise exception 'Confirm installation, CAN, meter and initial reading'; end if;
  if exists(select 1 from public.application_requirements where application_id=p_id and status not in ('accepted','waived'))
    then raise exception 'Review outstanding requirements before activation'; end if;
  insert into public.customers(id,address,contact_no,meter_no,status)
    values(anchor,app.service_address,coalesce(app.contact_no,''),upper(trim(p_meter)),'active');
  insert into public.contract_accounts(can,legacy_customer_id,account_name,service_address,meter_no,installation_reading)
    values(upper(trim(p_can)),anchor,app.applicant_name,app.service_address,upper(trim(p_meter)),p_reading)
    returning id into account;
  insert into public.account_contacts values(account,app.contact_no,app.contact_email,now());
  update public.service_applications set linked_account_id=account,status='activated',
    customer_message=nullif(trim(p_message),''),updated_at=now() where id=p_id;
  return account;
end;
$$;
revoke all on function public.activate_application(uuid,text,text,numeric,text) from public,anon;
grant execute on function public.activate_application(uuid,text,text,numeric,text) to authenticated;

grant update(customer_message) on public.service_cases,public.service_applications to authenticated;
create function public.request_message(p_reference text,p_token uuid)
returns table(message text, issued_can text) language sql stable security definer set search_path='' as $$
  select a.customer_message,c.can from public.service_applications a
  left join public.contract_accounts c on c.id=a.linked_account_id and a.status='activated'
  where a.reference_no=p_reference and a.tracking_token=p_token
  union all select customer_message,null from public.service_cases
  where reference_no=p_reference and tracking_token=p_token
$$;
revoke all on function public.request_message(text,uuid) from public;
grant execute on function public.request_message(text,uuid) to authenticated,anon;
create table public.case_attachments (
  case_id uuid primary key references public.service_cases(id) on delete cascade,
  mime_type text not null,
  content bytea not null check(octet_length(content) between 1 and 2097152)
);
alter table public.case_attachments enable row level security;
revoke all on public.case_attachments from public, anon, authenticated;
create function public.submit_case_attachment(p_reference text,p_token uuid,p_type text,p_content text)
returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
  select id into target from public.service_cases where reference_no=p_reference and tracking_token=p_token
    and status not in ('resolved','closed','rejected') for update;
  if not found then raise exception 'This case is not accepting attachments'; end if;
  insert into public.case_attachments values(target,p_type,public.decode_request_file(p_content,p_type))
    on conflict(case_id) do update set mime_type=excluded.mime_type,content=excluded.content;
end;
$$;
create function public.read_case_attachment(p_case uuid)
returns table(mime text,encoded text) language sql stable security definer set search_path='' as $$
 select mime_type,encode(content,'base64') from public.case_attachments
 where case_id=p_case and public.get_my_role() in ('cashier','admin')
$$;
revoke all on function public.read_case_attachment(uuid),public.submit_case_attachment(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.read_case_attachment(uuid) to authenticated;
grant execute on function public.submit_case_attachment(text,uuid,text,text) to anon,authenticated;
create table public.connection_offers (
  application_id uuid primary key references public.service_applications(id),
  amount numeric(12,2) not null check(amount>=0),
  agreement text not null check(length(trim(agreement))>0),
  issued_by uuid not null references auth.users(id),
  issued_at timestamptz not null default now(),
  accepted_at timestamptz,
  recorded_by uuid references auth.users(id)
);
alter table public.connection_offers enable row level security;
revoke all on public.connection_offers from public,anon,authenticated;
create function public.issue_connection_offer(p_application uuid,p_amount numeric,p_agreement text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.get_my_role() is distinct from 'cashier' then raise exception 'Cashier access required'; end if;
  perform 1 from public.service_applications where id=p_application and status='estimate' for update;
  if not found then raise exception 'Set the application to estimate after inspection'; end if;
  insert into public.connection_offers(application_id,amount,agreement,issued_by)
    values(p_application,p_amount,trim(p_agreement),auth.uid());
  update public.service_applications set status='approval',updated_at=now() where id=p_application;
end;
$$;
create function public.read_connection_offer(p_reference text,p_token uuid)
returns table(amount numeric,agreement text,accepted_at timestamptz)
language sql stable security definer set search_path='' as $$
  select o.amount,o.agreement,o.accepted_at from public.connection_offers o
  join public.service_applications a on a.id=o.application_id where a.reference_no=p_reference
  and (a.tracking_token=p_token or public.get_my_role()='cashier')
$$;
create function public.accept_connection_offer(p_reference text,p_token uuid)
returns void language plpgsql security definer set search_path='' as $$
declare app public.service_applications%rowtype;
begin
  select * into strict app from public.service_applications where reference_no=p_reference
    and (tracking_token=p_token or public.get_my_role()='cashier') for update;
  if exists(select 1 from public.connection_offers where application_id=app.id and accepted_at is not null) then return; end if;
  if app.status<>'approval' then raise exception 'This offer is no longer awaiting acceptance'; end if;
  update public.connection_offers set accepted_at=now(),recorded_by=auth.uid() where application_id=app.id;
  if not found then raise exception 'No issued estimate'; end if;
  update public.service_applications set status='payment',updated_at=now() where id=app.id;
end;
$$;
revoke all on function public.issue_connection_offer(uuid,numeric,text),public.read_connection_offer(text,uuid),
  public.accept_connection_offer(text,uuid) from public,anon,authenticated;
grant execute on function public.issue_connection_offer(uuid,numeric,text) to authenticated;
grant execute on function public.read_connection_offer(text,uuid),public.accept_connection_offer(text,uuid) to anon,authenticated;
commit;
