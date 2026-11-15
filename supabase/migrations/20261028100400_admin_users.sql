-- =====================================================================
-- PIDA website - Migration 5 of 5: let a super administrator give an existing login dashboard access
-- =====================================================================
-- The dashboard never holds a secret key, so it cannot create logins itself.
-- A super administrator first creates the login in Supabase (Authentication > Users),
-- then uses "Add administrator" in the dashboard, which calls this function.

create or replace function public.admin_add_profile(p_email text, p_full_name text, p_role public.user_role)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id    uuid;
begin
  if not (select public.is_super_admin()) then
    raise exception 'Only a super administrator can add administrators.' using errcode = '42501';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;

  select id into v_id from auth.users where lower(email) = v_email;
  if v_id is null then
    raise exception 'no_auth_user' using errcode = 'P0002';
  end if;

  insert into public.profiles (id, email, full_name, role, is_active)
  values (v_id, v_email, left(btrim(coalesce(p_full_name, '')), 120), p_role, true)
  on conflict (id) do update
    set role = excluded.role, full_name = excluded.full_name, is_active = true;

  return v_id;
end $$;

revoke all on function public.admin_add_profile(text, text, public.user_role) from public, anon;
grant execute on function public.admin_add_profile(text, text, public.user_role) to authenticated;
