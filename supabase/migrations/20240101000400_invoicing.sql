-- ===========================================================================
-- Proper CRM — invoicing helpers
-- ===========================================================================

-- Keep invoice totals in step with their lines, always.
create or replace function public.recalc_invoice_totals(p_invoice uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.invoices i
  set subtotal = coalesce(l.sum, 0),
      total    = coalesce(l.sum, 0)
  from (
    select round(sum(quantity * unit_price), 2) as sum
    from public.invoice_lines
    where invoice_id = p_invoice
  ) l
  where i.id = p_invoice;
$$;

create or replace function public.trg_invoice_lines_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recalc_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return coalesce(new, old);
end;
$$;

create trigger invoice_lines_recalc
  after insert or update or delete on public.invoice_lines
  for each row execute function public.trg_invoice_lines_changed();

-- --------------------------------------------------------------------------
-- Create an invoice from one or many completed jobs, in a single call:
-- allocate the next number, write the lines, flag the jobs as invoiced.
-- --------------------------------------------------------------------------
create or replace function public.create_invoice_from_jobs(
  p_customer uuid,
  p_job_ids  uuid[],
  p_notes    text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid := public.current_company_id();
  v_invoice uuid;
  v_number  text;
  v_terms   integer;
  v_today   date;
  v_pos     integer := 0;
  r         record;
begin
  if v_company is null or not public.is_staff() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_job_ids is null or cardinality(p_job_ids) = 0 then
    raise exception 'Pick at least one completed job' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.customers where id = p_customer and company_id = v_company) then
    raise exception 'Customer not found' using errcode = 'P0002';
  end if;

  select c.payment_terms_days,
         (now() at time zone coalesce(c.timezone, 'Europe/London'))::date
  into v_terms, v_today
  from public.companies c where c.id = v_company;

  v_number := public.next_invoice_number(v_company);

  insert into public.invoices (company_id, customer_id, number, issue_date, due_date, status, notes)
  values (v_company, p_customer, v_number, v_today, v_today + v_terms, 'draft', p_notes)
  returning id into v_invoice;

  for r in
    select j.id, j.price, j.scheduled_date, cu.address_line1, cu.postcode
    from public.jobs j
    join public.customers cu on cu.id = j.customer_id
    where j.id = any (p_job_ids)
      and j.company_id = v_company
      and j.customer_id = p_customer
      and j.status = 'completed'
      and not j.invoiced
    order by j.scheduled_date
  loop
    v_pos := v_pos + 1;
    insert into public.invoice_lines (company_id, invoice_id, job_id, description, quantity, unit_price, position)
    values (
      v_company, v_invoice, r.id,
      'Window clean — ' || to_char(r.scheduled_date, 'DD Mon YYYY')
        || case when r.address_line1 <> '' then ' — ' || r.address_line1 else '' end,
      1, r.price, v_pos
    );
    update public.jobs set invoiced = true where id = r.id;
  end loop;

  if v_pos = 0 then
    raise exception 'None of those jobs can be invoiced' using errcode = 'P0001';
  end if;

  perform public.recalc_invoice_totals(v_invoice);

  insert into public.activity_log (company_id, actor_id, entity, entity_id, action, payload)
  values (v_company, auth.uid(), 'invoice', v_invoice, 'created',
          jsonb_build_object('number', v_number, 'jobs', v_pos));

  return v_invoice;
end;
$$;

grant execute on function public.create_invoice_from_jobs(uuid, uuid[], text) to authenticated;

-- Releasing an invoice's jobs when it is voided or deleted.
create or replace function public.trg_invoice_line_release_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.job_id is not null then
    update public.jobs set invoiced = false where id = old.job_id;
  end if;
  return old;
end;
$$;

create trigger invoice_lines_release_job
  after delete on public.invoice_lines
  for each row execute function public.trg_invoice_line_release_job();

-- --------------------------------------------------------------------------
-- Aged debt summary: 0-30 / 31-60 / 60+ days past the due date.
-- --------------------------------------------------------------------------
create or replace function public.aged_debt()
returns table (
  bucket_current numeric,
  bucket_0_30    numeric,
  bucket_31_60   numeric,
  bucket_60_plus numeric,
  total_owed     numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with owed as (
    select i.total, (public.company_today() - i.due_date) as days_over
    from public.invoices i
    where i.company_id = public.current_company_id()
      and public.is_staff()
      and i.status in ('sent', 'overdue')
  )
  select
    coalesce(sum(total) filter (where days_over < 0), 0),
    coalesce(sum(total) filter (where days_over between 0 and 30), 0),
    coalesce(sum(total) filter (where days_over between 31 and 60), 0),
    coalesce(sum(total) filter (where days_over > 60), 0),
    coalesce(sum(total), 0)
  from owed;
$$;

grant execute on function public.aged_debt() to authenticated;

-- Customer balance owed + lifetime value, for the customers table.
create or replace function public.customer_balances()
returns table (customer_id uuid, balance numeric, lifetime_value numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    coalesce(sum(i.total) filter (where i.status in ('sent', 'overdue')), 0),
    coalesce(sum(i.total) filter (where i.status = 'paid'), 0)
  from public.customers c
  left join public.invoices i on i.customer_id = c.id
  where c.company_id = public.current_company_id() and public.is_staff()
  group by c.id;
$$;

grant execute on function public.customer_balances() to authenticated;

-- Anything sent and past its due date is overdue. Called by the daily cron.
create or replace function public.mark_overdue_invoices()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.invoices i
  set status = 'overdue'
  from public.companies c
  where c.id = i.company_id
    and i.status = 'sent'
    and i.due_date < (now() at time zone coalesce(c.timezone, 'Europe/London'))::date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_overdue_invoices() from public;
grant execute on function public.mark_overdue_invoices() to service_role;
