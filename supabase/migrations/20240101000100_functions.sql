-- ===========================================================================
-- Proper CRM — helper functions
--
-- Everything security-sensitive lives here as SECURITY DEFINER with an empty
-- search_path. RLS policies call these instead of re-querying profiles, which
-- would recurse.
-- ===========================================================================

-- --------------------------------------------------------------------------
-- Who is asking?
-- --------------------------------------------------------------------------
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.company_id
  from public.profiles p
  where p.id = auth.uid() and p.is_active
  limit 1;
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.is_active
  limit 1;
$$;

-- Owner or manager: everything except billing / deleting the company.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() in ('owner', 'manager'), false);
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'owner', false);
$$;

-- Used by policies on child tables (job_photos) that must not leak `jobs`.
create or replace function public.job_is_mine(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.jobs j
    where j.id = p_job_id
      and j.company_id = public.current_company_id()
      and j.assigned_to = auth.uid()
  );
$$;

revoke all on function public.current_company_id() from public;
revoke all on function public.current_user_role() from public;
revoke all on function public.is_staff() from public;
revoke all on function public.is_owner() from public;
revoke all on function public.job_is_mine(uuid) from public;
grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.job_is_mine(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- Sign-up: create the company and make the caller its owner.
-- --------------------------------------------------------------------------
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.create_company_and_owner(
  p_company_name text,
  p_full_name    text,
  p_phone        text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_company uuid;
  v_base    text;
  v_slug    text;
  v_n       integer := 0;
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  if exists (select 1 from public.profiles where id = v_user) then
    raise exception 'This account already belongs to a company' using errcode = '23505';
  end if;

  v_base := nullif(public.slugify(p_company_name), '');
  if v_base is null then
    v_base := 'company';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.companies c where c.slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  insert into public.companies (name, slug, email)
  values (btrim(p_company_name), v_slug, auth.jwt() ->> 'email')
  returning id into v_company;

  insert into public.profiles (id, company_id, role, full_name, phone)
  values (v_user, v_company, 'owner', btrim(p_full_name), nullif(btrim(coalesce(p_phone, '')), ''));

  insert into public.activity_log (company_id, actor_id, entity, entity_id, action, payload)
  values (v_company, v_user, 'company', v_company, 'created', jsonb_build_object('name', p_company_name));

  return v_company;
end;
$$;

grant execute on function public.create_company_and_owner(text, text, text) to authenticated;

-- --------------------------------------------------------------------------
-- Invites
-- --------------------------------------------------------------------------
-- Readable by an authenticated user who has not joined a company yet, so the
-- accept-invite screen can show who invited them. Only ever one row, by token.
create or replace function public.invite_preview(p_token text)
returns table (company_name text, role public.user_role, email text, expired boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, i.role, i.email::text, (i.expires_at < now() or i.accepted_at is not null)
  from public.invites i
  join public.companies c on c.id = i.company_id
  where i.token = p_token;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_email  text := lower(auth.jwt() ->> 'email');
  v_invite public.invites%rowtype;
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  select * into v_invite from public.invites where token = p_token for update;

  if not found then
    raise exception 'That invite link is not valid' using errcode = 'P0002';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'That invite has already been used' using errcode = 'P0001';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'That invite has expired' using errcode = 'P0001';
  end if;
  if v_email is null or lower(v_invite.email::text) <> v_email then
    raise exception 'This invite was sent to a different email address' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_user) then
    raise exception 'This account already belongs to a company' using errcode = '23505';
  end if;

  insert into public.profiles (id, company_id, role, full_name)
  values (v_user, v_invite.company_id, v_invite.role,
          coalesce(nullif(btrim(coalesce(v_invite.full_name, '')), ''), split_part(v_email, '@', 1)));

  update public.invites set accepted_at = now() where id = v_invite.id;

  insert into public.activity_log (company_id, actor_id, entity, entity_id, action, payload)
  values (v_invite.company_id, v_user, 'profile', v_user, 'joined',
          jsonb_build_object('role', v_invite.role, 'email', v_email));

  return v_invite.company_id;
end;
$$;

grant execute on function public.invite_preview(text) to authenticated, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- --------------------------------------------------------------------------
-- Guards: only an owner touches billing, only an owner changes roles, and a
-- company can never be left without an owner.
-- --------------------------------------------------------------------------
create or replace function public.guard_company_billing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Service-role / migrations have no auth.uid(); leave them alone.
  if auth.uid() is null then
    return new;
  end if;
  if (new.plan is distinct from old.plan or new.trial_ends_at is distinct from old.trial_ends_at)
     and not public.is_owner() then
    raise exception 'Only the owner can change billing' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger companies_guard_billing
  before update on public.companies
  for each row execute function public.guard_company_billing();

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owners integer;
begin
  if auth.uid() is not null
     and (new.role is distinct from old.role)
     and not public.is_owner() then
    raise exception 'Only the owner can change roles' using errcode = '42501';
  end if;

  if (old.role = 'owner' and new.role <> 'owner')
     or (old.role = 'owner' and old.is_active and not new.is_active) then
    select count(*) into v_owners
    from public.profiles
    where company_id = old.company_id and role = 'owner' and is_active and id <> old.id;
    if v_owners = 0 then
      raise exception 'A company must always have at least one active owner' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- --------------------------------------------------------------------------
-- Per-company sequential invoice numbers.
-- --------------------------------------------------------------------------
create or replace function public.next_invoice_number(p_company uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefix text;
  v_n      integer;
begin
  update public.companies
  set next_invoice_number = next_invoice_number + 1
  where id = p_company
  returning invoice_prefix, next_invoice_number - 1 into v_prefix, v_n;

  if v_n is null then
    raise exception 'Unknown company' using errcode = 'P0002';
  end if;

  return v_prefix || '-' || lpad(v_n::text, 4, '0');
end;
$$;

revoke all on function public.next_invoice_number(uuid) from public;
