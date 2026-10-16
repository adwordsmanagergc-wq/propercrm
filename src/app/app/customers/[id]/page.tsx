import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CustomerForm } from '@/components/admin/CustomerForm';
import { CustomerPortalCard } from '@/components/admin/CustomerPortalCard';
import { RequestList } from '@/components/admin/RequestList';
import { CustomerHistory } from '@/components/admin/CustomerHistory';
import { PropertyList } from '@/components/admin/PropertyList';
import { ArchiveCustomerButton } from '@/components/admin/ArchiveCustomerButton';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, StatTile } from '@/components/ui/Card';
import { DogIcon, KeyIcon } from '@/components/ui/Icons';
import { InvoiceStatusPill, Pill, QuoteStatusPill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/States';
import { requireStaff } from '@/lib/auth';
import { getCustomer, getCustomerSummaries, getProperties, getRounds } from '@/lib/db/customers';
import { getInvoices } from '@/lib/db/invoices';
import { getCustomerJobHistory } from '@/lib/db/jobs';
import { getMessageLog, getOpenRequests } from '@/lib/db/messages';
import { getCustomerQuotes } from '@/lib/db/quotes';
import { toRequestViews } from '@/lib/db/requests-view';
import { getSiteUrl } from '@/lib/env';
import { portalUrl } from '@/lib/messaging/plan';
import { TEMPLATE_LABELS, toMobileE164 } from '@/lib/messaging/templates';
import { signPhotoUrls } from '@/lib/db/photos';
import { photoPaths, toJobView } from '@/lib/db/views';
import { formatDate, formatRelativeDay, todayInTimezone } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { FREQUENCY_LABELS } from '@/lib/recurrence';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const customer = await getCustomer(params.id);
  return { title: customer?.name ?? 'Customer' };
}

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const viewer = await requireStaff();
  const today = todayInTimezone(viewer.company.timezone);

  const customer = await getCustomer(params.id);
  if (!customer) notFound();

  const [properties, rounds, invoices, history, summaries, messages, requests, quotes] =
    await Promise.all([
      getProperties(customer.id),
      getRounds(customer.id),
      getInvoices(customer.id),
      getCustomerJobHistory(customer.id),
      getCustomerSummaries(today),
      getMessageLog(customer.id),
      getOpenRequests(customer.id),
      getCustomerQuotes(customer.id),
    ]);

  const signed = await signPhotoUrls(photoPaths(history));
  const visits = history.map((job) => toJobView(job, signed));
  const summary = summaries.get(customer.id);
  const owed = invoices
    .filter((invoice) => invoice.status === 'sent' || invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const lifetime = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);

  return (
    <div className="space-y-5">
      <Link href="/app/customers" className="text-sm font-semibold text-blue-700">
        ← Customers
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{customer.name}</h1>
          <p className="text-grey-500">
            {customer.address_line1}
            {customer.postcode ? `, ${customer.postcode.toUpperCase()}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/app/quotes/new?customer=${customer.id}`} variant="secondary">
            Quote
          </ButtonLink>
          <ButtonLink href={`/app/rounds?customer=${customer.id}`} variant="secondary">
            Set up a round
          </ButtonLink>
          <ArchiveCustomerButton customerId={customer.id} isActive={customer.is_active} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Next visit"
          value={summary?.nextVisit ? formatRelativeDay(summary.nextVisit) : '—'}
        />
        <StatTile label="Visits done" value={summary?.visits ?? 0} />
        <StatTile label="Owed" value={formatMoney(owed)} tone={owed > 0 ? 'danger' : 'default'} />
        <StatTile label="Lifetime value" value={formatMoney(lifetime)} tone="blue" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          {requests.length > 0 ? (
            <Card className="border-warning/40">
              <CardHeader
                title="Asked from their account page"
                subtitle={`${requests.length} open`}
              />
              <RequestList requests={toRequestViews(requests)} showCustomer={false} />
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Visit history" subtitle={`${visits.length} visits`} />
            <CustomerHistory visits={visits} />
          </Card>

          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <CustomerForm customer={customer} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Account page" />
            <CardBody>
              <CustomerPortalCard
                customerId={customer.id}
                link={portalUrl(getSiteUrl(), customer.portal_token)}
                hasEmail={Boolean(customer.email)}
                hasMobile={Boolean(toMobileE164(customer.phone))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Getting in" />
            <CardBody className="space-y-3">
              {customer.access_notes ? (
                <p className="rounded-btn bg-blue-50 px-3.5 py-3 text-sm">
                  {customer.access_notes}
                </p>
              ) : (
                <p className="text-sm text-grey-500">No access notes yet.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {customer.gate_code ? (
                  <Pill tone="blue">
                    <KeyIcon className="h-4 w-4" /> Code {customer.gate_code}
                  </Pill>
                ) : null}
                {customer.dog_on_site ? (
                  <Pill tone="warning">
                    <DogIcon className="h-4 w-4" /> Dog on site
                  </Pill>
                ) : null}
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-grey-500">Phone</dt>
                  <dd>
                    {customer.phone ? (
                      <a
                        href={`tel:${customer.phone.replace(/\s/g, '')}`}
                        className="text-blue-700"
                      >
                        {customer.phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-grey-500">Email</dt>
                  <dd className="truncate">
                    {customer.email ? (
                      <a href={`mailto:${customer.email}`} className="text-blue-700">
                        {customer.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-grey-500">Customer since</dt>
                  <dd>{formatDate(customer.created_at)}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Rounds" subtitle={`${rounds.length} set up`} />
            <CardBody>
              {rounds.length === 0 ? (
                <p className="text-sm text-grey-500">
                  No rounds yet — they will only get a visit if you book one in by hand.
                </p>
              ) : (
                <ul className="space-y-3">
                  {rounds.map((round) => (
                    <li key={round.id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{FREQUENCY_LABELS[round.frequency]}</p>
                        <p className="text-sm text-grey-500">
                          {round.cleaner?.full_name ?? 'Nobody assigned'} ·{' '}
                          {formatMoney(Number(round.price))}
                        </p>
                      </div>
                      {round.is_active ? <Pill tone="success">Running</Pill> : <Pill>Stopped</Pill>}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Other addresses" />
            <CardBody>
              <PropertyList customerId={customer.id} properties={properties} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Invoices" subtitle={`${invoices.length} raised`} />
            {invoices.length === 0 ? (
              <EmptyState
                title="No invoices yet"
                description="Raise one from their completed jobs."
              />
            ) : (
              <ul className="divide-y divide-grey-200">
                {invoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link
                      href={`/app/invoices/${invoice.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-blue-50"
                    >
                      <span>
                        <span className="block font-medium">{invoice.number}</span>
                        <span className="block text-sm text-grey-500">
                          {formatDate(invoice.issue_date)}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-semibold tabular-nums">
                          {formatMoney(Number(invoice.total))}
                        </span>
                        <InvoiceStatusPill status={invoice.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {quotes.length > 0 ? (
            <Card>
              <CardHeader title="Quotes" />
              <ul className="divide-y divide-grey-200">
                {quotes.map((quote) => (
                  <li key={quote.id}>
                    <Link
                      href={`/app/quotes/${quote.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-blue-50"
                    >
                      <span className="font-medium">{quote.number}</span>
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
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Messages" subtitle="Emails and texts sent to them" />
            {messages.length === 0 ? (
              <CardBody>
                <p className="text-sm text-grey-500">Nothing sent yet.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-grey-200">
                {messages.map((message) => (
                  <li key={message.id} className="space-y-1 px-5 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">
                        {TEMPLATE_LABELS[message.kind]} ·{' '}
                        {message.channel === 'sms' ? 'Text' : 'Email'}
                      </span>
                      <Pill
                        tone={
                          message.status === 'sent'
                            ? 'success'
                            : message.status === 'failed'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {message.status === 'sent'
                          ? formatDate(message.created_at)
                          : message.status === 'failed'
                            ? 'Failed'
                            : 'Not sent'}
                      </Pill>
                    </div>
                    <p className="line-clamp-2 text-sm text-grey-500">
                      {message.error ?? message.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
