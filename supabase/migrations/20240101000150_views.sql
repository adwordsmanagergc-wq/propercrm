-- ===========================================================================
-- Proper CRM — cleaner-safe views
--
-- Postgres RLS is row-level, but a cleaner must not see *columns* they have no
-- business seeing (job price, company bank details). These views are owned by
-- the schema owner and filter on auth.uid() themselves, so they hand back only
-- the columns a cleaner needs. `jobs` and `companies` have no cleaner-facing
-- RLS policy at all — the view is the only door.
-- ===========================================================================

-- "Today" in the company's own timezone, not the server's.
create or replace function public.company_today()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce(c.timezone, 'Europe/London'))::date
  from public.companies c
  where c.id = public.current_company_id();
$$;
grant execute on function public.company_today() to authenticated;

-- --------------------------------------------------------------------------
-- my_company — the handful of company fields any member may see.
-- --------------------------------------------------------------------------
create view public.my_company
with (security_barrier = true) as
select
  c.id,
  c.name,
  c.slug,
  c.phone,
  c.logo_url,
  c.timezone,
  c.working_days,
  c.plan,
  c.trial_ends_at
from public.companies c
where c.id = public.current_company_id();

-- --------------------------------------------------------------------------
-- my_jobs — a cleaner's own jobs for today and the next 7 days, with the
-- customer details they need on the doorstep. No prices. Ever.
-- --------------------------------------------------------------------------
create view public.my_jobs
with (security_barrier = true) as
select
  j.id,
  j.company_id,
  j.scheduled_date,
  j.sequence,
  j.status,
  j.duration_mins,
  j.started_at,
  j.completed_at,
  j.notes,
  j.skip_reason,
  j.customer_id,
  split_part(btrim(cu.name), ' ', 1)                       as customer_first_name,
  coalesce(nullif(pr.address_line1, ''), cu.address_line1) as address_line1,
  coalesce(pr.address_line2, cu.address_line2)             as address_line2,
  coalesce(nullif(pr.city, ''), cu.city)                   as city,
  coalesce(nullif(pr.postcode, ''), cu.postcode)           as postcode,
  coalesce(pr.lat, cu.lat)                                 as lat,
  coalesce(pr.lng, cu.lng)                                 as lng,
  coalesce(nullif(btrim(coalesce(pr.access_notes, '')), ''), cu.access_notes) as access_notes,
  cu.gate_code,
  cu.dog_on_site,
  t.instructions,
  (select count(*) from public.job_photos p where p.job_id = j.id and p.kind = 'before') as before_photos,
  (select count(*) from public.job_photos p where p.job_id = j.id and p.kind = 'after')  as after_photos,
  (select count(*) from public.job_photos p where p.job_id = j.id and p.kind = 'issue')  as issue_photos
from public.jobs j
join public.customers cu on cu.id = j.customer_id
left join public.properties pr on pr.id = j.property_id
left join public.job_templates t on t.id = j.template_id
where j.assigned_to = auth.uid()
  and j.company_id = public.current_company_id()
  and j.scheduled_date >= public.company_today()
  and j.scheduled_date <= public.company_today() + 7;

revoke all on public.my_company from anon, authenticated;
revoke all on public.my_jobs from anon, authenticated;
grant select on public.my_company to authenticated;
grant select on public.my_jobs to authenticated;
