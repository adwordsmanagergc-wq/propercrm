-- ==========================================================================
-- Where each cleaner starts their day, and letting them re-order it.
--
-- The office sets a start address per person (usually home). Routes are then
-- planned from there instead of the company yard, so a cleaner who lives on
-- the far side of town is not sent across it to start.
-- ==========================================================================

alter table public.profiles
  add column start_address  text check (start_address is null or length(start_address) <= 200),
  add column start_postcode text check (start_postcode is null or length(start_postcode) <= 12),
  add column start_lat      double precision check (start_lat is null or start_lat between -90 and 90),
  add column start_lng      double precision check (start_lng is null or start_lng between -180 and 180);

-- A cleaner may edit their own name and phone (profiles_update allows it), but
-- where they start from is the office's call: it decides everyone's route.
create or replace function public.guard_profile_start()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and not public.is_staff()
     and (new.start_address, new.start_postcode, new.start_lat, new.start_lng)
         is distinct from (old.start_address, old.start_postcode, old.start_lat, old.start_lng) then
    raise exception 'Only the office can change where a cleaner starts from' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_start
  before update on public.profiles
  for each row execute function public.guard_profile_start();

-- --------------------------------------------------------------------------
-- reorder_my_day — a cleaner has no write access to jobs (prices live there),
-- so putting their own day in driving order goes through here. Only their own
-- jobs on that date are touched; anything else in the list is ignored.
-- --------------------------------------------------------------------------
create or replace function public.reorder_my_day(p_date date, p_jobs uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  update public.jobs j
  set sequence = o.ord::integer
  from unnest(p_jobs) with ordinality as o(id, ord)
  where j.id = o.id
    and j.assigned_to = auth.uid()
    and j.company_id = public.current_company_id()
    and j.scheduled_date = p_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.guard_profile_start() from public;
revoke all on function public.reorder_my_day(date, uuid[]) from public;
grant execute on function public.reorder_my_day(date, uuid[]) to authenticated;

-- Plan every cleaner's day overnight. On by default; a firm that hand-orders
-- its rounds turns it off so the night run never undoes their work.
alter table public.companies
  add column auto_route boolean not null default true;

-- The yard, so a cleaner with no start address of their own can still have
-- their day routed from somewhere sensible. Not sensitive: it is the address
-- printed on the van.
create or replace view public.my_company
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
  c.trial_ends_at,
  c.start_lat,
  c.start_lng
from public.companies c
where c.id = public.current_company_id();
