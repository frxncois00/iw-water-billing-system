-- Run this in the Supabase SQL Editor.
-- Assumes public.profiles has columns: id (uuid) and role.

do $$
declare
  target_user_id constant uuid := 'e2f88135-6902-41a4-8c21-17df4e58b916';
  target_email constant text := 'admin@isabelwaters.com';
begin
  if not exists (
    select 1
    from auth.users
    where id = target_user_id
      and lower(email) = lower(target_email)
  ) then
    raise exception 'No auth user matches both UUID % and email %',
      target_user_id,
      target_email;
  end if;

  update public.profiles
  set role = 'admin'
  where id = target_user_id;

  if not found then
    raise exception 'No public.profiles row exists for user %', target_user_id;
  end if;
end
$$;

-- Verify the result without exposing auth credentials.
select id, role
from public.profiles
where id = 'e2f88135-6902-41a4-8c21-17df4e58b916';
