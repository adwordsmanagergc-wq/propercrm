import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { LogoMark, Wordmark } from '@/components/Logo';
import {
  CameraIcon,
  InvoiceIcon,
  MapIcon,
  PeopleIcon,
  QuoteIcon,
  RepeatIcon,
} from '@/components/ui/Icons';
import { getViewer } from '@/lib/auth';
import { cn } from '@/lib/cn';

const STEPS = [
  {
    title: 'Add your round book',
    body: 'Customers, prices and how often you go. Add them as you go, no big setup day.',
  },
  {
    title: 'Your cleaners see their day',
    body: 'Each cleaner opens their phone to a list in driving order. Nothing else to learn.',
  },
  {
    title: 'The office sees it live',
    body: 'Jobs tick over to done as they happen, with the before and after photos attached.',
  },
];

const PRICING = [
  {
    name: 'Sole trader',
    price: '£14',
    blurb: 'Just you and the ladder.',
    points: ['1 user', 'Unlimited customers', 'Photo proof', 'Invoices and pay links'],
    featured: false,
  },
  {
    name: 'Small firm',
    price: '£39',
    blurb: 'The usual choice for a van or three.',
    points: [
      'Up to 8 cleaners',
      'Round map and route ordering',
      'Quotes and customer portal',
      'Reports and aged debt',
    ],
    featured: true,
  },
  {
    name: 'Bigger outfit',
    price: '£89',
    blurb: 'More vans, more rounds, more paperwork.',
    points: ['Unlimited cleaners', 'Automatic reminders and chasers', 'Priority support'],
    featured: false,
  },
];

export default async function LandingPage() {
  const viewer = await getViewer();

  return (
    <div className="min-h-dvh bg-grey-50">
      <header className="sticky top-0 z-30 border-b border-grey-200 bg-grey-50/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/" aria-label="Proper CRM home">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="#pricing"
              className="hidden rounded-btn px-3 py-2 text-sm font-semibold text-grey-500 transition-colors hover:bg-blue-50 hover:text-blue-700 sm:block"
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
        <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:pb-24">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-600">
              For window cleaning firms
            </p>
            <h1 className="mt-4 text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-grey-900 sm:text-[3.5rem]">
              Run the whole round from <span className="text-blue-500">your pocket.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-grey-500">
              Rounds, routes, photo proof, quotes and getting paid. Works on a phone, in the rain,
              with one hand.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/sign-up" size="lg">
                Start free trial
              </ButtonLink>
              <ButtonLink href="#how" variant="secondary" size="lg">
                See how it works
              </ButtonLink>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -inset-3 hidden rotate-2 rounded-[28px] bg-blue-100 sm:block"
            />
            <Image
              src="/images/hero-round.webp"
              alt="A window cleaner using a water-fed pole on a row of terraced houses"
              width={896}
              height={1120}
              priority
              sizes="(min-width: 1024px) 460px, (min-width: 640px) 448px, 100vw"
              className="relative aspect-[4/5] w-full rounded-[22px] object-cover shadow-pop"
            />
          </div>
        </section>

        {/* ------------------------------------------------------------ bento */}
        <section className="mx-auto max-w-6xl px-5 pb-16 sm:pb-24">
          <h2 className="max-w-xl text-2xl font-extrabold tracking-tight sm:text-3xl">
            Everything the round needs, nothing it does not
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-6">
            <Tile className="relative min-h-[22rem] overflow-hidden p-0 md:col-span-4 md:row-span-2">
              <Image
                src="/images/squeegee.webp"
                alt=""
                fill
                sizes="(min-width: 768px) 66vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-grey-900/90 via-grey-900/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <TileIcon className="bg-white/15 text-white backdrop-blur">
                  <CameraIcon className="h-6 w-6" />
                </TileIcon>
                <h3 className="mt-4 text-xl font-bold text-white">Photo proof, every time</h3>
                <p className="mt-2 max-w-md text-white/85">
                  A job will not close without a before and an after photo, stamped with the time
                  and place. No more &ldquo;you never came&rdquo;.
                </p>
              </div>
            </Tile>

            <Tile className="md:col-span-2">
              <TileIcon>
                <RepeatIcon className="h-6 w-6" />
              </TileIcon>
              <h3 className="mt-4 text-lg font-bold">Rounds that book themselves</h3>
              <p className="mt-2 text-grey-500">
                Every four weeks, set once. The next visit books itself.
              </p>
            </Tile>

            <Tile className="md:col-span-2">
              <TileIcon>
                <MapIcon className="h-6 w-6" />
              </TileIcon>
              <h3 className="mt-4 text-lg font-bold">The shortest route, every day</h3>
              <p className="mt-2 text-grey-500">
                Each cleaner&apos;s stops, ordered from their own front door. Works with no signal.
              </p>
            </Tile>

            <Tile className="border-blue-200 bg-blue-50 md:col-span-3">
              <TileIcon className="bg-blue-500 text-white">
                <InvoiceIcon className="h-6 w-6" />
              </TileIcon>
              <h3 className="mt-4 text-lg font-bold">Get paid quicker</h3>
              <p className="mt-2 text-grey-500">
                Every invoice carries a pay link for card, Apple Pay or Google Pay. Overdue chasers
                go out on their own.
              </p>
            </Tile>

            <Tile className="md:col-span-3">
              <div className="flex gap-2">
                <TileIcon>
                  <QuoteIcon className="h-6 w-6" />
                </TileIcon>
                <TileIcon>
                  <PeopleIcon className="h-6 w-6" />
                </TileIcon>
              </div>
              <h3 className="mt-4 text-lg font-bold">Quotes and a customer page</h3>
              <p className="mt-2 text-grey-500">
                Prospects accept a quote on their phone. Customers skip a clean, book an extra one
                or pay, without ringing you.
              </p>
            </Tile>
          </div>
        </section>

        {/* ------------------------------------------------------------- how */}
        <section id="how" className="border-y border-grey-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Up and running in an afternoon
              </h2>
              <p className="mt-4 max-w-sm text-grey-500">
                No training day and no manual. If you can send a text, you can run Proper.
              </p>
            </div>
            <dl className="divide-y divide-grey-200 border-y border-grey-200">
              {STEPS.map((step) => (
                <div key={step.title} className="grid gap-1 py-6 sm:grid-cols-[14rem_1fr] sm:gap-8">
                  <dt className="text-lg font-bold text-grey-900">{step.title}</dt>
                  <dd className="text-grey-500">{step.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* --------------------------------------------------------- pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="max-w-xl">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Simple pricing, cancel any time
            </h2>
            <p className="mt-3 text-grey-500">
              Fourteen days free on every plan. No card up front.
            </p>
          </div>

          <div className="mt-10 grid items-start gap-4 md:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  'rounded-[16px] border bg-white p-6',
                  plan.featured
                    ? 'border-blue-500 shadow-pop ring-1 ring-blue-500 md:-mt-3 md:pb-9'
                    : 'border-grey-200 shadow-card',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  {plan.featured ? (
                    <span className="rounded-pill bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                      Most popular
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-grey-500">{plan.blurb}</p>
                <p className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold tabular-nums tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-grey-500">per month</span>
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
                  Start free trial
                </ButtonLink>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- cta */}
        <section className="mx-auto max-w-6xl px-5 pb-16 sm:pb-24">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[22px] border border-blue-200 bg-blue-50 px-6 py-10 sm:px-10 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Stop running the round off a notebook
              </h2>
              <p className="mt-2 text-grey-500">
                Fourteen days free. If it does not save you an evening a week, walk away.
              </p>
            </div>
            <ButtonLink href="/sign-up" size="lg" className="shrink-0">
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

function Tile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn('rounded-[16px] border border-grey-200 bg-white p-6 shadow-card', className)}
    >
      {children}
    </div>
  );
}

/** No runtime class merging here, so callers swap the whole colour pair. */
function TileIcon({
  className = 'bg-blue-50 text-blue-600',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn('flex h-11 w-11 items-center justify-center rounded-btn', className)}>
      {children}
    </span>
  );
}
