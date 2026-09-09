-- ===========================================================================
-- Proper CRM — Row Level Security
--
-- Rule of thumb: every policy is `company_id = public.current_company_id()`
-- plus a role check. Nothing is filtered on the client.
-- ===========================================================================

alter table public.companies     enable row level security;
alter table public.profiles      enable row level security;
alter table public.invites       enable row level security;
alter table public.customers     enable row level security;
alter table public.properties    enable row level security;
alter table public.job_templates enable row level security;
alter table public.jobs          enable row level security;
alter table public.job_photos    enable row level security;
alter table public.invoices      enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.activity_log  enable row level security;

-- Force RLS so even the table owner is subject to it (defence in depth).
alter table public.customers     force row level security;
alter table public.jobs          force row level security;
alter table public.invoices      force row level security;

-- --------------------------------------------------------------------------
-- Base grants. `anon` gets nothing at all; `authenticated` is gated by policy.
-- --------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'companies', 'profiles', 'invites', 'customers', 'properties',
    'job_templates', 'jobs', 'job_photos', 'invoices', 'invoice_lines', 'activity_log'
  ]
  loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end;
$$;

-- --------------------------------------------------------------------------
-- companies — staff only (cleaners use the my_company view)
-- --------------------------------------------------------------------------
create policy companies_select_staff on public.companies
  for select to authenticated
  using (id = public.current_company_id() and public.is_staff());

create policy companies_update_staff on public.companies
  for update to authenticated
  using (id = public.current_company_id() and public.is_staff())
  with check (id = public.current_company_id() and public.is_staff());

create policy companies_delete_owner on public.companies
  for delete to authenticated
  using (id = public.current_company_id() and public.is_owner());

-- --------------------------------------------------------------------------
-- profiles — staff see the team, a cleaner sees only themselves
-- --------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (company_id = public.current_company_id() and (public.is_staff() or id = auth.uid()));

create policy profiles_update on public.profiles
  for update to authenticated
  using (company_id = public.current_company_id() and (public.is_staff() or id = auth.uid()))
  with check (company_id = public.current_company_id());

-- Rows are only ever created by create_company_and_owner / accept_invite,
-- both SECURITY DEFINER. No insert or delete policy on purpose.

-- --------------------------------------------------------------------------
-- invites — staff only
-- --------------------------------------------------------------------------
create policy invites_all_staff on public.invites
  for all to authenticated
  using (company_id = public.current_company_id() and public.is_staff())
  with check (company_id = public.current_company_id() and public.is_staff());

-- --------------------------------------------------------------------------
-- customers / properties / rounds / jobs / invoices — staff only.
-- Cleaners reach their own work through public.my_jobs and the job RPCs.
-- --------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['customers', 'properties', 'job_templates', 'jobs', 'invoices', 'invoice_lines']
  loop
    execute format($f$
      create policy %I on public.%I
        for all to authenticated
        using (company_id = public.current_company_id() and public.is_staff())
        with check (company_id = public.current_company_id() and public.is_staff())
    $f$, t || '_all_staff', t);
  end loop;
end;
$$;

-- --------------------------------------------------------------------------
-- job_photos — staff see all of their company's; a cleaner sees and adds
-- photos for jobs assigned to them.
-- --------------------------------------------------------------------------
create policy job_photos_select on public.job_photos
  for select to authenticated
  using (
    company_id = public.current_company_id()
    and (public.is_staff() or public.job_is_mine(job_id))
  );

create policy job_photos_insert on public.job_photos
  for insert to authenticated
  with check (
    company_id = public.current_company_id()
    and (public.is_staff() or public.job_is_mine(job_id))
    and uploaded_by = auth.uid()
  );

create policy job_photos_delete_staff on public.job_photos
  for delete to authenticated
  using (company_id = public.current_company_id() and public.is_staff());

-- --------------------------------------------------------------------------
-- activity_log — append-only. Anyone in the company may write, staff may read.
-- --------------------------------------------------------------------------
create policy activity_log_select_staff on public.activity_log
  for select to authenticated
  using (company_id = public.current_company_id() and public.is_staff());

create policy activity_log_insert on public.activity_log
  for insert to authenticated
  with check (company_id = public.current_company_id() and actor_id = auth.uid());

-- No update/delete policy: the audit trail is immutable.
