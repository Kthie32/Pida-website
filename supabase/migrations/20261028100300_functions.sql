-- =====================================================================
-- PIDA website - Migration 4 of 4: functions used by the website and dashboard
-- =====================================================================

-- ---------- submit_enquiry: the ONLY way a visitor can add an enquiry ----------
-- Validates everything again on the server, limits repeat submissions,
-- stores the enquiry and returns its id (the website shows "sent" only after this succeeds).
create or replace function public.submit_enquiry(
  p_name text, p_email text, p_interest text, p_message text, p_website text default ''
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_name     text := btrim(coalesce(p_name, ''));
  v_email    text := lower(btrim(coalesce(p_email, '')));
  v_interest text := nullif(btrim(coalesce(p_interest, '')), '');
  v_message  text := btrim(coalesce(p_message, ''));
  v_id       uuid;
begin
  -- Hidden "website" field: real people leave it empty. If it is filled in, it is a bot; store nothing.
  if btrim(coalesce(p_website, '')) <> '' then
    return gen_random_uuid();
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if v_interest is not null and v_interest not in ('Volunteering', 'Partnership', 'Donating', 'Something else') then
    raise exception 'invalid_interest' using errcode = '22023';
  end if;
  if char_length(v_message) < 5 or char_length(v_message) > 5000 then
    raise exception 'invalid_message' using errcode = '22023';
  end if;

  -- Simple flood protection: 3 per email per hour, 30 per minute overall.
  if (select count(*) from public.enquiries where email = v_email and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.enquiries where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.enquiries (name, email, interest, message)
  values (v_name, v_email, v_interest, v_message)
  returning id into v_id;

  return v_id;
end $$;

revoke all on function public.submit_enquiry(text, text, text, text, text) from public;
grant execute on function public.submit_enquiry(text, text, text, text, text) to anon, authenticated;

-- ---------- dashboard_stats: real counts for the dashboard overview ----------
-- Every signed-in staff member gets content counts; enquiry counts need admin; admin count needs super admin.
create or replace function public.dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not (select public.is_staff()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  r := jsonb_build_object(
    'programmes_published', (select count(*) from public.programmes where status = 'published'),
    'programmes_draft',     (select count(*) from public.programmes where status = 'draft'),
    'news_published',       (select count(*) from public.news_articles where status = 'published'),
    'news_draft',           (select count(*) from public.news_articles where status = 'draft'),
    'media_files',          (select count(*) from public.media)
  );

  if (select public.is_admin()) then
    r := r || jsonb_build_object(
      'enquiries_total',       (select count(*) from public.enquiries),
      'enquiries_new',         (select count(*) from public.enquiries where status = 'new'),
      'enquiries_in_progress', (select count(*) from public.enquiries where status = 'in_progress'),
      'enquiries_this_month',  (select count(*) from public.enquiries where created_at >= date_trunc('month', now())),
      'enquiries_last_month',  (select count(*) from public.enquiries
                                 where created_at >= date_trunc('month', now()) - interval '1 month'
                                   and created_at <  date_trunc('month', now()))
    );
  end if;

  if (select public.is_super_admin()) then
    r := r || jsonb_build_object('admins_active', (select count(*) from public.profiles where is_active));
  end if;

  return r;
end $$;

revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;

-- ---------- enquiries_by_day: numbers for the dashboard chart (zero-filled) ----------
create or replace function public.enquiries_by_day(p_days integer default 30)
returns table (day date, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_days  integer := least(greatest(coalesce(p_days, 30), 1), 366);
  v_today date := (now() at time zone 'Africa/Kampala')::date;
begin
  if not (select public.is_admin()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return query
    select g.d::date, count(e.id)
    from generate_series((v_today - (v_days - 1))::timestamp, v_today::timestamp, interval '1 day') as g(d)
    left join public.enquiries e
           on (e.created_at at time zone 'Africa/Kampala')::date = g.d::date
    group by g.d
    order by g.d;
end $$;

revoke all on function public.enquiries_by_day(integer) from public, anon;
grant execute on function public.enquiries_by_day(integer) to authenticated;
