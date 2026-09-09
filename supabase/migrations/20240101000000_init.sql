-- ===========================================================================
-- Proper CRM — core schema
-- Every business table carries company_id. Isolation is enforced by RLS
-- (see 20240101000200_rls.sql), never by client-side filtering.
-- ===========================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- --------------------------------------------------------------------------
-- Enums
-- --------------------------------------------------------------------------
create type public.user_role as enum ('owner', 'manager', 'cleaner');
create type public.job_status as enum ('scheduled', 'in_progress', 'completed', 'skipped', 'cancelled');
create type public.frequency as enum ('weekly', 'fortnightly', '4weekly', '8weekly', 'one_off');
create type public.photo_kind as enum ('before', 'after', 'issue');
create type public.invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');
create type public.payment_method as enum ('cash', 'bank', 'card', 'other');
create type public.contact_pref as enum ('phone', 'sms', 'email', 'none');
create type public.skip_reason as enum ('no_access', 'dog_on_site', 'customer_cancelled', 'weather', 'other');

-- --------------------------------------------------------------------------
-- companies
-- --------------------------------------------------------------------------
create table public.companies (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(btrim(name)) between 2 and 120),
  slug                citext not null unique,
  phone               text,
  email               citext,
  logo_url            text,
  timezone            text not null default 'Europe/London',
  plan                text not null default 'trial',
  trial_ends_at       timestamptz not null default (now() + interval '14 days'),

  -- Settings
  start_postcode      text,
  start_lat           double precision,
  start_lng           double precision,
  -- ISO weekday numbers: 1 = Monday … 7 = Sunday
  working_days        smallint[] not null default '{1,2,3,4,5}',
  invoice_prefix      text not null default 'INV',
  next_invoice_number integer not null default 1 check (next_invoice_number > 0),
  payment_terms_days  integer not null default 14 check (payment_terms_days between 0 and 180),
  bank_name           text,
  bank_account_name   text,
  bank_sort_code      text,
  bank_account_number text,
  invoice_footer      text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on column public.companies.working_days is 'ISO weekdays the company works. 1=Mon … 7=Sun.';

-- --------------------------------------------------------------------------
-- profiles — links an auth user to exactly one company + role
-- --------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  company_id  uuid not null references public.companies (id) on delete cascade,
  role        public.user_role not null default 'cleaner',
  full_name   text not null check (length(btrim(full_name)) between 1 and 120),
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_company_idx on public.profiles (company_id) where is_active;

-- --------------------------------------------------------------------------
-- invites
-- --------------------------------------------------------------------------
create table public.invites (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  email       citext not null,
  role        public.user_role not null default 'cleaner',
  full_name   text,
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by  uuid references public.profiles (id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create unique index invites_pending_email_idx
  on public.invites (company_id, email) where accepted_at is null;

-- --------------------------------------------------------------------------
-- customers
-- --------------------------------------------------------------------------
create table public.customers (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  name              text not null check (length(btrim(name)) between 1 and 160),
  phone             text,
  email             citext,
  address_line1     text not null default '',
  address_line2     text,
  city              text,
  postcode          text not null default '',
  lat               double precision,
  lng               double precision,
  access_notes      text,
  gate_code         text,
  dog_on_site       boolean not null default false,
  preferred_contact public.contact_pref not null default 'phone',
  is_active         boolean not null default true,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index customers_company_idx on public.customers (company_id);
create index customers_search_idx on public.customers
  using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(address_line1, '') || ' ' || coalesce(postcode, '')));

-- --------------------------------------------------------------------------
-- properties — optional extra address(es) for a customer
-- --------------------------------------------------------------------------
create table public.properties (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  customer_id      uuid not null references public.customers (id) on delete cascade,
  label            text not null default 'Property',
  address_line1    text not null default '',
  address_line2    text,
  city             text,
  postcode         text not null default '',
  lat              double precision,
  lng              double precision,
  window_count     integer check (window_count >= 0),
  storeys          smallint check (storeys between 1 and 10),
  has_conservatory boolean not null default false,
  price            numeric(10, 2) check (price >= 0),
  access_notes     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index properties_customer_idx on public.properties (customer_id);
create index properties_company_idx on public.properties (company_id);

-- --------------------------------------------------------------------------
-- job_templates — the "rounds"
-- --------------------------------------------------------------------------
create table public.job_templates (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  customer_id       uuid not null references public.customers (id) on delete cascade,
  property_id       uuid references public.properties (id) on delete set null,
  price             numeric(10, 2) not null default 0 check (price >= 0),
  duration_mins     integer not null default 30 check (duration_mins between 5 and 600),
  frequency         public.frequency not null default '4weekly',
  anchor_date       date not null,
  assigned_cleaner  uuid references public.profiles (id) on delete set null,
  is_active         boolean not null default true,
  instructions      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index job_templates_company_idx on public.job_templates (company_id) where is_active;
create index job_templates_customer_idx on public.job_templates (customer_id);

-- --------------------------------------------------------------------------
-- jobs
-- --------------------------------------------------------------------------
create table public.jobs (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  template_id    uuid references public.job_templates (id) on delete set null,
  customer_id    uuid not null references public.customers (id) on delete cascade,
  property_id    uuid references public.properties (id) on delete set null,
  scheduled_date date not null,
  sequence       integer not null default 0,
  assigned_to    uuid references public.profiles (id) on delete set null,
  status         public.job_status not null default 'scheduled',
  price          numeric(10, 2) not null default 0 check (price >= 0),
  duration_mins  integer not null default 30,
  started_at     timestamptz,
  completed_at   timestamptz,
  start_lat      double precision,
  start_lng      double precision,
  complete_lat   double precision,
  complete_lng   double precision,
  notes          text,
  skip_reason    public.skip_reason,
  invoiced       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- A round can only ever produce one job per day. This is what stops the
  -- generator creating duplicates when it is run more than once.
  constraint jobs_template_date_unique unique (template_id, scheduled_date),
  constraint jobs_skip_reason_required check (status <> 'skipped' or skip_reason is not null)
);
create index jobs_company_date_idx on public.jobs (company_id, scheduled_date);
create index jobs_assigned_date_idx on public.jobs (assigned_to, scheduled_date);
create index jobs_customer_idx on public.jobs (customer_id);
create index jobs_uninvoiced_idx on public.jobs (company_id, customer_id)
  where status = 'completed' and not invoiced;

-- --------------------------------------------------------------------------
-- job_photos
-- --------------------------------------------------------------------------
create table public.job_photos (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  job_id       uuid not null references public.jobs (id) on delete cascade,
  kind         public.photo_kind not null,
  storage_path text not null,
  taken_at     timestamptz not null default now(),
  lat          double precision,
  lng          double precision,
  uploaded_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index job_photos_job_idx on public.job_photos (job_id);
create index job_photos_company_idx on public.job_photos (company_id);

-- --------------------------------------------------------------------------
-- invoices
-- --------------------------------------------------------------------------
create table public.invoices (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  customer_id    uuid not null references public.customers (id) on delete cascade,
  number         text not null,
  issue_date     date not null default current_date,
  due_date       date not null default (current_date + 14),
  status         public.invoice_status not null default 'draft',
  subtotal       numeric(10, 2) not null default 0 check (subtotal >= 0),
  total          numeric(10, 2) not null default 0 check (total >= 0),
  paid_at        timestamptz,
  payment_method public.payment_method,
  notes          text,
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint invoices_number_unique unique (company_id, number),
  constraint invoices_paid_needs_date check (status <> 'paid' or paid_at is not null)
);
create index invoices_company_status_idx on public.invoices (company_id, status);
create index invoices_customer_idx on public.invoices (customer_id);

-- --------------------------------------------------------------------------
-- invoice_lines
-- --------------------------------------------------------------------------
create table public.invoice_lines (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  job_id      uuid references public.jobs (id) on delete set null,
  description text not null default '',
  quantity    numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price  numeric(10, 2) not null default 0 check (unit_price >= 0),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);

-- --------------------------------------------------------------------------
-- activity_log — append-only audit trail
-- --------------------------------------------------------------------------
create table public.activity_log (
  id         bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  actor_id   uuid references public.profiles (id) on delete set null,
  entity     text not null,
  entity_id  uuid,
  action     text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_company_idx on public.activity_log (company_id, created_at desc);

-- --------------------------------------------------------------------------
-- updated_at maintenance
-- --------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'companies', 'profiles', 'customers', 'properties',
    'job_templates', 'jobs', 'invoices'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t || '_touch_updated_at', t
    );
  end loop;
end;
$$;
