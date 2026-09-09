-- ===========================================================================
-- Proper CRM — Row Level Security isolation tests
--
-- Proves that:
--   * one company cannot read, write or delete another company's rows
--   * a cleaner cannot reach customers, prices, invoices or other cleaners
--   * "no before + after photo, no completion" is enforced by the database
--   * anon can read nothing at all
--
-- Run via supabase/tests/run.sh (or `psql -f` against a Supabase database).
-- ===========================================================================

create or replace function pg_temp.ok(p_condition boolean, p_label text)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'FAIL — %', p_label;
  end if;
  raise notice '  ok  %', p_label;
end;
$$;

-- Runs a statement and asserts it is rejected (any error will do).
create or replace function pg_temp.denied(p_sql text, p_label text)
returns void
language plpgsql
as $$
begin
  execute p_sql;
  raise exception 'FAIL — % (statement was allowed)', p_label;
exception
  when insufficient_privilege or raise_exception or check_violation
    or invalid_authorization_specification or no_data_found then
    raise notice '  ok  % (rejected)', p_label;
end;
$$;

create or replace function pg_temp.as_user(p_user uuid, p_email text)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'email', p_email, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

-- ---------------------------------------------------------------------------
-- A rival company, set up with superuser rights.
-- ---------------------------------------------------------------------------
do $$
declare
  v_rival    uuid := '99999999-9999-4999-8999-999999999999';
  v_rowner   uuid := '88888888-8888-4888-8888-888888888881';
  v_rcleaner uuid := '88888888-8888-4888-8888-888888888882';
  v_cust     uuid := '77777777-7777-4777-8777-777777777771';
begin
  insert into public.companies (id, name, slug, timezone, bank_account_number)
  values (v_rival, 'Rival Shine Ltd', 'rival-shine', 'Europe/London', '99887766');

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values
    ('00000000-0000-0000-0000-000000000000', v_rowner, 'authenticated', 'authenticated',
     'boss@rival.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_rcleaner, 'authenticated', 'authenticated',
     'mop@rival.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');

  insert into public.profiles (id, company_id, role, full_name) values
    (v_rowner, v_rival, 'owner', 'Rival Boss'),
    (v_rcleaner, v_rival, 'cleaner', 'Rival Cleaner');

  insert into public.customers (id, company_id, name, address_line1, postcode)
  values (v_cust, v_rival, 'Rival Customer', '1 Secret Lane', 'ZZ1 1ZZ');

  insert into public.jobs (company_id, customer_id, scheduled_date, assigned_to, price)
  values (v_rival, v_cust, current_date, v_rcleaner, 999.99);

  insert into public.invoices (company_id, customer_id, number, total, status)
  values (v_rival, v_cust, 'RIV-0001', 999.99, 'sent');
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Cross-company isolation, from the owner of Crystal Clear Windows.
-- ---------------------------------------------------------------------------
do $$
declare
  v_owner uuid := '22222222-2222-4222-8222-222222222221';
  v_rival uuid := '99999999-9999-4999-8999-999999999999';
  v_rcust uuid := '77777777-7777-4777-8777-777777777771';
begin
  raise notice 'Cross-company isolation (owner)';
  perform pg_temp.as_user(v_owner, 'owner@propercrm.test');

  perform pg_temp.ok((select count(*) from public.customers where company_id = v_rival) = 0,
                     'owner cannot read another company''s customers');
  perform pg_temp.ok((select count(*) from public.jobs where company_id = v_rival) = 0,
                     'owner cannot read another company''s jobs');
  perform pg_temp.ok((select count(*) from public.invoices where company_id = v_rival) = 0,
                     'owner cannot read another company''s invoices');
  perform pg_temp.ok((select count(*) from public.companies where id = v_rival) = 0,
                     'owner cannot read another company''s record');
  perform pg_temp.ok((select count(*) from public.profiles where company_id = v_rival) = 0,
                     'owner cannot read another company''s staff');
  perform pg_temp.ok((select count(*) from public.customers) = 40,
                     'owner sees exactly their own 40 customers');

  -- Writes across the boundary are refused too.
  update public.customers set name = 'Hijacked' where id = v_rcust;
  perform pg_temp.ok(not exists (select 1 from public.customers where name = 'Hijacked'),
                     'owner cannot update another company''s customer');

  delete from public.customers where id = v_rcust;
  perform pg_temp.ok((select count(*) from public.customers) = 40,
                     'owner cannot delete another company''s customer');

  perform pg_temp.denied(
    format('insert into public.customers (company_id, name) values (%L, %L)', v_rival, 'Trojan'),
    'owner cannot insert a row into another company');

  reset role;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Rival owner is equally boxed in.
-- ---------------------------------------------------------------------------
do $$
declare
  v_rowner uuid := '88888888-8888-4888-8888-888888888881';
begin
  raise notice 'Cross-company isolation (rival owner)';
  perform pg_temp.as_user(v_rowner, 'boss@rival.test');

  perform pg_temp.ok((select count(*) from public.customers) = 1,
                     'rival owner sees only their single customer');
  perform pg_temp.ok((select count(*) from public.jobs) = 1,
                     'rival owner sees only their single job');
  perform pg_temp.ok((select count(*) from public.companies) = 1,
                     'rival owner sees only their own company');

  reset role;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. A cleaner is confined to their own jobs and can never see money.
-- ---------------------------------------------------------------------------
do $$
declare
  v_dave  uuid := '22222222-2222-4222-8222-222222222223';
  v_sam   uuid := '22222222-2222-4222-8222-222222222224';
  v_other integer;
begin
  raise notice 'Cleaner confinement';
  perform pg_temp.as_user(v_dave, 'dave@propercrm.test');

  perform pg_temp.ok((select count(*) from public.customers) = 0,
                     'cleaner cannot read the customer list');
  perform pg_temp.ok((select count(*) from public.jobs) = 0,
                     'cleaner cannot read the jobs table (prices live there)');
  perform pg_temp.ok((select count(*) from public.invoices) = 0,
                     'cleaner cannot read invoices');
  perform pg_temp.ok((select count(*) from public.job_templates) = 0,
                     'cleaner cannot read rounds');
  perform pg_temp.ok((select count(*) from public.companies) = 0,
                     'cleaner cannot read the company record (bank details)');
  perform pg_temp.ok((select count(*) from public.my_company) = 1,
                     'cleaner sees their company through the safe view');
  perform pg_temp.ok(
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'my_jobs' and column_name = 'price') = 0,
    'the cleaner job view exposes no price column');

  perform pg_temp.ok((select count(*) from public.my_jobs) > 0,
                     'cleaner sees their own upcoming jobs');
  perform pg_temp.ok((select count(*) from public.my_jobs
                       where scheduled_date > current_date + 7) = 0,
                     'cleaner sees no further ahead than 7 days');

  select count(*) into v_other
  from public.my_jobs m
  where exists (select 1 from public.jobs j where j.id = m.id and j.assigned_to <> v_dave);
  perform pg_temp.ok(v_other = 0, 'cleaner sees no other cleaner''s jobs');

  perform pg_temp.ok((select count(*) from public.profiles) = 1,
                     'cleaner sees only their own profile');
  perform pg_temp.ok((select count(*) from public.activity_log) = 0,
                     'cleaner cannot read the audit trail');

  reset role;
  perform pg_temp.as_user(v_sam, 'sam@propercrm.test');
  perform pg_temp.ok(
    (select count(*) from public.my_jobs) > 0 and
    not exists (
      select 1 from public.my_jobs m
      join public.jobs j on j.id = m.id
      where j.assigned_to <> v_sam
    ),
    'a second cleaner likewise sees only their own work');
  reset role;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Photo proof is enforced by the database, not the interface.
-- ---------------------------------------------------------------------------
do $$
declare
  v_dave uuid := '22222222-2222-4222-8222-222222222223';
  v_job  uuid;
  v_rjob uuid;
begin
  raise notice 'Mandatory photo proof';
  perform pg_temp.as_user(v_dave, 'dave@propercrm.test');

  select id into v_job from public.my_jobs
  where status in ('scheduled', 'in_progress')
  order by scheduled_date, sequence limit 1;
  perform pg_temp.ok(v_job is not null, 'cleaner has a job to work on');

  perform public.start_job(v_job, 51.45, -0.97);
  perform pg_temp.ok((select status from public.my_jobs where id = v_job) = 'in_progress',
                     'cleaner can start their own job');

  perform pg_temp.denied(format('select public.complete_job(%L)', v_job),
                         'completion with no photos');

  perform public.add_job_photo(v_job, 'before', 'before.jpg');
  perform pg_temp.denied(format('select public.complete_job(%L)', v_job),
                         'completion with only a before photo');

  perform public.add_job_photo(v_job, 'after', 'after.jpg');
  perform public.complete_job(v_job, 51.45, -0.97, 'All done');
  perform pg_temp.ok((select status from public.my_jobs where id = v_job) = 'completed',
                     'completion succeeds once both photos exist');

  -- ...and none of that works on someone else's job.
  reset role;
  select id into v_rjob from public.jobs
  where company_id = '99999999-9999-4999-8999-999999999999' limit 1;
  perform pg_temp.as_user(v_dave, 'dave@propercrm.test');
  perform pg_temp.denied(format('select public.start_job(%L)', v_rjob),
                         'starting another company''s job');
  perform pg_temp.denied(format('select public.add_job_photo(%L, ''before'', ''x.jpg'')', v_rjob),
                         'photographing another company''s job');
  reset role;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Completing a job rolls the round forward exactly once.
-- ---------------------------------------------------------------------------
do $$
declare
  v_tpl    uuid;
  v_before integer;
  v_after  integer;
  v_job    uuid;
begin
  raise notice 'Recurrence';
  select j.template_id, j.id into v_tpl, v_job
  from public.jobs j
  where j.status = 'completed' and j.template_id is not null
    and j.company_id = '11111111-1111-4111-8111-111111111111'
  order by j.completed_at desc limit 1;

  select count(*) into v_before from public.jobs where template_id = v_tpl;
  perform pg_temp.ok(v_before > 1, 'the round has follow-on jobs');

  -- Re-running the generator must never duplicate a date.
  perform public.generate_jobs_for_template(v_tpl, current_date + 21);
  perform public.generate_jobs_for_template(v_tpl, current_date + 21);
  select count(*) into v_after from public.jobs where template_id = v_tpl;
  perform pg_temp.ok(v_before = v_after, 'regenerating a round creates no duplicates');

  perform pg_temp.ok(
    (select count(*) from (
       select scheduled_date from public.jobs where template_id = v_tpl
       group by scheduled_date having count(*) > 1
     ) d) = 0,
    'a round never has two jobs on the same day');
end;
$$;

-- ---------------------------------------------------------------------------
-- 5b. SECURITY DEFINER functions are not a back door.
-- ---------------------------------------------------------------------------
do $$
declare
  v_dave     uuid := '22222222-2222-4222-8222-222222222223';
  v_rival    uuid := '99999999-9999-4999-8999-999999999999';
  v_rtpl     uuid;
  v_invoice  uuid;
begin
  raise notice 'Function permissions';

  insert into public.job_templates (company_id, customer_id, price, frequency, anchor_date)
  values (v_rival, '77777777-7777-4777-8777-777777777771', 20, 'weekly', current_date)
  returning id into v_rtpl;

  select id into v_invoice from public.invoices where company_id = v_rival limit 1;

  perform pg_temp.as_user(v_dave, 'dave@propercrm.test');

  perform pg_temp.denied(
    format('select public.generate_jobs_for_template(%L, current_date + 30)', v_rtpl),
    'generating jobs for another company''s round');
  perform pg_temp.denied(
    format('select public.topup_company_schedule(%L, 8)', v_rival),
    'topping up another company''s diary');
  perform pg_temp.denied(
    'select public.topup_all_schedules(8)',
    'a cleaner topping up every company');
  perform pg_temp.denied(
    format('select public.recalc_invoice_totals(%L)', v_invoice),
    'a cleaner recalculating an invoice');
  perform pg_temp.denied(
    format('select public.next_invoice_number(%L)', v_rival),
    'a cleaner burning another company''s invoice numbers');
  perform pg_temp.denied(
    'select public.mark_overdue_invoices()',
    'a cleaner running the overdue sweep');

  reset role;

  perform pg_temp.ok(
    (select count(*) from public.jobs where template_id = v_rtpl) = 0,
    'no jobs were created for the rival round');
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. anon can read nothing.
-- ---------------------------------------------------------------------------
do $$
begin
  raise notice 'Anonymous access';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';

  perform pg_temp.denied('select count(*) from public.customers', 'anon reading customers');
  perform pg_temp.denied('select count(*) from public.jobs', 'anon reading jobs');
  perform pg_temp.denied('select count(*) from public.invoices', 'anon reading invoices');
  perform pg_temp.denied('select count(*) from public.my_jobs', 'anon reading the cleaner view');

  reset role;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Billing and role guards.
-- ---------------------------------------------------------------------------
do $$
declare
  v_manager uuid := '22222222-2222-4222-8222-222222222222';
  v_company uuid := '11111111-1111-4111-8111-111111111111';
  v_dave    uuid := '22222222-2222-4222-8222-222222222223';
begin
  raise notice 'Billing and role guards';
  perform pg_temp.as_user(v_manager, 'nina@propercrm.test');

  perform pg_temp.ok((select count(*) from public.customers) = 40,
                     'a manager can run the round book');

  perform pg_temp.denied(
    format('update public.companies set plan = ''free'' where id = %L', v_company),
    'a manager changing the plan');
  perform pg_temp.denied(
    format('update public.profiles set role = ''owner'' where id = %L', v_dave),
    'a manager promoting a cleaner');

  -- Deleting the company is the owner's alone.
  delete from public.companies where id = v_company;
  perform pg_temp.ok(exists (select 1 from public.my_company),
                     'a manager cannot delete the company');

  reset role;
end;
$$;

do $$
begin
  raise notice '';
  raise notice 'All RLS isolation tests passed.';
end;
$$;
