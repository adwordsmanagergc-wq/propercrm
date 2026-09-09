import type { Metadata } from 'next';
import { Wordmark } from '@/components/Logo';
import { readPublicEnv } from '@/lib/env';

export const metadata: Metadata = { title: 'Setup needed', robots: { index: false } };
export const dynamic = 'force-dynamic';

const VARIABLES = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    detail: 'Your project URL, e.g. https://abcdefgh.supabase.co',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    detail: 'The anon / publishable key. Safe in the browser — RLS protects the data.',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    detail: 'Server only. Used for invite emails and the nightly cron.',
  },
  { name: 'NEXT_PUBLIC_SITE_URL', detail: "This deployment's own URL, with no trailing slash." },
  { name: 'CRON_SECRET', detail: 'Any long random string. Guards /api/cron/topup.' },
];

/**
 * Where the middleware sends people when the deploy has no Supabase
 * configuration. It names the variables that are missing — never their values,
 * and never anything that is set.
 */
export default function SetupRequiredPage() {
  const config = readPublicEnv();
  const problems = config.ok ? [] : config.problems;

  return (
    <div className="flex min-h-dvh flex-col bg-grey-50">
      <header className="px-5 py-5">
        <Wordmark />
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-5 pb-16">
        <div className="w-full max-w-xl rounded-card border border-grey-200 bg-white p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">Proper CRM is not connected yet</h1>
          <p className="mt-2 text-grey-500">
            The app is deployed, but it has no database to talk to. If you are a visitor, please try
            again shortly.
          </p>

          {problems.length > 0 ? (
            <div className="border-danger/30 mt-5 rounded-btn border bg-white px-3.5 py-3">
              <p className="text-sm font-semibold text-danger">What is wrong</p>
              <ul className="mt-1.5 space-y-1 text-sm text-grey-900">
                {problems.map((problem) => (
                  <li key={problem}>• {problem}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <h2 className="mt-6 text-base font-semibold">If you are the owner</h2>
          <p className="mt-1.5 text-sm text-grey-500">
            Add these to your hosting project&rsquo;s environment variables, then{' '}
            <strong className="font-semibold text-grey-900">redeploy</strong>. The{' '}
            <code className="rounded bg-grey-50 px-1 py-0.5 text-xs">NEXT_PUBLIC_</code> ones are
            baked in at build time, so restarting is not enough.
          </p>

          <dl className="mt-4 space-y-3">
            {VARIABLES.map((variable) => (
              <div key={variable.name} className="rounded-btn border border-grey-200 p-3">
                <dt className="break-all font-mono text-sm font-semibold text-blue-700">
                  {variable.name}
                </dt>
                <dd className="mt-1 text-sm text-grey-500">{variable.detail}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 text-sm text-grey-500">
            Then apply the migrations in <code className="text-xs">supabase/migrations/</code> to
            the database. The README has the full walkthrough.
          </p>
        </div>
      </main>
    </div>
  );
}
