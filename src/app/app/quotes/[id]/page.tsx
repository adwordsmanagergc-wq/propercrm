import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { QuoteActions } from '@/components/admin/QuoteActions';
import { QuoteBuilder } from '@/components/admin/QuoteBuilder';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { QuoteStatusPill } from '@/components/ui/Pill';
import { requireStaff } from '@/lib/auth';
import { getCustomers } from '@/lib/db/customers';
import { getQuote } from '@/lib/db/quotes';
import { getSiteUrl } from '@/lib/env';
import { formatDate } from '@/lib/format';
import { quoteUrl } from '@/lib/messaging/plan';
import { toMobileE164 } from '@/lib/messaging/templates';
import { formatMoney } from '@/lib/money';
import { annualValue } from '@/lib/quote';
import { FREQUENCY_LABELS } from '@/lib/recurrence';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const quote = await getQuote(params.id);
  return { title: quote ? `Quote ${quote.number}` : 'Quote' };
}

export default async function QuotePage({ params }: { params: { id: string } }) {
  await requireStaff();
  const [quote, customers] = await Promise.all([getQuote(params.id), getCustomers()]);
  if (!quote) notFound();

  const lines = [...(quote.lines ?? [])].sort((a, b) => a.position - b.position);
  const answered = quote.status === 'accepted' || quote.status === 'declined';
  const customer = Array.isArray(quote.customer) ? quote.customer[0] : quote.customer;

  const timeline = [
    { label: 'Written', at: quote.created_at },
    { label: 'Sent', at: quote.sent_at },
    { label: 'Opened', at: quote.viewed_at },
    {
      label: quote.status === 'declined' ? 'Declined' : 'Accepted',
      at: quote.responded_at,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/app/quotes" className="text-sm font-semibold text-blue-700">
        ← Quotes
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {quote.contact_name} <span className="text-grey-500">· {quote.number}</span>
          </h1>
          <p className="text-grey-500">
            {FREQUENCY_LABELS[quote.frequency]} · valid until {formatDate(quote.valid_until)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <QuoteStatusPill status={quote.status} />
          <span className="text-2xl font-semibold tabular-nums">
            {formatMoney(Number(quote.total))}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Send it"
          subtitle={
            quote.frequency === 'one_off'
              ? undefined
              : `Worth ${formatMoney(annualValue(Number(quote.total), quote.frequency))} a year`
          }
        />
        <CardBody className="space-y-5">
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {timeline.map((step) => (
              <li
                key={step.label}
                className={
                  step.at
                    ? 'rounded-btn border border-blue-200 bg-blue-50 px-3 py-2'
                    : 'rounded-btn border border-grey-200 px-3 py-2 text-grey-500'
                }
              >
                <span className="block text-sm font-semibold">{step.label}</span>
                <span className="block text-xs">{step.at ? formatDate(step.at) : 'Not yet'}</span>
              </li>
            ))}
          </ol>

          {quote.status === 'accepted' && customer ? (
            <p className="border-success/30 rounded-btn border bg-white px-3.5 py-3 text-sm">
              Accepted. {customer.name} is now a customer with a round booked in.{' '}
              <Link href={`/app/customers/${customer.id}`} className="font-semibold text-blue-700">
                Open their record
              </Link>
            </p>
          ) : null}
          {quote.status === 'declined' ? (
            <p className="border-danger/30 rounded-btn border bg-white px-3.5 py-3 text-sm">
              Declined{quote.decline_reason ? `: “${quote.decline_reason}”` : '.'}
            </p>
          ) : null}

          <QuoteActions
            quoteId={quote.id}
            status={quote.status}
            link={quoteUrl(getSiteUrl(), quote.token)}
            hasEmail={Boolean(quote.contact_email)}
            hasMobile={Boolean(toMobileE164(quote.contact_phone))}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={answered ? 'What was quoted' : 'Edit the quote'} />
        <CardBody>
          {answered ? (
            <ul className="divide-y divide-grey-200">
              {lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-3 py-2.5">
                  <span>
                    {line.description}
                    {Number(line.quantity) !== 1 ? ` × ${Number(line.quantity)}` : ''}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(Number(line.quantity) * Number(line.unit_price))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <QuoteBuilder
              initial={{
                id: quote.id,
                customer_id: quote.customer_id,
                contact_name: quote.contact_name,
                contact_email: quote.contact_email ?? '',
                contact_phone: quote.contact_phone ?? '',
                address_line1: quote.address_line1,
                address_line2: quote.address_line2 ?? '',
                city: quote.city ?? '',
                postcode: quote.postcode,
                frequency: quote.frequency,
                duration_mins: quote.duration_mins,
                proposed_start: quote.proposed_start ?? '',
                valid_until: quote.valid_until,
                message: quote.message ?? '',
                lines: lines.map((line) => ({
                  description: line.description,
                  quantity: Number(line.quantity),
                  unit_price: Number(line.unit_price),
                })),
              }}
              customers={customers
                .filter((c) => c.is_active)
                .map(
                  ({ id, name, email, phone, address_line1, address_line2, city, postcode }) => ({
                    id,
                    name,
                    email,
                    phone,
                    address_line1,
                    address_line2,
                    city,
                    postcode,
                  }),
                )}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
