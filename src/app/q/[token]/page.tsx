import type { Metadata } from 'next';
import { NotAvailable, PublicShell, type PublicCompany } from '@/components/public/PublicShell';
import { QuoteResponse } from '@/components/public/QuoteResponse';
import { Card, CardBody } from '@/components/ui/Card';
import { formatDate } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { frequencyWords } from '@/lib/messaging/templates';
import { FREQUENCY_LABELS } from '@/lib/recurrence';
import { createClient } from '@/lib/supabase/server';
import type { Frequency, QuoteStatus } from '@/lib/types/database';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your quote', robots: { index: false, follow: false } };

interface PublicQuote {
  number: string;
  status: QuoteStatus;
  contact_name: string;
  address: string;
  frequency: Frequency;
  proposed_start: string | null;
  valid_until: string;
  total: number;
  message: string | null;
  responded_at: string | null;
  lines: { description: string; quantity: number; unit_price: number }[];
  company: PublicCompany & { terms: string | null };
}

export default async function PublicQuotePage({ params }: { params: { token: string } }) {
  if (!/^[a-f0-9]{48}$/.test(params.token)) {
    return (
      <NotAvailable
        title="Quote not found"
        body="Check the link, or ask for it to be sent again."
      />
    );
  }
  const supabase = createClient();
  const { data } = await supabase.rpc('quote_public', { p_token: params.token });
  const quote = data as PublicQuote | null;
  if (!quote) {
    return (
      <NotAvailable
        title="Quote not found"
        body="Check the link, or ask for it to be sent again."
      />
    );
  }

  const recurring = quote.frequency !== 'one_off';
  const firstName = quote.contact_name.split(' ')[0];

  return (
    <PublicShell company={quote.company}>
      <div>
        <p className="text-sm font-semibold text-blue-700">Quote {quote.number}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Hi {firstName}, here is your quote
        </h1>
        {quote.address ? <p className="text-grey-500">{quote.address}</p> : null}
      </div>

      {quote.message ? (
        <p className="whitespace-pre-line rounded-card bg-blue-50 px-4 py-3.5">{quote.message}</p>
      ) : null}

      <Card>
        <ul className="divide-y divide-grey-200">
          {quote.lines.map((line, index) => (
            <li key={index} className="flex justify-between gap-3 px-5 py-3">
              <span>
                {line.description}
                {Number(line.quantity) !== 1 ? ` × ${Number(line.quantity)}` : ''}
              </span>
              <span className="tabular-nums">
                {formatMoney(Number(line.quantity) * Number(line.unit_price))}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-end justify-between gap-3 border-t border-grey-200 px-5 py-4">
          <span className="text-grey-500">
            {recurring ? `Per clean, ${frequencyWords(quote.frequency)}` : 'Total'}
          </span>
          <span className="text-3xl font-semibold tabular-nums">
            {formatMoney(Number(quote.total))}
          </span>
        </div>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          {quote.status === 'accepted' ? (
            <div className="space-y-1">
              <p className="text-lg font-semibold text-success">You are booked in. Thank you!</p>
              <p className="text-grey-500">
                We will be in touch before your first clean
                {quote.proposed_start ? `, from ${formatDate(quote.proposed_start)}` : ''}.
              </p>
            </div>
          ) : quote.status === 'declined' ? (
            <p className="font-semibold">
              Thanks for letting us know. If you change your mind, just get in touch.
            </p>
          ) : quote.status === 'expired' ? (
            <p className="font-semibold">
              This quote ran out on {formatDate(quote.valid_until)}. Get in touch and we will send a
              fresh one.
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-grey-500">How often</dt>
                  <dd className="font-medium">{FREQUENCY_LABELS[quote.frequency]}</dd>
                </div>
                <div>
                  <dt className="text-grey-500">Valid until</dt>
                  <dd className="font-medium">{formatDate(quote.valid_until)}</dd>
                </div>
                {quote.proposed_start ? (
                  <div>
                    <dt className="text-grey-500">First clean from</dt>
                    <dd className="font-medium">{formatDate(quote.proposed_start)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-grey-500">Paying</dt>
                  <dd className="font-medium">After each clean, by card or transfer</dd>
                </div>
              </dl>
              <QuoteResponse token={params.token} />
              {recurring ? (
                <p className="text-center text-xs text-grey-500">
                  No contract. Skip or cancel any time from your account page.
                </p>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>

      {quote.company.terms ? (
        <p className="whitespace-pre-line text-xs text-grey-500">{quote.company.terms}</p>
      ) : null}
    </PublicShell>
  );
}
