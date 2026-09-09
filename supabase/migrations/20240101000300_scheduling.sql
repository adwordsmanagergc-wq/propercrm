-- ===========================================================================
-- Proper CRM — recurrence maths, job generation and the cleaner job RPCs.
--
-- The recurrence rules here are mirrored exactly in src/lib/recurrence.ts so
-- the "next 5 dates" preview in the UI matches what the database will create.
-- ===========================================================================

create or replace function public.frequency_days(p_frequency public.frequency)
returns integer
language sql
immutable
as $$
  select case p_frequency
    when 'weekly'      then 7
    when 'fortnightly' then 14
    when '4weekly'     then 28
    when '8weekly'     then 56
    else null
  end;
$$;

-- Push a date forward until it lands on a working day (ISO 1=Mon … 7=Sun).
create or replace function public.snap_to_working_day(p_date date, p_working_days smallint[])
returns date
language plpgsql
immutable
as $$
declare
  v_date date := p_date;
  v_i    integer := 0;
begin
  if p_working_days is null or cardinality(p_working_days) = 0 then
    return v_date;
  end if;
  while not (extract(isodow from v_date)::smallint = any (p_working_days)) and v_i < 14 loop
    v_date := v_date + 1;
    v_i := v_i + 1;
  end loop;
  return v_date;
end;
$$;

-- next_date = from_date + frequency interval, snapped to the round's preferred
-- weekday (taken from its anchor date), then forward off any non-working day.
create or replace function public.next_occurrence(
  p_from         date,
  p_frequency    public.frequency,
  p_anchor       date,
  p_working_days smallint[]
)
returns date
language plpgsql
immutable
as $$
declare
  v_days integer := public.frequency_days(p_frequency);
  v_date date;
  v_pref smallint;
  v_gap  integer;
begin
  if v_days is null then
    return null; -- one-off rounds never repeat
  end if;
  v_date := p_from + v_days;
  v_pref := extract(isodow from p_anchor)::smallint;
  v_gap := (v_pref - extract(isodow from v_date)::smallint + 7) % 7;
  v_date := v_date + v_gap;
  return public.snap_to_working_day(v_date, p_working_days);
end;
$$;

-- --------------------------------------------------------------------------
-- Generate jobs for one round, up to p_until. Idempotent: the unique
-- constraint on (template_id, scheduled_date) makes a re-run a no-op.
-- --------------------------------------------------------------------------
create or replace function public.generate_jobs_for_template(p_template uuid, p_until date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t          public.job_templates%rowtype;
  v_working  smallint[];
  v_date     date;
  v_last     date;
  v_created  integer := 0;
  v_guard    integer := 0;
  v_seq      integer;
begin
  select * into t from public.job_templates where id = p_template;
  if not found or not t.is_active then
    return 0;
  end if;

  select c.working_days into v_working from public.companies c where c.id = t.company_id;

  select max(scheduled_date) into v_last from public.jobs where template_id = t.id;

  if v_last is null then
    v_date := public.snap_to_working_day(t.anchor_date, v_working);
  else
    v_date := public.next_occurrence(v_last, t.frequency, t.anchor_date, v_working);
  end if;

  if t.frequency = 'one_off' then
    if v_last is not null then
      return 0;
    end if;
  end if;

  while v_date is not null and v_date <= p_until and v_guard < 400 loop
    v_guard := v_guard + 1;

    select coalesce(max(j.sequence), 0) + 1 into v_seq
    from public.jobs j
    where j.company_id = t.company_id
      and j.scheduled_date = v_date
      and j.assigned_to is not distinct from t.assigned_cleaner;

    insert into public.jobs (
      company_id, template_id, customer_id, property_id, scheduled_date,
      sequence, assigned_to, status, price, duration_mins
    )
    values (
      t.company_id, t.id, t.customer_id, t.property_id, v_date,
      v_seq, t.assigned_cleaner, 'scheduled', t.price, t.duration_mins
    )
    on conflict on constraint jobs_template_date_unique do nothing;

    if found then
      v_created := v_created + 1;
    end if;

    if t.frequency = 'one_off' then
      exit;
    end if;
    v_date := public.next_occurrence(v_date, t.frequency, t.anchor_date, v_working);
  end loop;

  return v_created;
end;
$$;

-- --------------------------------------------------------------------------
-- Top up every active round so the calendar is never empty.
-- --------------------------------------------------------------------------
create or replace function public.topup_company_schedule(p_company uuid, p_weeks integer default 8)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until   date;
  v_total   integer := 0;
  v_tpl     uuid;
begin
  select (now() at time zone coalesce(c.timezone, 'Europe/London'))::date + (p_weeks * 7)
  into v_until
  from public.companies c where c.id = p_company;

  if v_until is null then
    return 0;
  end if;

  for v_tpl in
    select id from public.job_templates where company_id = p_company and is_active
  loop
    v_total := v_total + public.generate_jobs_for_template(v_tpl, v_until);
  end loop;

  return v_total;
end;
$$;

create or replace function public.topup_all_schedules(p_weeks integer default 8)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid;
  v_total   integer := 0;
begin
  for v_company in select id from public.companies loop
    v_total := v_total + public.topup_company_schedule(v_company, p_weeks);
  end loop;
  return v_total;
end;
$$;

revoke all on function public.topup_all_schedules(integer) from public;
grant execute on function public.topup_all_schedules(integer) to service_role;
grant execute on function public.topup_company_schedule(uuid, integer) to authenticated;
grant execute on function public.generate_jobs_for_template(uuid, date) to authenticated;

-- --------------------------------------------------------------------------
-- Finishing a job rolls the round forward.
-- --------------------------------------------------------------------------
create or replace function public.trg_job_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t         public.job_templates%rowtype;
  v_working smallint[];
  v_from    date;
  v_next    date;
  v_seq     integer;
begin
  if new.template_id is null then
    return new;
  end if;
  if new.status not in ('completed', 'skipped') or old.status = new.status then
    return new;
  end if;

  select * into t from public.job_templates where id = new.template_id;
  if not found or not t.is_active or t.frequency = 'one_off' then
    return new;
  end if;

  select c.working_days into v_working from public.companies c where c.id = t.company_id;

  v_from := coalesce(new.completed_at::date, new.scheduled_date);
  v_next := public.next_occurrence(v_from, t.frequency, t.anchor_date, v_working);

  if v_next is null then
    return new;
  end if;

  select coalesce(max(j.sequence), 0) + 1 into v_seq
  from public.jobs j
  where j.company_id = t.company_id
    and j.scheduled_date = v_next
    and j.assigned_to is not distinct from t.assigned_cleaner;

  insert into public.jobs (
    company_id, template_id, customer_id, property_id, scheduled_date,
    sequence, assigned_to, status, price, duration_mins
  )
  values (
    t.company_id, t.id, t.customer_id, t.property_id, v_next,
    v_seq, t.assigned_cleaner, 'scheduled', t.price, t.duration_mins
  )
  on conflict on constraint jobs_template_date_unique do nothing;

  return new;
end;
$$;

create trigger jobs_roll_round_forward
  after update of status on public.jobs
  for each row execute function public.trg_job_finished();

-- ===========================================================================
-- Cleaner job RPCs.
--
-- A cleaner has no RLS policy on `jobs` at all — these functions are the only
-- way they can change one, which is what makes "no photos, no completion" a
-- hard block rather than a UI suggestion.
-- ===========================================================================

create or replace function public.start_job(
  p_job uuid,
  p_lat double precision default null,
  p_lng double precision default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jobs%rowtype;
begin
  select * into j from public.jobs where id = p_job;
  if not found or j.company_id <> public.current_company_id() then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if not (public.is_staff() or j.assigned_to = auth.uid()) then
    raise exception 'That job is not assigned to you' using errcode = '42501';
  end if;
  if j.status not in ('scheduled', 'in_progress') then
    raise exception 'That job is already finished' using errcode = 'P0001';
  end if;

  update public.jobs
  set status = 'in_progress',
      started_at = coalesce(started_at, now()),
      start_lat = coalesce(p_lat, start_lat),
      start_lng = coalesce(p_lng, start_lng)
  where id = p_job;

  insert into public.activity_log (company_id, actor_id, entity, entity_id, action, payload)
  values (j.company_id, auth.uid(), 'job', p_job, 'started', jsonb_build_object('lat', p_lat, 'lng', p_lng));
end;
$$;

create or replace function public.add_job_photo(
  p_job      uuid,
  p_kind     public.photo_kind,
  p_path     text,
  p_lat      double precision default null,
  p_lng      double precision default null,
  p_taken_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  j    public.jobs%rowtype;
  v_id uuid;
begin
  select * into j from public.jobs where id = p_job;
  if not found or j.company_id <> public.current_company_id() then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if not (public.is_staff() or j.assigned_to = auth.uid()) then
    raise exception 'That job is not assigned to you' using errcode = '42501';
  end if;

  insert into public.job_photos (company_id, job_id, kind, storage_path, taken_at, lat, lng, uploaded_by)
  values (j.company_id, p_job, p_kind, p_path, coalesce(p_taken_at, now()), p_lat, p_lng, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.complete_job(
  p_job   uuid,
  p_lat   double precision default null,
  p_lng   double precision default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j       public.jobs%rowtype;
  v_before integer;
  v_after  integer;
begin
  select * into j from public.jobs where id = p_job;
  if not found or j.company_id <> public.current_company_id() then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if not (public.is_staff() or j.assigned_to = auth.uid()) then
    raise exception 'That job is not assigned to you' using errcode = '42501';
  end if;
  if j.status = 'completed' then
    return; -- idempotent: an offline queue may replay this
  end if;
  if j.status in ('cancelled') then
    raise exception 'That job was cancelled' using errcode = 'P0001';
  end if;

  select count(*) filter (where kind = 'before'), count(*) filter (where kind = 'after')
  into v_before, v_after
  from public.job_photos where job_id = p_job;

  if v_before < 1 or v_after < 1 then
    raise exception 'A before photo and an after photo are required' using errcode = 'P0001';
  end if;

  update public.jobs
  set status = 'completed',
      started_at = coalesce(started_at, now()),
      completed_at = now(),
      complete_lat = coalesce(p_lat, complete_lat),
      complete_lng = coalesce(p_lng, complete_lng),
      notes = coalesce(nullif(btrim(coalesce(p_notes, '')), ''), notes),
      skip_reason = null
  where id = p_job;

  insert into public.activity_log (company_id, actor_id, entity, entity_id, action, payload)
  values (j.company_id, auth.uid(), 'job', p_job, 'completed',
          jsonb_build_object('before', v_before, 'after', v_after));
end;
$$;

create or replace function public.skip_job(
  p_job    uuid,
  p_reason public.skip_reason,
  p_notes  text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jobs%rowtype;
begin
  select * into j from public.jobs where id = p_job;
  if not found or j.company_id <> public.current_company_id() then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if not (public.is_staff() or j.assigned_to = auth.uid()) then
    raise exception 'That job is not assigned to you' using errcode = '42501';
  end if;
  if j.status = 'completed' then
    raise exception 'That job is already completed' using errcode = 'P0001';
  end if;

  update public.jobs
  set status = 'skipped',
      skip_reason = p_reason,
      completed_at = now(),
      notes = coalesce(nullif(btrim(coalesce(p_notes, '')), ''), notes)
  where id = p_job;

  insert into public.activity_log (company_id, actor_id, entity, entity_id, action, payload)
  values (j.company_id, auth.uid(), 'job', p_job, 'skipped',
          jsonb_build_object('reason', p_reason, 'notes', p_notes));
end;
$$;

-- The cleaner's own numbers for the "Me" tab, without exposing any rows.
create or replace function public.my_stats()
returns table (
  completed_this_week integer,
  skipped_this_week   integer,
  avg_minutes         integer,
  photo_compliance    integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select j.*
    from public.jobs j
    where j.assigned_to = auth.uid()
      and j.company_id = public.current_company_id()
      and j.scheduled_date >= date_trunc('week', public.company_today())::date
      and j.scheduled_date <= public.company_today()
  ),
  done as (select * from mine where status = 'completed')
  select
    (select count(*) from done)::integer,
    (select count(*) from mine where status = 'skipped')::integer,
    coalesce((
      select avg(extract(epoch from (completed_at - started_at)) / 60)
      from done where started_at is not null and completed_at is not null
    ), 0)::integer,
    coalesce((
      select 100.0 * count(*) filter (
        where exists (select 1 from public.job_photos p where p.job_id = done.id and p.kind = 'before')
          and exists (select 1 from public.job_photos p where p.job_id = done.id and p.kind = 'after')
      ) / nullif(count(*), 0)
      from done
    ), 100)::integer;
$$;

grant execute on function public.start_job(uuid, double precision, double precision) to authenticated;
grant execute on function public.complete_job(uuid, double precision, double precision, text) to authenticated;
grant execute on function public.skip_job(uuid, public.skip_reason, text) to authenticated;
grant execute on function public.add_job_photo(uuid, public.photo_kind, text, double precision, double precision, timestamptz) to authenticated;
grant execute on function public.my_stats() to authenticated;
