-- =====================================================================
-- PIDA website - Migration 1 of 4: core schema
-- Run the four migrations in order. Each one is safe to run again.
-- =====================================================================

-- ---------- Enumerated types ----------
do $$ begin create type public.user_role as enum ('super_admin', 'admin', 'editor');
exception when duplicate_object then null; end $$;

do $$ begin create type public.content_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin create type public.enquiry_status as enum ('new', 'read', 'in_progress', 'resolved', 'archived');
exception when duplicate_object then null; end $$;

-- ---------- Generic helper: keep updated_at current ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- profiles: one row per administrator (linked to Supabase Auth) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  role        public.user_role not null default 'editor',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_email_lowercase check (email = lower(email))
);
create unique index if not exists profiles_email_key on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role) where is_active;

-- ---------- Role helper functions (used by the security rules) ----------
-- SECURITY DEFINER lets them read profiles even though visitors cannot.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active)
$$;

create or replace function public.can_edit_content()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.is_active
                   and p.role in ('editor', 'admin', 'super_admin'))
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.is_active
                   and p.role in ('admin', 'super_admin'))
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.is_active and p.role = 'super_admin')
$$;

create or replace function public.active_super_admin_count()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.profiles where role = 'super_admin' and is_active
$$;

-- ---------- media: metadata for files kept in Supabase Storage ----------
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  bucket       text not null default 'media',
  storage_path text not null unique,
  file_name    text not null check (char_length(file_name) between 1 and 255),
  mime_type    text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf')),
  size_bytes   bigint not null check (size_bytes > 0 and size_bytes <= 5242880),
  alt_text     text not null default '' check (char_length(alt_text) <= 300),
  uploaded_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists media_created_idx on public.media (created_at desc);

-- ---------- page_content: editable blocks of the public pages ----------
create table if not exists public.page_content (
  id          uuid primary key default gen_random_uuid(),
  page_key    text not null check (page_key    ~ '^[a-z0-9_-]{1,40}$'),
  section_key text not null check (section_key ~ '^[a-z0-9_-]{1,40}$'),
  content     jsonb not null default '{}'::jsonb
              check (jsonb_typeof(content) in ('object', 'array') and octet_length(content::text) <= 200000),
  status      public.content_status not null default 'draft',
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint page_content_unique_block unique (page_key, section_key)
);
create index if not exists page_content_status_idx on public.page_content (status);

-- ---------- site_settings: contact details and other settings ----------
create table if not exists public.site_settings (
  key         text primary key check (key ~ '^[a-z0-9_]{1,60}$'),
  value       jsonb not null check (octet_length(value::text) <= 20000),
  is_public   boolean not null default true,   -- false = only administrators can read it
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- ---------- programmes ----------
create table if not exists public.programmes (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title        text not null check (char_length(title) between 2 and 120),
  points       text[] not null default '{}'
               check (cardinality(points) between 1 and 6),
  icon         text not null default 'star'
               check (icon in ('book','briefcase','star','home','heart','users','cap','droplet','steth','sprout','leaf','link','phone','mail','pin')),
  color        text not null default '#D31F2A' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  image_id     uuid references public.media (id) on delete set null,
  sort_order   integer not null default 0,
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  updated_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists programmes_public_idx on public.programmes (status, sort_order);

-- ---------- news_articles ----------
create table if not exists public.news_articles (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title        text not null check (char_length(title) between 2 and 160),
  summary      text not null default '' check (char_length(summary) <= 400),
  body         text not null default '' check (char_length(body) <= 50000),
  cover_id     uuid references public.media (id) on delete set null,
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  author_id    uuid references public.profiles (id) on delete set null,
  created_by   uuid references public.profiles (id) on delete set null,
  updated_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists news_public_idx on public.news_articles (status, published_at desc);

-- ---------- enquiries (contact form messages: private) ----------
create table if not exists public.enquiries (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 2 and 120),
  email          text not null check (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  interest       text check (interest in ('Volunteering', 'Partnership', 'Donating', 'Something else')),
  message        text not null check (char_length(message) between 5 and 5000),
  status         public.enquiry_status not null default 'new',
  assigned_to    uuid references public.profiles (id) on delete set null,
  internal_notes text not null default '' check (char_length(internal_notes) <= 5000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  handled_at     timestamptz
);
create index if not exists enquiries_status_idx  on public.enquiries (status, created_at desc);
create index if not exists enquiries_created_idx on public.enquiries (created_at desc);
create index if not exists enquiries_email_idx   on public.enquiries (email, created_at desc);

-- ---------- Triggers ----------
-- updated_at on every table that has it
do $$
declare t text;
begin
  foreach t in array array['profiles','page_content','site_settings','programmes','news_articles','enquiries'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
  end loop;
end $$;

-- Stamp published_at the first time something is published
create or replace function public.set_published_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

drop trigger if exists programmes_set_published_at on public.programmes;
create trigger programmes_set_published_at before insert or update on public.programmes
  for each row execute function public.set_published_at();
drop trigger if exists news_set_published_at on public.news_articles;
create trigger news_set_published_at before insert or update on public.news_articles
  for each row execute function public.set_published_at();

-- Only administrators (not editors) may publish, unpublish or archive.
-- Direct database connections (SQL Editor, migrations) are trusted and skip this check.
create or replace function public.enforce_publish_rights()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if (tg_op = 'INSERT' and new.status <> 'draft')
       or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
      if not (select public.is_admin()) then
        raise exception 'Only an administrator can publish, unpublish or archive content.' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists programmes_publish_rights on public.programmes;
create trigger programmes_publish_rights before insert or update on public.programmes
  for each row execute function public.enforce_publish_rights();
drop trigger if exists news_publish_rights on public.news_articles;
create trigger news_publish_rights before insert or update on public.news_articles
  for each row execute function public.enforce_publish_rights();
drop trigger if exists page_content_publish_rights on public.page_content;
create trigger page_content_publish_rights before insert or update on public.page_content
  for each row execute function public.enforce_publish_rights();

-- Profiles: only a super administrator may change role, status or email,
-- and the site can never be left without an active super administrator.
create or replace function public.guard_profiles()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'UPDATE' and not (select public.is_super_admin()) then
      if new.role is distinct from old.role
         or new.is_active is distinct from old.is_active
         or new.email is distinct from old.email
         or new.id is distinct from old.id then
        raise exception 'Only a super administrator can change roles, status or email.' using errcode = '42501';
      end if;
    end if;
    if tg_op in ('UPDATE', 'DELETE') and old.role = 'super_admin' and old.is_active then
      if (tg_op = 'DELETE' or new.role <> 'super_admin' or not new.is_active)
         and (select public.active_super_admin_count()) <= 1 then
        raise exception 'There must always be at least one active super administrator.' using errcode = '23514';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update or delete on public.profiles
  for each row execute function public.guard_profiles();

-- Enquiries: staff can change status, assignment and notes, but never the visitor's own words.
create or replace function public.protect_enquiry_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.name is distinct from old.name or new.email is distinct from old.email
       or new.message is distinct from old.message or new.interest is distinct from old.interest
       or new.created_at is distinct from old.created_at or new.id is distinct from old.id then
      raise exception 'The details a visitor submitted cannot be changed.' using errcode = '42501';
    end if;
  end if;
  if new.status in ('resolved', 'archived') and old.status not in ('resolved', 'archived') then
    new.handled_at := now();
  elsif new.status in ('new', 'read', 'in_progress') then
    new.handled_at := null;
  end if;
  return new;
end $$;

drop trigger if exists enquiries_protect on public.enquiries;
create trigger enquiries_protect before update on public.enquiries
  for each row execute function public.protect_enquiry_fields();
