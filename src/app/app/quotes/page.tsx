import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Card, StatTile } from '@/components/ui/Card';
import { QuoteIcon } from '@/components/ui/Icons';
import { QuoteStatusPill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/States';
import { requireStaff } from '@/lib/auth';
import { getQuotes } from '@/lib/db/quotes';
import { formatDate, todayInTimezone } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { annualValue } from '@/lib/quote';
import { FREQUENCY_LABELS } from '@/lib/recurrence';

export const metadata: Metadata = { title: 'Quotes' };

export default async function QuotesPage() {
  const viewer = await requireStaff();
  const today = todayInTimezone(viewer.company.timezone);
  const quotes = await getQuotes();

  const open = quotes.filter((q) => q.status === 'sent' && q.valid_until >= today);
  const answered = quotes.filter((q) => q.status === 'accepted' || q.status === 'declined');
  const accepted = quotes.filter((q) => q.status === 'accepted');
  const winRate = answered.length ? Math.round((100 * accepted.length) / answered.length) : null;
  const openValue = open.reduce((sum, q) => sum + annualValue(Number(q.total), q.frequency), 0);
  const wonValue = accepted.reduce((sum, q) => sum + annualValue(Number(q.total), q.frequency), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Quotes</h1>
          <p className="text-grey-500">
            Send a price, they accept online, and the round books itself in.
          </p>
        </div>
        <ButtonLink href="/app/quotes/new">New quote</ButtonLink>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Waiting for an answer" value={open.length} tone="blue" />
        <StatTile
          label="Waiting, per year"
          value={formatMoney(openValue)}
          hint="If they all say yes."
        />
        <StatTile label="Won, per year" value={formatMoney(wonValue)} tone="success" />
        <StatTile
          label="Win rate"
          value={winRate === null ? '—' : `${winRate}%`}
          hint={answered.length ? `${accepted.length} of ${answered.length} answered` : undefined}
        />
      </div>

      <Card>
        {quotes.length === 0 ? (
          <EmptyState
            icon={<QuoteIcon className="h-7 w-7" />}
            title="No quotes yet"
            description="Price up a new enquiry in a minute. They can accept it from their phone."
            action={<ButtonLink href="/app/quotes/new">Write a quote</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-grey-200">
            {quotes.map((quote) => (
              <li key={quote.id}>
                <Link
                  href={`/app/quotes/${quote.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-blue-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {quote.contact_name}
                      <span className="font-normal text-grey-500"> · {quote.number}</span>
                    </span>
                    <span className="block text-sm text-grey-500">
                      {FREQUENCY_LABELS[quote.frequency]}
                      {quote.postcode ? ` · ${quote.postcode.toUpperCase()}` : ''}
                      {quote.status === 'sent'
                        ? quote.viewed_at
                          ? ` · Opened ${formatDate(quote.viewed_at)}`
                          : ' · Not opened yet'
                        : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">
                      {formatMoney(Number(quote.total))}
                    </span>
                    <QuoteStatusPill status={quote.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
