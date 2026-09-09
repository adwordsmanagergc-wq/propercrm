-- ===========================================================================
-- A minimal stand-in for the parts of a Supabase database that the Proper CRM
-- migrations depend on: the auth/storage schemas, the three API roles and the
-- auth.uid()/auth.jwt() helpers.
--
-- This file is FOR TESTS ONLY. On a real Supabase project all of it already
-- exists and this file is never applied.
-- ===========================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

create schema if not exists auth;
create schema if not exists storage;
create extension if not exists "pgcrypto";

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists auth.users (
  instance_id        uuid,
  id                 uuid primary key,
  aud                varchar(255),
  role               varchar(255),
  email              varchar(255),
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  raw_app_meta_data  jsonb,
  raw_user_meta_data jsonb,
  created_at         timestamptz,
  updated_at         timestamptz,
  confirmation_token varchar(255),
  recovery_token     varchar(255),
  email_change_token_new varchar(255),
  email_change       varchar(255)
);

create table if not exists auth.identities (
  provider_id     text,
  user_id         uuid references auth.users (id) on delete cascade,
  identity_data   jsonb,
  provider        text,
  last_sign_in_at timestamptz,
  created_at      timestamptz,
  updated_at      timestamptz,
  primary key (provider, provider_id)
);

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'role';
$$;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text,
  owner      uuid,
  created_at timestamptz default now(),
  metadata   jsonb
);
alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)];
$$;

grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.objects to anon;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
