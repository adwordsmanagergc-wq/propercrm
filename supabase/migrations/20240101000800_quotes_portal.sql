-- ===========================================================================
-- Proper CRM — quotes, the customer portal and customer requests
--
-- Customers and prospects never sign in. Everything they can see is reached
-- through an unguessable token and a SECURITY DEFINER function that returns
-- exactly one customer's (or one quote's) data and nothing else. `anon` still
-- has no grant on any table.
-- ===========================================================================

create type public.quote_status as enum ('draft', 'sent', 'accepted', 'declined', 'expired');
create type public.request_kind as enum ('skip_next', 'extra_clean', 'callback', 'message');

-- --------------------------------------------------------------------------
-- Company settings for quotes
-- --------------------------------------------------------------------------
alter table public.companies
  add column quote_prefix       text    not null default 'Q',
  add column next_quote_number  integer not null default 1 check (next_quote_number > 0),
  add column quote_valid_days   integer not null default 30 check (quote_valid_days between 1 and 365),
  add column quote_terms        text;

-- --------------------------------------------------------------------------
-- Every customer gets a private portal link.
-- --------------------------------------------------------------------------
alter table public.customers
  add column portal_token text not null unique default encode(gen_random_bytes(24), 'hex');

-- …and every invoice a pay link, so it can be paid without signing in.
alter table public.invoices
  add column pay_token text not null unique default encode(gen_random_bytes(24), 'hex');

-- --------------------------------------------------------------------------
-- quotes — a priced offer for a recurring (or one-off) clean. Can be for an
-- existing customer or for a prospect who is not a customer yet; accepting it
-- creates the customer and the round in one go.
-- --------------------------------------------------------------------------
create table public.quotes (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  customer_id    uuid references public.customers (id) on delete set null,
  number         text not null,
  status         public.quote_status not null default 'draft',

  contact_name   text not null check (length(btrim(contact_name)) between 1 and 160),
  contact_email  citext,
  contact_phone  text,
  address_line1  text not null default '',
  address_line2  text,
  city           text,
  postcode       text not null default '',
  lat            double precision,
  lng            double precision,

  frequency      public.frequency not null default '4weekly',
  duration_mins  integer not null default 30 check (duration_mins between 5 and 600),
  proposed_start date,
  valid_until    date not null,
  -- Price per visit. Kept in step with the lines by trigger.
  total          numeric(10, 2) not null default 0 check (total >= 0),
  message        text,

  token          text not null unique default encode(gen_random_bytes(24), 'hex'),
  sent_at        timestamptz,
  viewed_at      timestamptz,
  responded_at   timestamptz,
  decline_reason text,
  template_id    uuid references public.job_templates (id) on delete set null,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint quotes_number_unique unique (company_id, number)
);
create index quotes_company_status_idx on public.quotes (company_id, status);
create index quotes_customer_idx on public.quotes (customer_id);

create table public.quote_lines (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  quote_id    uuid not null references public.quotes (id) on delete cascade,
  description text not null check (length(btrim(description)) between 1 and 200),
  quantity    numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price  numeric(10, 2) not null default 0 check (unit_price >= 0),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index quote_lines_quote_idx on public.quote_lines (quote_id);

create trigger quotes_touch_updated_at
  before update on public.quotes
  for each row execute function public.touch_updated_at();

create or replace function public.trg_quote_lines_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote uuid := coalesce(new.quote_id, old.quote_id);
begin
  update public.quotes q
  set total = coalesce((
    select round(sum(l.quantity * l.unit_price), 2)
    from public.quote_lines l where l.quote_id = v_quote
  ), 0)
  where q.id = v_quote;
  return coalesce(new, old);
end;
$$;

create trigger quote_lines_recalc
  after insert or update or delete on public.quote_lines
  for each row execute function public.trg_quote_lines_changed();

-- --------------------------------------------------------------------------
-- customer_requests — what customers ask for from their portal.
-- --------------------------------------------------------------------------
create table public.customer_requests (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  kind        public.request_kind not null,
  job_id      uuid references public.jobs (id) on delete set null,
  message     text check (message is null or length(message) <= 1000),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index customer_requests_open_idx on public.customer_requests (company_id, created_at desc)
  where resolved_at is null;
create index customer_requests_customer_idx on public.customer_requests (customer_id);

-- --------------------------------------------------------------------------
-- RLS — staff only, same as every other business table.
-- --------------------------------------------------------------------------
alter table public.quotes            enable row level security;
alter table public.quote_lines       enable row level security;
alter table public.customer_requests enable row level security;
alter table public.quotes            force row level security;

do $$
declare t text;
begin
  foreach t in array array['quotes', 'quote_lines', 'customer_requests']
  loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
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
-- Today, in a given company's timezone. company_today() reads the caller's
-- company, which an anonymous portal visitor does not have.
-- --------------------------------------------------------------------------
create or replace function public.today_for_company(p_company uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce(c.timezone, 'Europe/London'))::date
  from public.companies c where c.id = p_company;
$$;

-- --------------------------------------------------------------------------
-- Save a quote and its lines in one call (insert when p_id is null).
-- p_lines: [{ "description": text, "quantity": num, "unit_price": num }, ...]
-- --------------------------------------------------------------------------
create or replace function public.save_quote(
  p_id             uuid,
  p_customer       uuid,
  p_contact_name   text,
  p_contact_email  text,
  p_contact_phone  text,
  p_address_line1  text,
  p_address_line2  text,
  p_city           text,
  p_postcode       text,
  p_frequency      public.frequency,
  p_duration_mins  integer,
  p_proposed_start date,
  p_valid_until    date,
  p_message        text,
  p_lines          jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid := public.current_company_id();
  v_quote   uuid := p_id;
  v_prefix  text;
  v_n       integer;
  v_days    integer;
  v_status  public.quote_status;
  v_line    jsonb;
  v_pos     integer := 0;
begin
  if v_company is null or not public.is_staff() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one line to the quote' using errcode = 'P0001';
  end if;
  if p_customer is not null
     and not exists (select 1 from public.customers where id = p_customer and company_id = v_company) then
    raise exception 'Customer not found' using errcode = 'P0002';
  end if;

  if v_quote is null then
    update public.companies
    set next_quote_number = next_quote_number + 1
    where id = v_company
    returning quote_prefix, next_quote_number - 1, quote_valid_days into v_prefix, v_n, v_days;

    insert into public.quotes (
      company_id, customer_id, number, contact_name, contact_email, contact_phone,
      address_line1, address_line2, city, postcode, frequency, duration_mins,
      proposed_start, valid_until, message, created_by
    ) values (
      v_company, p_customer, v_prefix || '-' || lpad(v_n::text, 4, '0'),
      btrim(p_contact_name), nullif(btrim(coalesce(p_contact_email, '')), ''),
      nullif(btrim(coalesce(p_contact_phone, '')), ''),
      coalesce(btrim(p_address_line1), ''), nullif(btrim(coalesce(p_address_line2, '')), ''),
      nullif(btrim(coalesce(p_city, '')), ''), upper(coalesce(btrim(p_postcode), '')),
      p_frequency, coalesce(p_duration_mins, 30), p_proposed_start,
      coalesce(p_valid_until, public.today_for_company(v_company) + v_days),
      nullif(btrim(coalesce(p_message, '')), ''), auth.uid()
    )
    returning id into v_quote;

    insert into public.activity_log (company_id, actor_id, entity, entity_id, action, payload)
    values (v_company, auth.uid(), 'quote', v_quote, 'created', '{}'::jsonb);
  else
    select status into v_status from public.quotes where id = v_quote and company_id = v_company for update;
    if not found then
      raise exception 'Quote not found' using errcode = 'P0002';
    end if;
    if v_status in ('accepted', 'declined') then
      raise exception 'That quote has already been answered and cannot be changed' using errcode = 'P0001';
    end if;

    update public.quotes set
      customer_id    = p_customer,
      contact_name   = btrim(p_contact_name),
      contact_email  = nullif(btrim(coalesce(p_contact_email, '')), ''),
      contact_phone  = nullif(btrim(coalesce(p_contact_phone, '')), ''),
      address_line1  = coalesce(btrim(p_address_line1), ''),
      address_line2  = nullif(btrim(coalesce(p_address_line2, '')), ''),
      city           = nullif(btrim(coalesce(p_city, '')), ''),
      postcode       = upper(coalesce(btrim(p_postcode), '')),
      frequency      = p_frequency,
      duration_mins  = coalesce(p_duration_mins, 30),
      proposed_start = p_proposed_start,
      valid_until    = coalesce(p_valid_until, valid_until),
      message        = nullif(btrim(coalesce(p_message, '')), ''),
      -- Re-opening an expired quote by editing it.
      status         = case when status = 'expired' then 'sent'::public.quote_status else status end
    where id = v_quote;

    delete from public.quote_lines where quote_id = v_quote;
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_pos := v_pos + 1;
    insert into public.quote_lines (company_id, quote_id, description, quantity, unit_price, position)
    values (
      v_company, v_quote,
      btrim(v_line ->> 'description'),
      coalesce((v_line ->> 'quantity')::numeric, 1),
      coalesce((v_line ->> 'unit_price')::numeric, 0),
      v_pos
    );
  end loop;

  return v_quote;
end;
$$;

-- --------------------------------------------------------------------------
-- What a prospect sees at /q/<token>. Marks the quote viewed, and expires it
-- if its date has passed. Draft quotes are invisible.
-- --------------------------------------------------------------------------
create or replace function public.quote_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  q       public.quotes%rowtype;
  v_today date;
begin
  if p_token is null or length(p_token) < 20 then
    return null;
  end if;

  select * into q from public.quotes where token = p_token for update;
  if not found or q.status = 'draft' then
    return null;
  end if;

  v_today := public.today_for_company(q.company_id);

  if q.status = 'sent' and q.valid_until < v_today then
    update public.quotes set status = 'expired' where id = q.id;
    q.status := 'expired';
  end if;
  if q.viewed_at is null then
    update public.quotes set viewed_at = now() where id = q.id;
  end if;

  return jsonb_build_object(
    'number', q.number,
    'status', q.status,
    'contact_name', q.contact_name,
    'address', concat_ws(', ', nullif(q.address_line1, ''), q.city, nullif(q.postcode, '')),
    'frequency', q.frequency,
    'proposed_start', q.proposed_start,
    'valid_until', q.valid_until,
    'total', q.total,
    'message', q.message,
    'responded_at', q.responded_at,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'description', l.description, 'quantity', l.quantity, 'unit_price', l.unit_price
      ) order by l.position)
      from public.quote_lines l where l.quote_id = q.id
    ), '[]'::jsonb),
    'company', (
      select jsonb_build_object(
        'name', c.name, 'phone', c.phone, 'email', c.email, 'logo_url', c.logo_url,
        'terms', c.quote_terms
      )
      from public.companies c where c.id = q.company_id
    )
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Accept or decline from the quote page. Accepting creates the customer (if
-- the quote was for a prospect), the round, and the first eight weeks of
-- visits. Returns the new status.
-- --------------------------------------------------------------------------
create or replace function public.respond_to_quote(
  p_token  text,
  p_accept boolean,
  p_reason text default null
)
returns public.quote_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  q          public.quotes%rowtype;
  v_today    date;
  v_customer uuid;
  v_template uuid;
  v_start    date;
begin
  select * into q from public.quotes where token = p_token for update;
  if not found or q.status = 'draft' then
    raise exception 'That quote link is not valid' using errcode = 'P0002';
  end if;

  v_today := public.today_for_company(q.company_id);

  if q.status in ('accepted', 'declined') then
    return q.status;
  end if;
  if q.status = 'expired' or q.valid_until < v_today then
    update public.quotes set status = 'expired' where id = q.id;
    raise exception 'This quote has expired. Please get in touch for a fresh one.' using errcode = 'P0001';
  end if;

  if not p_accept then
    update public.quotes
    set status = 'declined', responded_at = now(),
        decline_reason = nullif(left(btrim(coalesce(p_reason, '')), 500), '')
    where id = q.id;

    insert into public.activity_log (company_id, actor_id, entity, entity_id, action, payload)
    values (q.company_id, null, 'quote', q.id, 'declined', jsonb_build_object('reason', p_reason));
    return 'declined';
  end if;

  v_customer := q.customer_id;
  if v_customer is null then
    insert into public.customers (
      company_id, name, phone, email, address_line1, address_line2, city, postcode,
      lat, lng, preferred_contact
    ) values (
      q.company_id, q.contact_name, q.contact_phone, q.contact_email,
      q.address_line1, q.address_line2, q.city, q.postcode, q.lat, q.lng,
      case
        when q.contact_email is not null then 'email'::public.contact_pref
        when q.contact_phone is not null then 'sms'::public.contact_pref
        else 'phone'::public.contact_pref
      end
    )
    returning id into v_customer;
  end if;

  v_start := greatest(coalesce(q.proposed_start, v_today + 7), v_today + 1);

  insert into public.job_templates (
    company_id, customer_id, price, duration_mins, frequency, anchor_date, instructions
  ) values (
    q.company_id, v_customer, q.total, q.duration_mins, q.frequency, v_start,
    'From quote ' || q.number
  )
  returning id into v_template;

  perform public.generate_jobs_for_template(v_template, v_today + 56);

  update public.quotes
  set status = 'accepted', responded_at = now(), customer_id = v_customer, template_id = v_template
  where id = q.id;

  insert into public.activity_log (company_id, actor_id, entity, entity_id, action, payload)
  values (q.company_id, null, 'quote', q.id, 'accepted',
          jsonb_build_object('customer_id', v_customer, 'template_id', v_template));

  return 'accepted';
end;
$$;

-- Quotes past their date flip to expired. Called by the daily cron.
create or replace function public.expire_quotes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.quotes q
  set status = 'expired'
  from public.companies c
  where c.id = q.company_id
    and q.status = 'sent'
    and q.valid_until < (now() at time zone coalesce(c.timezone, 'Europe/London'))::date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- --------------------------------------------------------------------------
-- The customer portal at /portal/<token>.
-- --------------------------------------------------------------------------
create or replace function public.portal_snapshot(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cu      public.customers%rowtype;
  v_today date;
begin
  if p_token is null or length(p_token) < 20 then
    return null;
  end if;

  select * into cu from public.customers where portal_token = p_token;
  if not found or not cu.is_active then
    return null;
  end if;

  v_today := public.today_for_company(cu.company_id);

  return jsonb_build_object(
    'today', v_today,
    'customer', jsonb_build_object(
      'name', cu.name,
      'address', concat_ws(', ', nullif(cu.address_line1, ''), cu.city, nullif(cu.postcode, '')),
      'preferred_contact', cu.preferred_contact
    ),
    'company', (
      select jsonb_build_object(
        'name', c.name, 'phone', c.phone, 'email', c.email, 'logo_url', c.logo_url,
        'bank_account_name', c.bank_account_name, 'bank_sort_code', c.bank_sort_code,
        'bank_account_number', c.bank_account_number
      )
      from public.companies c where c.id = cu.company_id
    ),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object('frequency', t.frequency, 'price', t.price) order by t.created_at)
      from public.job_templates t
      where t.customer_id = cu.id and t.is_active
    ), '[]'::jsonb),
    'upcoming', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', j.id, 'date', j.scheduled_date, 'status', j.status, 'price', j.price
      ) order by j.scheduled_date)
      from (
        select * from public.jobs
        where customer_id = cu.id and status in ('scheduled', 'in_progress')
          and scheduled_date >= v_today
        order by scheduled_date limit 6
      ) j
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', j.id, 'date', j.scheduled_date, 'status', j.status, 'skip_reason', j.skip_reason,
        'completed_at', j.completed_at,
        'photos', coalesce((
          select jsonb_agg(jsonb_build_object('kind', p.kind, 'path', p.storage_path) order by p.taken_at)
          from public.job_photos p
          where p.job_id = j.id and p.kind in ('before', 'after')
        ), '[]'::jsonb)
      ) order by j.scheduled_date desc)
      from (
        select * from public.jobs
        where customer_id = cu.id and status in ('completed', 'skipped')
        order by scheduled_date desc limit 8
      ) j
    ), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'number', i.number, 'issue_date', i.issue_date, 'due_date', i.due_date,
        'status', i.status, 'total', i.total, 'pay_token', i.pay_token
      ) order by i.issue_date desc)
      from (
        select * from public.invoices
        where customer_id = cu.id and status in ('sent', 'overdue', 'paid')
        order by issue_date desc limit 24
      ) i
    ), '[]'::jsonb),
    'open_requests', coalesce((
      select jsonb_agg(jsonb_build_object('kind', r.kind, 'created_at', r.created_at) order by r.created_at desc)
      from public.customer_requests r
      where r.customer_id = cu.id and r.resolved_at is null
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.portal_request(
  p_token   text,
  p_kind    public.request_kind,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cu       public.customers%rowtype;
  v_job    uuid;
  v_id     uuid;
  v_recent integer;
begin
  select * into cu from public.customers where portal_token = p_token and is_active;
  if not found then
    raise exception 'That link is not valid' using errcode = 'P0002';
  end if;

  -- A portal link is not a login; keep a lid on how much it can post.
  select count(*) into v_recent
  from public.customer_requests
  where customer_id = cu.id and created_at > now() - interval '1 day';
  if v_recent >= 5 then
    raise exception 'We have your messages. Please call us if it is urgent.' using errcode = 'P0001';
  end if;

  if p_kind = 'skip_next' then
    select j.id into v_job
    from public.jobs j
    where j.customer_id = cu.id and j.status = 'scheduled'
      and j.scheduled_date >= public.today_for_company(cu.company_id)
    order by j.scheduled_date limit 1;
  end if;

  insert into public.customer_requests (company_id, customer_id, kind, job_id, message)
  values (cu.company_id, cu.id, p_kind, v_job, nullif(left(btrim(coalesce(p_message, '')), 1000), ''))
  returning id into v_id;

  insert into public.activity_log (company_id, actor_id, entity, entity_id, action, payload)
  values (cu.company_id, null, 'customer_request', v_id, 'created', jsonb_build_object('kind', p_kind));

  return v_id;
end;
$$;
