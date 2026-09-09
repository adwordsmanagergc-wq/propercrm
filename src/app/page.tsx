import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { LogoMark, Wordmark } from '@/components/Logo';
import { CameraIcon, InvoiceIcon, MapIcon } from '@/components/ui/Icons';
import { getViewer } from '@/lib/auth';

const FEATURES = [
  {
    icon: <CameraIcon className="h-7 w-7" />,
    title: 'Photo proof, every time',
    body: 'A job will not close until there is a before and an after photo, stamped with the time and the spot it was taken. No more "you never came".',
  },
  {
    icon: <MapIcon className="h-7 w-7" />,
    title: 'Rounds that plan themselves',
    body: 'Set a customer to every four weeks and forget it. The next visit books itself, and the day is put in driving order at the tap of a button.',
  },
  {
    icon: <InvoiceIcon className="h-7 w-7" />,
    title: 'Get paid quicker',
    body: 'Turn a week of finished jobs into an invoice in two clicks. See exactly who owes what, and chase them with a message that is already written.',
  },
];

const STEPS = [
  [
    'Add your round book',
    'Customers, prices and how often you go. Import as you go — no big setup day.',
  ],
  [
    'Your lads see their day',
    'Each cleaner opens their phone to a list in driving order. Nothing else.',
  ],
  ['The office sees it live', 'Jobs tick over to done as they happen, photos and all.'],
];

const PRICING = [
  {
    name: 'Sole trader',
    price: '£14',
    per: 'per month',
    blurb: 'Just you and the ladder.',
    points: ['1 user', 'Unlimited customers', 'Photo proof', 'Invoices and payment tracking'],
    cta: 'Start free trial',
    featured: false,
  },
  {
    name: 'Small firm',
    price: '£39',
    per: 'per month',
    blurb: 'The usual choice for a van or three.',
    points: [
      'Up to 8 cleaners',
      'Round map and route ordering',
      'Per-cleaner stats',
      'Aged debt reporting',
    ],
    cta: 'Start free trial',
    featured: true,
  },
  {
    name: 'Bigger outfit',
    price: '£89',
    per: 'per month',
    blurb: 'More vans, more rounds, more paperwork.',
    points: ['Unlimited cleaners', 'Multiple properties per customer', 'Priority support'],
    cta: 'Start free trial',
    featured: false,
  },
];

export default async function LandingPage() {
  const viewer = await getViewer();

  return (
    <div className="min-h-dvh bg-white">
      <header className="bg-white/90 sticky top-0 z-30 border-b border-grey-200 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/" aria-label="Proper CRM home">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="#pricing"
              className="hidden rounded-btn px-3 py-2 text-sm font-semibold text-grey-500 hover:bg-blue-50 hover:text-blue-700 sm:block"
            >
              Pricing
            </Link>
            {viewer ? (
              <ButtonLink href="/app" size="sm">
                Open Proper CRM
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/sign-in" variant="ghost" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/sign-up" size="sm">
                  Start free trial
                </ButtonLink>
              </>
            )}
          </div>
        </nav>
      </header>

      <main id="main">
        {/* ------------------------------------------------------------- hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-pill border border-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-blue-700">
                Built for window cleaners
              </p>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-grey-900 sm:text-4xl">
                Your round book, your lads and your invoices — in one place.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-grey-500">
                Proper CRM keeps track of who is due, who has been done and who still owes you. It
                works on the phone in your pocket, in the rain, with one hand.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/sign-up" size="lg">
                  Start your free 14-day trial
                </ButtonLink>
                <ButtonLink href="#how" variant="secondary" size="lg">
                  See how it works
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-grey-500">
                No card needed. Set up your first round in about ten minutes.
              </p>
            </div>

            <PhoneMockup />
          </div>
        </section>

        {/* --------------------------------------------------------- features */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Three jobs, done properly
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-card border border-grey-200 bg-white p-6 shadow-card"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-card bg-blue-50 text-blue-500">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-grey-500">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- how */}
        <section id="how" className="bg-blue-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Up and running in an afternoon
            </h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map(([title, body], index) => (
                <li
                  key={title}
                  className="rounded-card border border-blue-200 bg-white p-6 shadow-card"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-blue-500 text-base font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-grey-500">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* --------------------------------------------------------- pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Simple pricing, cancel any time
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-grey-500">
            Every plan includes photo proof, rounds, invoicing and the mobile app. Fourteen days
            free, no card up front.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.featured
                    ? 'relative rounded-card border-2 border-blue-500 bg-white p-6 shadow-pop'
                    : 'rounded-card border border-grey-200 bg-white p-6 shadow-card'
                }
              >
                {plan.featured ? (
                  <span className="absolute -top-3 left-6 rounded-pill bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-grey-500">{plan.blurb}</p>
                <p className="mt-5">
                  <span className="text-3xl font-semibold tabular-nums">{plan.price}</span>{' '}
                  <span className="text-sm text-grey-500">{plan.per}</span>
                </p>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {plan.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <svg
                        viewBox="0 0 24 24"
                        className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m4.5 12.5 5 5 10-11" />
                      </svg>
                      <span className="text-grey-900">{point}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href="/sign-up"
                  variant={plan.featured ? 'primary' : 'secondary'}
                  className="mt-6 w-full"
                >
                  {plan.cta}
                </ButtonLink>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- cta */}
        <section className="bg-blue-500">
          <div className="mx-auto max-w-3xl px-5 py-16 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Stop running the round off a notebook
            </h2>
            <p className="mt-3 text-blue-100">
              Fourteen days free. If it does not save you an evening a week, walk away.
            </p>
            <ButtonLink href="/sign-up" variant="secondary" size="lg" className="mt-7">
              Start free trial
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-grey-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-6 w-6" />
            <span className="text-sm text-grey-500">© {new Date().getFullYear()} Proper CRM</span>
          </div>
          <div className="flex gap-5 text-sm text-grey-500">
            <Link href="/sign-in" className="hover:text-blue-700">
              Sign in
            </Link>
            <Link href="/sign-up" className="hover:text-blue-700">
              Start free trial
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** A still of the cleaner's screen — the thing people actually buy. */
function PhoneMockup() {
  const jobs = [
    { seq: 1, name: 'Margaret', address: '12 Elm Grove', postcode: 'RG1 5AA', done: true },
    { seq: 2, name: 'Paul', address: '48 Priory Avenue', postcode: 'RG4 7SB', done: true },
    { seq: 3, name: 'Susan', address: '7 Kendrick Road', postcode: 'RG1 5DU', done: false },
    { seq: 4, name: 'David', address: '119 Bath Road', postcode: 'RG30 2BA', done: false },
  ];

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="rounded-[2rem] border-8 border-grey-900 bg-grey-900 shadow-pop">
        <div className="overflow-hidden rounded-[1.4rem] bg-grey-50">
          <div className="bg-blue-500 px-4 pb-4 pt-6 text-white">
            <p className="text-sm text-blue-100">Wednesday</p>
            <p className="text-xl font-semibold">4 jobs today</p>
          </div>
          <ul className="space-y-2 p-3">
            {jobs.map((job) => (
              <li
                key={job.seq}
                className="flex items-center gap-3 rounded-card border border-grey-200 bg-white p-3 shadow-card"
              >
                <span
                  className={
                    job.done
                      ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-success text-sm font-semibold text-white'
                      : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-blue-100 text-sm font-semibold text-blue-700'
                  }
                >
                  {job.done ? '✓' : job.seq}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-grey-900">
                    {job.name} — {job.address}
                  </span>
                  <span className="block text-xs text-grey-500">{job.postcode}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="px-3 pb-4">
            <div className="flex h-12 items-center justify-center rounded-btn bg-blue-500 text-base font-semibold text-white">
              Start job 3
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
