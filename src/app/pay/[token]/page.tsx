import type { Metadata } from 'next';
import { NotAvailable, PublicShell } from '@/components/public/PublicShell';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Field';
import { formatDate } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { stripeConfigured } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Pay your invoice',
  robots: { index: false, follow: false },
};

/**
 * The page behind every "pay here" link. Read with the service role because
 * the customer has no session; the 48-character token is the only key, and
 * only this one invoice is ever read with it.
 */
export default async function PayPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { status?: string; error?: string };
}) {
  const missing = (
    <NotAvailable
      title="Invoice not found"
      body="Check the link, or ask for it to be sent again."
    />
  );
  if (!/^[a-f0-9]{48}$/.test(params.token)) return missing;

  const { data: invoice } = await createServiceClient()
    .from('invoices')
    .select(
      'number, issue_date, due_date, status, total, customer:customers(name, portal_token), lines:invoice_lines(description, quantity, unit_price, position), company:companies(name, phone, email, logo_url, bank_account_name, bank_sort_code, bank_account_number, stripe_account_id, stripe_charges_enabled)',
    )
    .eq('pay_token', params.token)
    .maybeSingle();

  const company = Array.isArray(invoice?.company) ? invoice?.company[0] : invoice?.company;
  const customer = Array.isArray(invoice?.customer) ? invoice?.customer[0] : invoice?.customer;
  if (!invoice || !company || invoice.status === 'void' || invoice.status === 'draft')
    return missing;

  const paid = invoice.status === 'paid';
  const justPaid = searchParams.status === 'success';
  const canPayByCard =
    !paid &&
    stripeConfigured() &&
    Boolean(company.stripe_account_id) &&
    company.stripe_charges_enabled;
  const bank = company.bank_sort_code && company.bank_account_number;
  const lines = [...(invoice.lines ?? [])].sort((a, b) => a.position - b.position);

  return (
    <PublicShell company={company}>
      <div>
        <p className="text-sm font-semibold text-blue-700">Invoice {invoice.number}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {paid || justPaid ? 'Paid. Thank you!' : `${formatMoney(Number(invoice.total))} to pay`}
        </h1>
        <p className="text-grey-500">
          {customer?.name} · issued {formatDate(invoice.issue_date)}
          {!paid ? ` · due ${formatDate(invoice.due_date)}` : ''}
        </p>
      </div>

      {justPaid && !paid ? (
        <Notice tone="success">Payment received. It can take a minute to show here.</Notice>
      ) : null}
      {searchParams.error ? (
        <Notice tone="error">
          {searchParams.error === 'checkout'
            ? 'We could not start the card payment. Please try again, or pay by bank transfer.'
            : 'Card payment is not available for this invoice. Please pay by bank transfer.'}
        </Notice>
      ) : null}

      <Card>
        <ul className="divide-y divide-grey-200">
          {lines.map((line, index) => (
            <li key={index} className="flex justify-between gap-3 px-5 py-3 text-sm">
              <span>{line.description}</span>
              <span className="tabular-nums">
                {formatMoney(Number(line.quantity) * Number(line.unit_price))}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-end justify-between border-t border-grey-200 px-5 py-4">
          <span className="text-grey-500">Total</span>
          <span className="text-2xl font-semibold tabular-nums">
            {formatMoney(Number(invoice.total))}
          </span>
        </div>
      </Card>

      {!paid && !justPaid ? (
        <Card>
          <CardBody className="space-y-4">
            {canPayByCard ? (
              <form action={`/pay/${params.token}/checkout`} method="post">
                <Button type="submit" size="xl">
                  Pay {formatMoney(Number(invoice.total))} by card
                </Button>
                <p className="mt-2 text-center text-xs text-grey-500">
                  Secure payment by Stripe. Apple Pay and Google Pay work too.
                </p>
              </form>
            ) : null}
            {bank ? (
              <div className="rounded-btn bg-blue-50 px-4 py-3 text-sm">
                <p className="font-semibold">
                  {canPayByCard ? 'Or pay by bank transfer' : 'Pay by bank transfer'}
                </p>
                <p className="mt-1">
                  {company.bank_account_name ?? company.name}
                  <br />
                  Sort code {company.bank_sort_code} · Account {company.bank_account_number}
                  <br />
                  Reference: {invoice.number}
                </p>
              </div>
            ) : null}
            {!canPayByCard && !bank ? (
              <p className="text-sm text-grey-500">
                Please get in touch with {company.name} to pay
                {company.phone ? ` on ${company.phone}` : ''}.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {customer?.portal_token ? (
        <p className="text-center text-sm">
          <a href={`/portal/${customer.portal_token}`} className="font-semibold text-blue-700">
            See your account page
          </a>
        </p>
      ) : null}
    </PublicShell>
  );
}
