-- =====================================================================
-- PIDA website - Migration 3 of 4: file storage (bucket "media")
-- Images and PDFs, maximum 5 MB each. SVG is deliberately not allowed
-- (SVG files can carry scripts). Files are publicly viewable by link;
-- only signed-in staff can upload, and only administrators can delete.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media files: staff list" on storage.objects;
create policy "media files: staff list" on storage.objects
  for select to authenticated using (bucket_id = 'media' and (select public.is_staff()));

drop policy if exists "media files: editors upload" on storage.objects;
create policy "media files: editors upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and (select public.can_edit_content()));

drop policy if exists "media files: editors replace" on storage.objects;
create policy "media files: editors replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.can_edit_content()))
  with check (bucket_id = 'media' and (select public.can_edit_content()));

drop policy if exists "media files: admins delete" on storage.objects;
create policy "media files: admins delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and (select public.is_admin()));
