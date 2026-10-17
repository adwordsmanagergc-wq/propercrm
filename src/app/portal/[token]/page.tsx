/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import { NotAvailable, PublicShell, type PublicCompany } from '@/components/public/PublicShell';
import { PortalRequests } from '@/components/public/PortalRequests';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { InvoiceStatusPill, Pill, SKIP_REASON_LABELS } from '@/components/ui/Pill';
import { formatDate, formatRelativeDay } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { FREQUENCY_LABELS } from '@/lib/recurrence';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type {
  ContactPref,
  Frequency,
  InvoiceStatus,
  JobStatus,
  PhotoKind,
  RequestKind,
  SkipReason,
} from '@/lib/types/database';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

interface Snapshot {
  today: string;
  customer: { name: string; address: string; preferred_contact: ContactPref };
  company: PublicCompany & {
    bank_account_name: string | null;
    bank_sort_code: string | null;
    bank_account_number: string | null;
  };
  rounds: { frequency: Frequency; price: number }[];
  upcoming: { id: string; date: string; status: JobStatus; price: number }[];
  recent: {
    id: string;
    date: string;
    status: JobStatus;
    skip_reason: SkipReason | null;
    completed_at: string | null;
    photos: { kind: PhotoKind; path: string }[];
  }[];
  invoices: {
    number: string;
    issue_date: string;
    due_date: string;
    status: InvoiceStatus;
    total: number;
    pay_token: string;
  }[];
  open_requests: { kind: RequestKind; created_at: string }[];
}

const REQUEST_LABELS: Record<RequestKind, string> = {
  skip_next: 'Skip next clean',
  extra_clean: 'Extra clean',
  callback: 'Call back',
  message: 'Message',
};

/** Signs only the photo paths this customer's own snapshot returned. */
async function signPhotos(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  try {
    const { data } = await createServiceClient()
      .storage.from('job-photos')
      .createSignedUrls(paths, 60 * 60);
    return new Map(
      (data ?? []).flatMap((entry, index) =>
        entry.signedUrl ? [[entry.path ?? paths[index]!, entry.signedUrl] as const] : [],
      ),
    );
  } catch {
    return new Map();
  }
}

export default async function PortalPage({ params }: { params: { token: string } }) {
  const notFound = (
    <NotAvailable
      title="This link has expired"
      body="Ask your window cleaner to send you a new link to your account page."
    />
  );
  if (!/^[a-f0-9]{48}$/.test(params.token)) return notFound;

  const { data } = await createClient().rpc('portal_snapshot', { p_token: params.token });
  const snap = data as Snapshot | null;
  if (!snap) return notFound;

  const signed = await signPhotos(snap.recent.flatMap((visit) => visit.photos.map((p) => p.path)));
  const owed = snap.invoices.filter((i) => i.status === 'sent' || i.status === 'overdue');
  const owedTotal = owed.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const next = snap.upcoming[0];
  const firstName = snap.customer.name.split(' ')[0];
  const bank = snap.company.bank_sort_code && snap.company.bank_account_number;

  return (
    <PublicShell company={snap.company}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hi {firstName}</h1>
        <p className="text-grey-500">{snap.customer.address}</p>
        {snap.rounds.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {snap.rounds.map((round, index) => (
              <Pill key={index} tone="blue">
                {FREQUENCY_LABELS[round.frequency]} · {formatMoney(Number(round.price))}
              </Pill>
            ))}
          </div>
        ) : null}
      </div>

      {owed.length > 0 ? (
        <Card className="border-blue-200">
          <CardHeader
            title={`${formatMoney(owedTotal)} to pay`}
            subtitle={`${owed.length} invoice${owed.length === 1 ? '' : 's'}`}
          />
          <ul className="divide-y divide-grey-200">
            {owed.map((invoice) => (
              <li
                key={invoice.number}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <span>
                  <span className="block font-medium">{invoice.number}</span>
                  <span
                    className={
                      invoice.status === 'overdue'
                        ? 'block text-sm font-semibold text-danger'
                        : 'block text-sm text-grey-500'
                    }
                  >
                    {invoice.status === 'overdue' ? 'Overdue, was due ' : 'Due '}
                    {formatDate(invoice.due_date)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">
                    {formatMoney(Number(invoice.total))}
                  </span>
                  <ButtonLink href={`/pay/${invoice.pay_token}`} size="sm">
                    Pay
                  </ButtonLink>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={next ? `Next clean: ${formatRelativeDay(next.date)}` : 'No clean booked'}
          subtitle={next ? formatDate(next.date) : 'Get in touch to book one in.'}
        />
        <CardBody className="space-y-5">
          {snap.upcoming.length > 1 ? (
            <p className="text-sm text-grey-500">
              Then{' '}
              {snap.upcoming
                .slice(1)
                .map((visit) => formatDate(visit.date))
                .join(', ')}
              .
            </p>
          ) : null}
          {snap.open_requests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {snap.open_requests.map((request, index) => (
                <Pill key={index} tone="warning">
                  {REQUEST_LABELS[request.kind]}: we have it
                </Pill>
              ))}
            </div>
          ) : null}
          <PortalRequests token={params.token} hasNext={Boolean(next)} />
        </CardBody>
      </Card>

      {snap.recent.length > 0 ? (
        <Card>
          <CardHeader title="Recent cleans" />
          <ul className="divide-y divide-grey-200">
            {snap.recent.map((visit) => (
              <li key={visit.id} className="space-y-3 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{formatDate(visit.date)}</span>
                  {visit.status === 'completed' ? (
                    <Pill tone="success">Cleaned</Pill>
                  ) : (
                    <Pill tone="warning">
                      Missed{visit.skip_reason ? `: ${SKIP_REASON_LABELS[visit.skip_reason]}` : ''}
                    </Pill>
                  )}
                </div>
                {visit.photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {visit.photos.slice(0, 4).map((photo) =>
                      signed.get(photo.path) ? (
                        <a
                          key={photo.path}
                          href={signed.get(photo.path)}
                          target="_blank"
                          rel="noreferrer"
                          className="relative block"
                        >
                          <img
                            src={signed.get(photo.path)}
                            alt={`${photo.kind === 'before' ? 'Before' : 'After'} the clean on ${formatDate(visit.date)}`}
                            className="aspect-square w-full rounded-btn object-cover"
                            loading="lazy"
                          />
                          <span className="absolute left-1.5 top-1.5 rounded-pill bg-white/90 px-2 py-0.5 text-xs font-semibold capitalize">
                            {photo.kind}
                          </span>
                        </a>
                      ) : null,
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {snap.invoices.some((invoice) => invoice.status === 'paid') ? (
        <Card>
          <CardHeader title="Paid invoices" />
          <ul className="divide-y divide-grey-200">
            {snap.invoices
              .filter((invoice) => invoice.status === 'paid')
              .map((invoice) => (
                <li
                  key={invoice.number}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <span>
                    {invoice.number} · {formatDate(invoice.issue_date)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{formatMoney(Number(invoice.total))}</span>
                    <InvoiceStatusPill status={invoice.status} />
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      {bank ? (
        <p className="text-center text-sm text-grey-500">
          Prefer a bank transfer? {snap.company.bank_account_name ?? snap.company.name}, sort code{' '}
          {snap.company.bank_sort_code}, account {snap.company.bank_account_number}.
        </p>
      ) : null}
    </PublicShell>
  );
}
