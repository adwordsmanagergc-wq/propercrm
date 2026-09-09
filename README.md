# Proper CRM

Job management for window cleaning companies. Rounds, routes, photo proof and
getting paid — simple enough to use on a phone, in the rain, with one hand.

It is a multi-tenant SaaS: any firm can sign up, gets its own isolated account,
invites its cleaners, and runs its rounds from it.

---

## What it does

**For the office** — a live Today screen, a drag-and-drop schedule, a round map
with nearest-neighbour route ordering, the customer round book, recurring
rounds that book their own visits, invoicing with aged debt, and staff
management.

**For the cleaner** — a different app on the same routes. Three tabs, one job
per card, one giant button. A job will not close until there is a before photo
and an after photo. It works with no signal: today's round is cached on the
phone, and completions, notes and photos queue locally and sync when the
signal returns.

## Stack

|            |                                                                  |
| ---------- | ---------------------------------------------------------------- |
| Framework  | Next.js 14 (App Router), React 18, TypeScript strict             |
| Styling    | Tailwind CSS against CSS custom properties — no UI kit           |
| Backend    | Supabase — Postgres, Auth, Storage, Row Level Security, Realtime |
| Validation | Zod, shared between the browser and every Server Action          |
| Dates      | date-fns                                                         |
| Map        | Leaflet + OpenStreetMap tiles, loaded on demand (no API key)     |
| Tests      | Vitest (unit + database), Playwright (end-to-end)                |
| Hosting    | Vercel                                                           |

Server Components and Server Actions by default; client components only where
interactivity demands it.

## Getting started

You need Node 20+, a Supabase project (or the Supabase CLI for a local one),
and Postgres client tools if you want to run the database tests.

```bash
git clone <this repo> && cd propercrm
npm install
cp .env.example .env.local     # then fill it in — see below
```

### 1. Set up the database

With the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase start                 # local Postgres + Auth + Storage in Docker
supabase db reset              # applies supabase/migrations/*, then seed.sql
```

Against a hosted project:

```bash
supabase link --project-ref <your-ref>
supabase db push               # migrations only
psql "$DATABASE_URL" -f supabase/seed.sql   # optional demo data
```

Migrations are plain, ordered SQL in `supabase/migrations/`. They are safe to
re-run in order on an empty database and are the single source of truth for the
schema, the RLS policies, the storage buckets and the recurrence rules.

### 2. Environment variables

Copy `.env.example` to `.env.local`. The real file is gitignored.

| Variable                        | Where it is used                              | Required          |
| ------------------------------- | --------------------------------------------- | ----------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | browser + server                              | yes               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server                              | yes               |
| `SUPABASE_SERVICE_ROLE_KEY`     | **server only** — invite emails, nightly cron | yes               |
| `NEXT_PUBLIC_SITE_URL`          | auth redirects and invite links               | yes               |
| `CRON_SECRET`                   | shared secret for `/api/cron/topup`           | yes in production |
| `TEST_SUPABASE_*`               | integration tests only                        | no                |

The service role key bypasses RLS. It must never reach the browser — it is
only read inside `createServiceClient()` in `src/lib/supabase/server.ts`.

In the Supabase dashboard, add `<NEXT_PUBLIC_SITE_URL>/auth/callback` to
**Authentication → URL Configuration → Redirect URLs**, or emailed links will
bounce.

### 3. Run it

```bash
npm run dev        # http://localhost:3000
```

The seed creates one company, **Crystal Clear Windows**, with three cleaners,
forty customers and a fortnight of jobs either side of today. Sign in with any
of these — the password is `password123`:

| Email                  | Role    |
| ---------------------- | ------- |
| `owner@propercrm.test` | Owner   |
| `nina@propercrm.test`  | Manager |
| `dave@propercrm.test`  | Cleaner |
| `sam@propercrm.test`   | Cleaner |
| `ellie@propercrm.test` | Cleaner |

Sign in as the owner for the office app; sign in as Dave to see the cleaner
app, which is a different interface on the same routes.

## How it is put together

```
src/
  app/
    (auth)/            sign in, sign up, reset, accept invite, welcome
    app/               the product — one route tree, two shells
    print/             printable invoices, outside the app chrome
    api/cron/topup/    nightly schedule top-up and overdue sweep
    actions/           Server Actions, one file per area
  components/
    admin/  cleaner/  shell/  ui/
  lib/
    db/                server-side queries
    offline/           IndexedDB cache and outbound queue
    supabase/          browser, server and middleware clients
    recurrence.ts route.ts invoice.ts validation.ts
supabase/
  migrations/          ordered SQL — schema, RLS, functions, storage
  seed.sql             demo company
  tests/               RLS isolation suite + a throwaway-Postgres harness
e2e/                   Playwright
```

### Multi-tenancy

Every business table carries `company_id`, and every policy is
`company_id = public.current_company_id()` plus a role check. Nothing is
filtered on the client.

Cleaners are a deliberate exception to the usual pattern: RLS is _row_-level,
but `jobs` carries prices and `companies` carries bank details. So cleaners
have **no policy on those tables at all**. They read through the `my_jobs` and
`my_company` views — which filter on `auth.uid()` themselves and expose only
safe columns — and write through a small set of `SECURITY DEFINER` functions.
That is what makes "no before and after photo, no completion" a database rule
rather than a UI suggestion: `complete_job()` counts the photos and refuses.

`supabase/tests/rls_test.sql` proves all of it.

### Recurring rounds

A round (`job_templates`) is a customer, a price, a frequency and an anchor
date. The next visit is `completion date + frequency interval`, snapped to the
round's preferred weekday and pushed forward off any non-working day. Finishing
or skipping a job books the next one; a unique constraint on
`(template_id, scheduled_date)` makes duplicates impossible, so the generator
is safe to run as often as you like.

The same rules exist twice — `public.next_occurrence()` in SQL and
`src/lib/recurrence.ts` in TypeScript — so the "next 5 dates" preview in the UI
is exactly what the database will create. A test runs several thousand inputs
through both and fails if they ever disagree.

### Offline

The cleaner app is offline-first. Today's round, the access notes and the
checklist are cached in IndexedDB; completions, notes and photos go into an
outbound queue and are pushed oldest-first when the signal returns, so a photo
can never overtake the completion that depends on it. Photos are downscaled to
1600px and re-encoded before upload. A banner shows exactly how many jobs are
still waiting to send — a cleaner's work is never silently lost.

## Tests

```bash
npm run test        # Vitest: recurrence, routing, invoice totals, RLS isolation
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run check       # all three
```

`npm run test` includes a database suite that boots a throwaway Postgres
cluster, applies every migration and the seed, and runs the RLS isolation
tests. It skips itself if Postgres client tools are not installed; to run it
directly:

```bash
./supabase/tests/run.sh
```

The Playwright suite walks the whole cleaner job flow — sign in, start, the
photo block, complete, and the "can't complete" path — against a **real,
seeded** Supabase project, because that flow is mostly database rules and a
mocked backend would prove nothing about them:

```bash
npx playwright install chromium
supabase db reset
npm run build
npm run test:e2e
```

It skips itself when `NEXT_PUBLIC_SUPABASE_URL` is unset or points at a
placeholder.

## Deploying to Vercel

1. Push the repo and import it in Vercel.
2. Add the environment variables from the table above to every environment.
   Set `NEXT_PUBLIC_SITE_URL` to the deployment's own URL.
3. Add that URL's `/auth/callback` to the Supabase redirect allowlist.
4. `vercel.json` registers a nightly cron on `/api/cron/topup`, which tops the
   diary up eight weeks ahead and marks overdue invoices. Vercel sends
   `CRON_SECRET` as a bearer token; the route rejects anything else.
5. Apply migrations to the production database with `supabase db push` (or run
   them from CI) before the first deploy.

Nothing else is needed — no build-time secrets, no external services.

## Theme

One light theme, committed to fully. The tokens live in `src/app/globals.css`
and are mapped into `tailwind.config.ts`; components use the token names and
never a raw hex.

```
blue-500  #1E88E5   primary          grey-900  #12212E   body text
blue-700  #0E559A   focus ring       grey-500  #6B7B8C   secondary text
blue-50   #F2F8FF   page tint        grey-200  #E5EBF1   hairlines
white     #FFFFFF   every surface    grey-50   #F7FAFC   app background
success   #16A34A   warning #F59E0B  danger    #DC2626
```

Cards 12px, buttons 10px, pills fully round. Focus rings are a visible 2px
`--blue-700` everywhere, and contrast meets WCAG AA.
