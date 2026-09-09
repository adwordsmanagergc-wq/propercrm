-- ===========================================================================
-- Realtime — so the office's Today screen ticks over as cleaners finish jobs
-- rather than waiting for someone to hit refresh.
--
-- Subscribers still go through RLS, so a company only ever receives its own
-- changes.
-- ===========================================================================

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'jobs'
  ) then
    alter publication supabase_realtime add table public.jobs;
  end if;
end;
$$;

-- Realtime needs the old row to work out which subscribers an update concerns.
alter table public.jobs replica identity full;
