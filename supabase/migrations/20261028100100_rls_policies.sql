-- =====================================================================
-- PIDA website - Migration 2 of 4: privileges and Row Level Security
-- Visitors (role "anon") can only read published public content.
-- Everything else needs a signed-in, active administrator.
-- =====================================================================

alter table public.profiles       enable row level security;
alter table public.media          enable row level security;
alter table public.page_content   enable row level security;
alter table public.site_settings  enable row level security;
alter table public.programmes     enable row level security;
alter table public.news_articles  enable row level security;
alter table public.enquiries      enable row level security;

-- Start from zero privileges, then grant only what is needed (defence in depth on top of RLS).
revoke all on public.profiles, public.media, public.page_content, public.site_settings,
              public.programmes, public.news_articles, public.enquiries
  from anon, authenticated;

grant select on public.programmes, public.news_articles, public.page_content,
                public.site_settings, public.media to anon;
grant select, insert, update, delete on public.programmes, public.news_articles, public.page_content,
                public.site_settings, public.media, public.profiles to authenticated;
-- Enquiries are NEVER inserted directly: visitors use the submit_enquiry() function.
grant select, update, delete on public.enquiries to authenticated;

-- ---------- programmes ----------
drop policy if exists "programmes: public reads published" on public.programmes;
create policy "programmes: public reads published" on public.programmes
  for select to anon, authenticated using (status = 'published');
drop policy if exists "programmes: staff read all" on public.programmes;
create policy "programmes: staff read all" on public.programmes
  for select to authenticated using ((select public.is_staff()));
drop policy if exists "programmes: editors insert" on public.programmes;
create policy "programmes: editors insert" on public.programmes
  for insert to authenticated with check ((select public.can_edit_content()));
drop policy if exists "programmes: editors update" on public.programmes;
create policy "programmes: editors update" on public.programmes
  for update to authenticated using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
drop policy if exists "programmes: admins delete" on public.programmes;
create policy "programmes: admins delete" on public.programmes
  for delete to authenticated using ((select public.is_admin()));

-- ---------- news_articles ----------
drop policy if exists "news: public reads published" on public.news_articles;
create policy "news: public reads published" on public.news_articles
  for select to anon, authenticated using (status = 'published' and published_at <= now());
drop policy if exists "news: staff read all" on public.news_articles;
create policy "news: staff read all" on public.news_articles
  for select to authenticated using ((select public.is_staff()));
drop policy if exists "news: editors insert" on public.news_articles;
create policy "news: editors insert" on public.news_articles
  for insert to authenticated with check ((select public.can_edit_content()));
drop policy if exists "news: editors update" on public.news_articles;
create policy "news: editors update" on public.news_articles
  for update to authenticated using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
drop policy if exists "news: admins delete" on public.news_articles;
create policy "news: admins delete" on public.news_articles
  for delete to authenticated using ((select public.is_admin()));

-- ---------- page_content ----------
drop policy if exists "page_content: public reads published" on public.page_content;
create policy "page_content: public reads published" on public.page_content
  for select to anon, authenticated using (status = 'published');
drop policy if exists "page_content: staff read all" on public.page_content;
create policy "page_content: staff read all" on public.page_content
  for select to authenticated using ((select public.is_staff()));
drop policy if exists "page_content: editors insert" on public.page_content;
create policy "page_content: editors insert" on public.page_content
  for insert to authenticated with check ((select public.can_edit_content()));
drop policy if exists "page_content: editors update" on public.page_content;
create policy "page_content: editors update" on public.page_content
  for update to authenticated using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
drop policy if exists "page_content: admins delete" on public.page_content;
create policy "page_content: admins delete" on public.page_content
  for delete to authenticated using ((select public.is_admin()));

-- ---------- site_settings ----------
drop policy if exists "settings: public reads public settings" on public.site_settings;
create policy "settings: public reads public settings" on public.site_settings
  for select to anon, authenticated using (is_public);
drop policy if exists "settings: admins read all" on public.site_settings;
create policy "settings: admins read all" on public.site_settings
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "settings: admins insert" on public.site_settings;
create policy "settings: admins insert" on public.site_settings
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "settings: admins update" on public.site_settings;
create policy "settings: admins update" on public.site_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "settings: admins delete" on public.site_settings;
create policy "settings: admins delete" on public.site_settings
  for delete to authenticated using ((select public.is_admin()));

-- ---------- media (file metadata) ----------
drop policy if exists "media: everyone reads" on public.media;
create policy "media: everyone reads" on public.media
  for select to anon, authenticated using (true);
drop policy if exists "media: editors insert" on public.media;
create policy "media: editors insert" on public.media
  for insert to authenticated
  with check ((select public.can_edit_content()) and uploaded_by = (select auth.uid()));
drop policy if exists "media: editors update" on public.media;
create policy "media: editors update" on public.media
  for update to authenticated using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
drop policy if exists "media: admins delete" on public.media;
create policy "media: admins delete" on public.media
  for delete to authenticated using ((select public.is_admin()));

-- ---------- profiles ----------
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles: admins read all" on public.profiles;
create policy "profiles: admins read all" on public.profiles
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "profiles: super admin insert" on public.profiles;
create policy "profiles: super admin insert" on public.profiles
  for insert to authenticated with check ((select public.is_super_admin()));
drop policy if exists "profiles: super admin update" on public.profiles;
create policy "profiles: super admin update" on public.profiles
  for update to authenticated using ((select public.is_super_admin())) with check ((select public.is_super_admin()));
drop policy if exists "profiles: super admin delete" on public.profiles;
create policy "profiles: super admin delete" on public.profiles
  for delete to authenticated using ((select public.is_super_admin()));

-- ---------- enquiries (private) ----------
-- No policy for "anon" at all: visitors can neither read nor write this table directly.
drop policy if exists "enquiries: admins read" on public.enquiries;
create policy "enquiries: admins read" on public.enquiries
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "enquiries: admins update" on public.enquiries;
create policy "enquiries: admins update" on public.enquiries
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "enquiries: admins delete" on public.enquiries;
create policy "enquiries: admins delete" on public.enquiries
  for delete to authenticated using ((select public.is_admin()));
