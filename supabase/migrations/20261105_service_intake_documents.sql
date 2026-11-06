-- Run once after 20261105_requested_documents.sql for optional initial application uploads.
begin;
create function public.submit_intake_document(p_reference text,p_token uuid,p_label text,p_type text,p_content text)
returns void language plpgsql security definer set search_path='' as $$
declare app_id uuid; item uuid;
begin
  if p_label is null or p_label not in ('Government ID','Proof of ownership or lease') then
    raise exception 'Unsupported document';
  end if;
  select id into app_id from public.service_applications where reference_no=p_reference
    and tracking_token=p_token and status='received' for update;
  if not found then raise exception 'Use request tracking for further documents'; end if;
  select id into item from public.application_requirements where application_id=app_id
    and requirement_name=p_label order by created_at limit 1;
  if item is null then
    insert into public.application_requirements(application_id,requirement_name) values(app_id,p_label) returning id into item;
  elsif exists(select 1 from public.application_requirements where id=item and status='submitted') then return;
  end if;
  perform public.submit_requested_file(p_reference,p_token,item,p_content,p_type);
end;
$$;
revoke all on function public.submit_intake_document(text,uuid,text,text,text) from public;
grant execute on function public.submit_intake_document(text,uuid,text,text,text) to anon,authenticated;
commit;
