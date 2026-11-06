-- Isabel Waters: account linking and omnichannel intake.
-- Run AFTER schema.sql, 20261031_staff_rbac.sql, and
-- 20261031_phase1_billing_collection.sql. Review a database backup first.
-- This migration preserves all existing customers, bills, and payments.
-- It does not invent CANs: import verified existing CANs after migration.
begin;

-- A contract account is independent of the portal user. Existing customer rows
-- remain as compatibility anchors for the current billing functions/UI.
create table public.contract_accounts (
  id uuid primary key default gen_random_uuid(),
  can text unique,
  legacy_customer_id uuid unique references public.customers(id) on delete restrict,
  account_name text not null,
  service_address text not null,
  meter_no text,
  status text not null default 'active'
    check (status in ('pending','active','inactive','disconnected','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_accounts_can_format check
    (can is null or (can = upper(trim(can)) and can ~ '^[A-Z0-9-]{4,32}$'))
);
create unique index contract_accounts_can_ci_idx on public.contract_accounts (upper(can)) where can is not null;
create index contract_accounts_meter_idx on public.contract_accounts (upper(meter_no));

insert into public.contract_accounts
  (legacy_customer_id,account_name,service_address,meter_no,status)
select c.id,coalesce(nullif(p.full_name,''),'Existing customer'),c.address,c.meter_no,
  case when c.status='active' then 'active' else 'inactive' end
from public.customers c join public.profiles p on p.id=c.id;

-- Existing contact information stays available to staff but is not returned
-- to every portal user who links a CAN.
create table public.account_contacts (
  account_id uuid primary key references public.contract_accounts(id) on delete cascade,
  phone text,
  email text,
  updated_at timestamptz not null default now()
);
insert into public.account_contacts(account_id,phone,email)
select a.id,c.contact_no,p.email from public.contract_accounts a
join public.customers c on c.id=a.legacy_customer_id
join public.profiles p on p.id=c.id;
alter table public.account_contacts enable row level security;
create policy account_contacts_staff_read on public.account_contacts for select to authenticated
  using (public.get_my_role() in ('admin','cashier'));
grant select on public.account_contacts to authenticated;

-- An account can be linked to many independent portal users. One user can link
-- many accounts. The legacy customer/profile link is retained automatically.
create table public.portal_account_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.contract_accounts(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (user_id,account_id)
);
create index portal_account_links_account_idx on public.portal_account_links(account_id);
insert into public.portal_account_links(user_id,account_id)
select legacy_customer_id,id from public.contract_accounts where legacy_customer_id is not null;

-- Keep the old billing tables readable through the new account relationship.
alter table public.bills add column account_id uuid references public.contract_accounts(id) on delete restrict;
update public.bills b set account_id=a.id from public.contract_accounts a
where a.legacy_customer_id=b.customer_id;
create index bills_account_month_idx on public.bills(account_id,billing_month desc);

create or replace function public.assign_bill_account()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select id into new.account_id from public.contract_accounts
  where legacy_customer_id=new.customer_id;
  if new.account_id is null then raise exception 'No contract account for billing customer'; end if;
  return new;
end;
$$;
create trigger bills_assign_account before insert or update of customer_id on public.bills
for each row execute function public.assign_bill_account();

create or replace function public.has_account_link(p_account_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.portal_account_links
    where account_id=p_account_id and user_id=(select auth.uid()))
$$;
revoke all on function public.has_account_link(uuid) from public,anon;
grant execute on function public.has_account_link(uuid) to authenticated;

-- Existing signup metadata must never create a second customer row or claim a
-- meter. New signups receive only a profile and can link one or more CANs.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,email,full_name,role)
  values(new.id,new.email,trim(coalesce(new.raw_user_meta_data->>'full_name','')),'customer');
  return new;
end;
$$;
revoke execute on function public.is_meter_number_available(text) from anon,authenticated;

-- CAN linking deliberately does not require ownership proof. Only billing access
-- is granted; customer identity documents/contact records stay inaccessible.
create or replace function public.link_account_by_can(p_can text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null or public.get_my_role() <> 'customer' then
    raise exception 'Customer login required';
  end if;
  if p_can is null or length(trim(p_can)) < 4 or length(trim(p_can)) > 32 then
    raise exception 'Enter a valid CAN';
  end if;
  select id into v_id from public.contract_accounts
  where can=upper(trim(p_can)) and status='active';
  if v_id is null then raise exception 'CAN unavailable'; end if;
  insert into public.portal_account_links(user_id,account_id)
    values(auth.uid(),v_id) on conflict do nothing;
  return v_id;
end;
$$;
revoke all on function public.link_account_by_can(text) from public,anon;
grant execute on function public.link_account_by_can(text) to authenticated;

create or replace function public.unlink_account(p_account_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.portal_account_links
  where user_id=auth.uid() and account_id=p_account_id;
end;
$$;
revoke all on function public.unlink_account(uuid) from public,anon;
grant execute on function public.unlink_account(uuid) to authenticated;

-- Read only account summary. The full customers/profiles tables are not exposed
-- to everyone who knows a CAN.
alter table public.contract_accounts enable row level security;
alter table public.portal_account_links enable row level security;
create policy contract_accounts_linked_or_staff_read on public.contract_accounts
  for select to authenticated using
  (public.get_my_role() in ('admin','cashier') or public.has_account_link(id));
create policy portal_links_own_or_staff_read on public.portal_account_links
  for select to authenticated using
  (user_id=(select auth.uid()) or public.get_my_role() in ('admin','cashier'));
create policy portal_links_own_delete on public.portal_account_links
  for delete to authenticated using (user_id=(select auth.uid()));
grant select on public.contract_accounts,public.portal_account_links to authenticated;
grant delete on public.portal_account_links to authenticated;

-- Replace the single-login read assumption for issued bills and their lines.
drop policy if exists bills_customer_read on public.bills;
create policy bills_linked_read on public.bills for select to authenticated
  using (public.has_account_link(account_id));
drop policy if exists bill_items_customer_read on public.bill_items;
create policy bill_items_linked_read on public.bill_items for select to authenticated
  using (exists(select 1 from public.bills b where b.id=bill_id
    and public.has_account_link(b.account_id)));
drop policy if exists payments_customer_read on public.payments;
create policy payments_linked_read on public.payments for select to authenticated
  using (exists(select 1 from public.bills b where b.id=payments.bill_id
    and public.has_account_link(b.account_id)));
create policy allocations_linked_read on public.payment_allocations for select to authenticated
  using (exists(select 1 from public.bills b where b.id=bill_id
    and public.has_account_link(b.account_id)));

-- New service may start online, at the office, by phone, email, or another
-- approved channel. Contact details permit an application without portal login.
create table public.service_applications (
  id uuid primary key default gen_random_uuid(),
  reference_no text not null unique default
    ('IW-NSA-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  channel text not null check (channel in ('online','walk_in','phone','email','other')),
  applicant_user_id uuid references auth.users(id) on delete set null,
  entered_by uuid references auth.users(id) on delete set null,
  applicant_name text not null,
  contact_no text,
  contact_email text,
  service_address text not null,
  notes text,
  status text not null default 'received' check
    (status in ('received','requirements_pending','document_review','inspection',
      'estimate','approval','payment','installation','activated','rejected','cancelled')),
  tracking_token uuid not null default gen_random_uuid(),
  linked_account_id uuid references public.contract_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nullif(trim(applicant_name),'') is not null),
  check (nullif(trim(service_address),'') is not null),
  check (nullif(trim(coalesce(contact_no,'')),'') is not null
      or nullif(trim(coalesce(contact_email,'')),'') is not null)
);
create index service_applications_status_idx on public.service_applications(status,created_at);

create table public.application_requirements (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.service_applications(id) on delete cascade,
  requirement_name text not null,
  status text not null default 'requested'
    check (status in ('requested','submitted','accepted','rejected','waived')),
  file_path text,
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index application_requirements_application_idx on public.application_requirements(application_id);

-- Concerns need no login and no CAN. A CAN supplied by a guest is recorded as
-- a claim for staff review; it does not grant account access.
create table public.service_cases (
  id uuid primary key default gen_random_uuid(),
  reference_no text not null unique default
    ('IW-CS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  tracking_token uuid not null default gen_random_uuid(),
  channel text not null check (channel in ('online','walk_in','phone','email','other')),
  submitted_by uuid references auth.users(id) on delete set null,
  entered_by uuid references auth.users(id) on delete set null,
  account_id uuid references public.contract_accounts(id) on delete set null,
  claimed_can text,
  category text not null check (category in ('billing','payment','leak','meter',
    'water_service','application','account','privacy','general','other')),
  description text not null,
  location_text text,
  reporter_name text,
  contact_no text,
  contact_email text,
  status text not null default 'received' check
    (status in ('received','triage','assigned','investigating','waiting',
      'resolved','closed','rejected')),
  resolution_summary text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nullif(trim(description),'') is not null)
);
create index service_cases_status_idx on public.service_cases(status,created_at);
create index service_cases_account_idx on public.service_cases(account_id);

-- Submission functions return only a reference and a secret tracking token.
-- The application must display the token once and must not log it.
create or replace function public.submit_service_application(
  p_channel text,p_name text,p_phone text,p_email text,p_address text,p_notes text default null
)
returns table(reference_no text,tracking_token uuid)
language plpgsql security definer set search_path = '' as $$
declare v_staff boolean := coalesce(public.get_my_role() in ('admin','cashier'),false);
begin
  if p_channel not in ('online','walk_in','phone','email','other')
    or (not v_staff and p_channel <> 'online') then raise exception 'Invalid application channel'; end if;
  if nullif(trim(coalesce(p_name,'')),'') is null or length(p_name)>160
    or nullif(trim(coalesce(p_address,'')),'') is null or length(p_address)>500
    or length(coalesce(p_notes,''))>3000 or length(coalesce(p_phone,''))>40
    or length(coalesce(p_email,''))>254
    or (nullif(trim(coalesce(p_phone,'')),'') is null
      and nullif(trim(coalesce(p_email,'')),'') is null) then
    raise exception 'Complete the required application fields';
  end if;
  return query insert into public.service_applications
    (channel,applicant_user_id,entered_by,applicant_name,contact_no,contact_email,service_address,notes)
  values (p_channel,case when v_staff then null else auth.uid() end,
    case when v_staff then auth.uid() else null end,trim(p_name),
    nullif(trim(coalesce(p_phone,'')),''),nullif(trim(coalesce(p_email,'')),''),trim(p_address),
    nullif(trim(coalesce(p_notes,'')),''))
  returning service_applications.reference_no,service_applications.tracking_token;
end;
$$;

create or replace function public.submit_service_case(
  p_channel text,p_category text,p_description text,p_name text default null,
  p_phone text default null,p_email text default null,p_location text default null,
  p_can text default null
)
returns table(reference_no text,tracking_token uuid)
language plpgsql security definer set search_path = '' as $$
declare v_staff boolean := coalesce(public.get_my_role() in ('admin','cashier'),false);
  v_account uuid;
begin
  if p_channel not in ('online','walk_in','phone','email','other')
    or (not v_staff and p_channel <> 'online')
    or p_category not in ('billing','payment','leak','meter','water_service',
      'application','account','privacy','general','other') then
    raise exception 'Invalid concern type or channel';
  end if;
  if nullif(trim(coalesce(p_description,'')),'') is null or length(p_description)>3000
    or length(coalesce(p_name,''))>160 or length(coalesce(p_phone,''))>40
    or length(coalesce(p_email,''))>254 or length(coalesce(p_location,''))>500
    or length(coalesce(p_can,''))>32 then raise exception 'Invalid concern details'; end if;
  -- Only a linked user's CAN is resolved to an account here. Guest CANs remain
  -- claimed text and are verified by staff during triage.
  if auth.uid() is not null and not v_staff and nullif(trim(coalesce(p_can,'')),'') is not null then
    select a.id into v_account from public.contract_accounts a
    where a.can=upper(trim(p_can)) and public.has_account_link(a.id);
  end if;
  return query insert into public.service_cases
    (channel,submitted_by,entered_by,account_id,claimed_can,category,description,
      reporter_name,contact_no,contact_email,location_text)
  values(p_channel,case when v_staff then null else auth.uid() end,
    case when v_staff then auth.uid() else null end,v_account,
    nullif(upper(trim(coalesce(p_can,''))),''),p_category,trim(p_description),
    nullif(trim(coalesce(p_name,'')),''),nullif(trim(coalesce(p_phone,'')),''),
    nullif(trim(coalesce(p_email,'')),''),nullif(trim(coalesce(p_location,'')),''))
  returning service_cases.reference_no,service_cases.tracking_token;
end;
$$;

-- Guest tracking deliberately reveals status only, never names, documents,
-- addresses, account information, internal notes, or resolution text.
create or replace function public.track_public_request(p_reference text,p_token uuid)
returns table(request_type text,current_status text,updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  return query select 'application'::text,a.status,a.updated_at
  from public.service_applications a where a.reference_no=p_reference and a.tracking_token=p_token
  union all
  select 'concern'::text,c.status,c.updated_at
  from public.service_cases c where c.reference_no=p_reference and c.tracking_token=p_token;
end;
$$;

-- No direct public table access; staff see intake queues. Submitters see only
-- their own rows. Sensitive tracking tokens are exposed through submission RPC.
alter table public.service_applications enable row level security;
alter table public.application_requirements enable row level security;
alter table public.service_cases enable row level security;
create policy applications_staff_read on public.service_applications for select to authenticated
  using (public.get_my_role() in ('admin','cashier') or applicant_user_id=auth.uid());
create policy applications_staff_update on public.service_applications for update to authenticated
  using (public.get_my_role() in ('admin','cashier'))
  with check (public.get_my_role() in ('admin','cashier'));
create policy requirements_staff_read on public.application_requirements for select to authenticated
  using (public.get_my_role() in ('admin','cashier'));
create policy requirements_staff_write on public.application_requirements for all to authenticated
  using (public.get_my_role() in ('admin','cashier'))
  with check (public.get_my_role() in ('admin','cashier'));
create policy cases_staff_or_submitter_read on public.service_cases for select to authenticated
  using (public.get_my_role() in ('admin','cashier') or submitted_by=auth.uid());
create policy cases_staff_update on public.service_cases for update to authenticated
  using (public.get_my_role() in ('admin','cashier'))
  with check (public.get_my_role() in ('admin','cashier'));
grant select on public.service_applications,public.service_cases to authenticated;
grant update(status,linked_account_id,updated_at) on public.service_applications to authenticated;
grant update(status,account_id,assigned_to,resolution_summary,updated_at)
  on public.service_cases to authenticated;
grant select,insert,update,delete on public.application_requirements to authenticated;
revoke all on public.service_applications,public.application_requirements,public.service_cases from anon;
revoke all on function public.submit_service_application(text,text,text,text,text,text),
  public.submit_service_case(text,text,text,text,text,text,text,text),
  public.track_public_request(text,uuid) from public;
grant execute on function public.submit_service_application(text,text,text,text,text,text),
  public.submit_service_case(text,text,text,text,text,text,text,text),
  public.track_public_request(text,uuid) to anon,authenticated;

commit;
