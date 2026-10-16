-- ===========================================================================
-- Proper CRM — automatic customer messages, card payments, and reports
-- ===========================================================================

-- --------------------------------------------------------------------------
-- Messaging settings. A null template means "use the built-in wording", so
-- improvements to the defaults reach everyone who has not customised theirs.
-- --------------------------------------------------------------------------
alter table public.companies
  add column notify_visit_reminder boolean not null default false,
  add column notify_job_done       boolean not null default false,
  add column notify_overdue        boolean not null default false,
  add column chase_every_days      integer not null default 7 check (chase_every_days between 3 and 60),
  add column sms_sender            text check (sms_sender is null or sms_sender ~ '^[A-Za-z0-9]{1,11}$'),
  add column tpl_visit_reminder    text check (tpl_visit_reminder is null or length(tpl_visit_reminder) <= 1000),
  add column tpl_job_done          text check (tpl_job_done is null or length(tpl_job_done) <= 1000),
  add column tpl_overdue           text check (tpl_overdue is null or length(tpl_overdue) <= 1000),
  add column tpl_invoice           text check (tpl_invoice is null or length(tpl_invoice) <= 1000),
  add column tpl_quote             text check (tpl_quote is null or length(tpl_quote) <= 1000),
  -- Stripe Connect. Written only by the server (service role), never a form.
  add column stripe_account_id      text,
  add column stripe_charges_enabled boolean not null default false;

alter table public.invoices
  add column stripe_session_id text;

create or replace function public.guard_company_stripe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and (new.stripe_account_id is distinct from old.stripe_account_id
          or new.stripe_charges_enabled is distinct from old.stripe_charges_enabled) then
    raise exception 'Card payment settings are managed by Stripe' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger companies_guard_stripe
  before update on public.companies
  for each row execute function public.guard_company_stripe();

-- --------------------------------------------------------------------------
-- message_log — every email and text, sent or not, and why.
-- dedupe_key stops the daily run sending the same reminder twice.
-- --------------------------------------------------------------------------
create table public.message_log (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  kind        text not null check (kind in ('visit_reminder', 'job_done', 'overdue', 'invoice', 'quote', 'portal')),
  channel     text not null check (channel in ('email', 'sms')),
  recipient   text not null default '',
  subject     text,
  body        text not null,
  status      text not null check (status in ('sent', 'failed', 'skipped')),
  error       text,
  provider_id text,
  related_id  uuid,
  dedupe_key  text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index message_log_company_idx on public.message_log (company_id, created_at desc);
create index message_log_customer_idx on public.message_log (customer_id, created_at desc);
-- Only a message that actually went out (or was deliberately skipped) claims
-- its key. A failure leaves it free, so tomorrow's run tries again.
create unique index message_log_dedupe_idx on public.message_log (company_id, dedupe_key)
  where dedupe_key is not null and status <> 'failed';

alter table public.message_log enable row level security;
revoke all on public.message_log from anon;
grant select, insert on public.message_log to authenticated;
grant all on public.message_log to service_role;

create policy message_log_select_staff on public.message_log
  for select to authenticated
  using (company_id = public.current_company_id() and public.is_staff());

create policy message_log_insert_staff on public.message_log
  for insert to authenticated
  with check (company_id = public.current_company_id() and public.is_staff() and created_by = auth.uid());

-- Like the activity log: no update or delete.

-- --------------------------------------------------------------------------
-- Reports
-- --------------------------------------------------------------------------
create or replace function public.visits_per_year(p_frequency public.frequency)
returns numeric
language sql
immutable
as $$
  select case p_frequency
    when 'weekly' then 52
    when 'fortnightly' then 26
    when '4weekly' then 13
    when '8weekly' then 6.5
    else 0
  end::numeric;
$$;

create or replace function public.report_summary(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company uuid := public.current_company_id();
  v_today   date;
begin
  if v_company is null or not public.is_staff() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 800 then
    raise exception 'Pick a date range of up to two years' using errcode = 'P0001';
  end if;

  v_today := public.today_for_company(v_company);

  return jsonb_build_object(
    'work', (
      select jsonb_build_object(
        'completed', count(*) filter (where status = 'completed'),
        'skipped', count(*) filter (where status = 'skipped'),
        'value_done', coalesce(sum(price) filter (where status = 'completed'), 0),
        'value_missed', coalesce(sum(price) filter (where status = 'skipped'), 0)
      )
      from public.jobs
      where company_id = v_company and scheduled_date between p_from and p_to
    ),
    'skip_reasons', coalesce((
      select jsonb_agg(jsonb_build_object('reason', skip_reason, 'count', n) order by n desc)
      from (
        select skip_reason, count(*) as n
        from public.jobs
        where company_id = v_company and status = 'skipped'
          and scheduled_date between p_from and p_to
        group by skip_reason
      ) s
    ), '[]'::jsonb),
    'money', jsonb_build_object(
      'invoiced', (
        select coalesce(sum(total), 0) from public.invoices
        where company_id = v_company and status <> 'void' and issue_date between p_from and p_to
      ),
      'collected', (
        select coalesce(sum(total), 0) from public.invoices
        where company_id = v_company and status = 'paid'
          and (paid_at at time zone 'UTC')::date between p_from and p_to
      ),
      'collected_by_card', (
        select coalesce(sum(total), 0) from public.invoices
        where company_id = v_company and status = 'paid' and payment_method = 'card'
          and (paid_at at time zone 'UTC')::date between p_from and p_to
      ),
      'owed_now', (
        select coalesce(sum(total), 0) from public.invoices
        where company_id = v_company and status in ('sent', 'overdue')
      ),
      'uninvoiced_work', (
        select coalesce(sum(price), 0) from public.jobs
        where company_id = v_company and status = 'completed' and not invoiced
      )
    ),
    'cleaners', coalesce((
      select jsonb_agg(row_to_json(c)::jsonb order by c.value_done desc)
      from (
        select
          p.id,
          p.full_name as name,
          count(j.*) filter (where j.status = 'completed') as completed,
          count(j.*) filter (where j.status = 'skipped') as skipped,
          coalesce(sum(j.price) filter (where j.status = 'completed'), 0) as value_done,
          coalesce(round(avg(extract(epoch from (j.completed_at - j.started_at)) / 60)
            filter (where j.status = 'completed' and j.started_at is not null
                    and j.completed_at > j.started_at
                    and j.completed_at - j.started_at < interval '8 hours')), 0) as avg_minutes,
          coalesce(round(100.0 * count(j.*) filter (
            where j.status = 'completed'
              and exists (select 1 from public.job_photos ph where ph.job_id = j.id and ph.kind = 'before')
              and exists (select 1 from public.job_photos ph where ph.job_id = j.id and ph.kind = 'after')
          ) / nullif(count(j.*) filter (where j.status = 'completed'), 0)), 0) as photo_proof_pct
        from public.profiles p
        join public.jobs j
          on j.assigned_to = p.id and j.company_id = v_company
         and j.scheduled_date between p_from and p_to
        where p.company_id = v_company
        group by p.id, p.full_name
      ) c
    ), '[]'::jsonb),
    -- Twelve calendar months ending with the one p_to falls in.
    'monthly', coalesce((
      select jsonb_agg(jsonb_build_object('month', m.month, 'done', m.done, 'collected', m.collected)
                       order by m.month)
      from (
        select
          to_char(g.month, 'YYYY-MM') as month,
          (select coalesce(sum(j.price), 0) from public.jobs j
            where j.company_id = v_company and j.status = 'completed'
              and j.scheduled_date >= g.month and j.scheduled_date < g.month + interval '1 month') as done,
          (select coalesce(sum(i.total), 0) from public.invoices i
            where i.company_id = v_company and i.status = 'paid'
              and i.paid_at >= g.month and i.paid_at < g.month + interval '1 month') as collected
        from generate_series(
          date_trunc('month', p_to::timestamp) - interval '11 months',
          date_trunc('month', p_to::timestamp),
          interval '1 month'
        ) as g(month)
      ) m
    ), '[]'::jsonb),
    'book', (
      select jsonb_build_object(
        'active_customers', (select count(*) from public.customers where company_id = v_company and is_active),
        'new_customers', (select count(*) from public.customers
                          where company_id = v_company
                            and (created_at at time zone 'UTC')::date between p_from and p_to),
        'active_rounds', count(*),
        'avg_round_price', coalesce(round(avg(price), 2), 0),
        'annual_round_value', coalesce(round(sum(price * public.visits_per_year(frequency)), 2), 0)
      )
      from public.job_templates
      where company_id = v_company and is_active and frequency <> 'one_off'
    ),
    'quotes', (
      select jsonb_build_object(
        'sent', count(*) filter (where status <> 'draft'),
        'accepted', count(*) filter (where status = 'accepted'),
        'declined', count(*) filter (where status = 'declined'),
        'open', count(*) filter (where status = 'sent' and valid_until >= v_today),
        'accepted_annual_value', coalesce(round(sum(total * greatest(public.visits_per_year(frequency), 1))
                                   filter (where status = 'accepted'), 2), 0)
      )
      from public.quotes
      where company_id = v_company
        and (coalesce(sent_at, created_at) at time zone 'UTC')::date between p_from and p_to
    ),
    'messages', (
      select jsonb_build_object(
        'sent', count(*) filter (where status = 'sent'),
        'failed', count(*) filter (where status = 'failed')
      )
      from public.message_log
      where company_id = v_company and (created_at at time zone 'UTC')::date between p_from and p_to
    )
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Grants for everything added in 0800 and 0900. New functions are executable
-- by PUBLIC by default, so revoke first, then hand out exactly what is needed.
-- --------------------------------------------------------------------------
revoke all on function public.trg_quote_lines_changed() from public;
revoke all on function public.today_for_company(uuid) from public;
revoke all on function public.save_quote(uuid, uuid, text, text, text, text, text, text, text, public.frequency, integer, date, date, text, jsonb) from public;
revoke all on function public.quote_public(text) from public;
revoke all on function public.respond_to_quote(text, boolean, text) from public;
revoke all on function public.expire_quotes() from public;
revoke all on function public.portal_snapshot(text) from public;
revoke all on function public.portal_request(text, public.request_kind, text) from public;
revoke all on function public.guard_company_stripe() from public;
revoke all on function public.visits_per_year(public.frequency) from public;
revoke all on function public.report_summary(date, date) from public;

grant execute on function public.save_quote(uuid, uuid, text, text, text, text, text, text, text, public.frequency, integer, date, date, text, jsonb) to authenticated;
grant execute on function public.report_summary(date, date) to authenticated;

-- The only things a signed-out visitor can call. Each takes a 48-character
-- token and returns or touches one quote or one customer.
grant execute on function public.quote_public(text) to anon, authenticated;
grant execute on function public.respond_to_quote(text, boolean, text) to anon, authenticated;
grant execute on function public.portal_snapshot(text) to anon, authenticated;
grant execute on function public.portal_request(text, public.request_kind, text) to anon, authenticated;

grant execute on function public.expire_quotes() to service_role;
grant execute on function public.today_for_company(uuid) to service_role;
