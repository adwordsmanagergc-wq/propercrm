-- ===========================================================================
-- Proper CRM — storage buckets
--   job-photos    private, path: <company_id>/<job_id>/<file>
--   company-logos public,  path: <company_id>/<file>
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('job-photos', 'job-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('company-logos', 'company-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- A cast that returns null instead of throwing on a malformed path segment.
create or replace function public.try_uuid(p_text text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;

create policy "job photos are readable by the company"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'job-photos'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_company_id()
    and (public.is_staff() or public.job_is_mine(public.try_uuid((storage.foldername(name))[2])))
  );

create policy "job photos are written by the assigned cleaner or staff"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-photos'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_company_id()
    and (public.is_staff() or public.job_is_mine(public.try_uuid((storage.foldername(name))[2])))
  );

create policy "job photos are removed by staff"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'job-photos'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_company_id()
    and public.is_staff()
  );

create policy "company logos are readable by anyone"
  on storage.objects for select to public
  using (bucket_id = 'company-logos');

create policy "company logos are managed by staff"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_company_id()
    and public.is_staff()
  );

create policy "company logos are replaced by staff"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'company-logos'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_company_id()
    and public.is_staff()
  );

create policy "company logos are deleted by staff"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'company-logos'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_company_id()
    and public.is_staff()
  );
