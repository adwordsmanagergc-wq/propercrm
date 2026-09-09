-- ===========================================================================
-- Lock down function execution.
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, which for a
-- SECURITY DEFINER function means any signed-in user can run it as the owner.
-- Revoke the lot, then hand back exactly what each role needs.
-- ===========================================================================

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from public', fn.signature);
  end loop;
end;
$$;

-- Called while evaluating RLS policies, so the *invoker* needs them.
grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.job_is_mine(uuid) to authenticated;
grant execute on function public.try_uuid(text) to authenticated;
grant execute on function public.company_today() to authenticated;

-- Sign-up and invites.
grant execute on function public.create_company_and_owner(text, text, text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.invite_preview(text) to authenticated, anon;

-- The cleaner job flow. These are the only way a cleaner changes a job.
grant execute on function public.start_job(uuid, double precision, double precision) to authenticated;
grant execute on function public.complete_job(uuid, double precision, double precision, text) to authenticated;
grant execute on function public.skip_job(uuid, public.skip_reason, text) to authenticated;
grant execute on function public.add_job_photo(uuid, public.photo_kind, text, double precision, double precision, timestamptz) to authenticated;
grant execute on function public.my_stats() to authenticated;

-- Office reporting and invoicing.
grant execute on function public.create_invoice_from_jobs(uuid, uuid[], text) to authenticated;
grant execute on function public.aged_debt() to authenticated;
grant execute on function public.customer_balances() to authenticated;

-- Schedule generation, from the app and from the nightly cron.
grant execute on function public.topup_company_schedule(uuid, integer) to authenticated, service_role;
grant execute on function public.generate_jobs_for_template(uuid, date) to authenticated, service_role;
grant execute on function public.topup_all_schedules(integer) to service_role;
grant execute on function public.mark_overdue_invoices() to service_role;

-- Everything else — recalc_invoice_totals, next_invoice_number, slugify, the
-- recurrence helpers — is only ever reached from inside another SECURITY
-- DEFINER function or a trigger, which run as the owner. No grant needed.

-- ---------------------------------------------------------------------------
-- Both generators are SECURITY DEFINER and take a company or template id, so
-- they need to check the caller owns it. auth.uid() is null for the cron,
-- which runs as service_role and is allowed to top up everybody.
-- ---------------------------------------------------------------------------
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

  if auth.uid() is not null and t.company_id is distinct from public.current_company_id() then
    raise exception 'That round belongs to another company' using errcode = '42501';
  end if;

  select c.working_days into v_working from public.companies c where c.id = t.company_id;

  select max(scheduled_date) into v_last from public.jobs where template_id = t.id;

  if v_last is null then
    v_date := public.snap_to_working_day(t.anchor_date, v_working);
  else
    v_date := public.next_occurrence(v_last, t.frequency, t.anchor_date, v_working);
  end if;

  if t.frequency = 'one_off' and v_last is not null then
    return 0;
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

create or replace function public.topup_company_schedule(p_company uuid, p_weeks integer default 8)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until date;
  v_total integer := 0;
  v_tpl   uuid;
begin
  if auth.uid() is not null then
    if p_company is distinct from public.current_company_id() or not public.is_staff() then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
  end if;

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

revoke all on function public.generate_jobs_for_template(uuid, date) from public;
revoke all on function public.topup_company_schedule(uuid, integer) from public;
grant execute on function public.generate_jobs_for_template(uuid, date) to authenticated, service_role;
grant execute on function public.topup_company_schedule(uuid, integer) to authenticated, service_role;
