-- =====================================================================
-- CREATE THE FIRST (SUPER) ADMINISTRATOR  -  run this ONCE, by hand
-- =====================================================================
-- There is no public sign-up. The first administrator is created like this:
--
-- 1. Supabase dashboard > Authentication > Users > "Add user" > "Create new user".
--    Enter the real email address and a long, unique password. Tick "Auto Confirm User".
-- 2. Replace the two values marked CHANGE ME below, then run this script in the SQL Editor.
--
-- Do not share this file with a real email filled in, and never reuse the password elsewhere.

do $$
declare
  v_email text := lower('kalikatimothy062@gmail.com');   -- CHANGE ME: the email you used in step 1
  v_name  text := 'Admin';            -- CHANGE ME: the administrator's name
  v_id    uuid;
begin
  select id into v_id from auth.users where lower(email) = v_email;
  if v_id is null then
    raise exception 'No user with email % exists yet. Complete step 1 first.', v_email;
  end if;

  insert into public.profiles (id, email, full_name, role, is_active)
  values (v_id, v_email, v_name, 'super_admin', true)
  on conflict (id) do update
    set role = 'super_admin', is_active = true, full_name = excluded.full_name;

  raise notice 'Super administrator ready: %', v_email;
end $$;
