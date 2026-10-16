import { NextResponse, type NextRequest } from 'next/server';
import { getSiteUrl } from '@/lib/env';
import { toPence } from '@/lib/money';
import { applicationFeePence, stripeConfigured, stripeRequest } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Sends the customer to Stripe Checkout for one invoice. The amount comes from
 * the database, never the browser, and the charge lands in the window
 * cleaning company's own Stripe account.
 */
export async function POST(_request: NextRequest, { params }: { params: { token: string } }) {
  const site = getSiteUrl();
  const back = (query: string) =>
    NextResponse.redirect(`${site}/pay/${params.token}?${query}`, { status: 303 });

  if (!/^[a-f0-9]{48}$/.test(params.token) || !stripeConfigured()) return back('error=unavailable');

  const supabase = createServiceClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select(
      'id, number, total, status, company_id, customer:customers(email), company:companies(name, stripe_account_id, stripe_charges_enabled)',
    )
    .eq('pay_token', params.token)
    .maybeSingle();

  const company = Array.isArray(invoice?.company) ? invoice?.company[0] : invoice?.company;
  const customer = Array.isArray(invoice?.customer) ? invoice?.customer[0] : invoice?.customer;
  if (!invoice || !company) return back('error=unavailable');
  if (invoice.status === 'paid') return back('status=paid');
  if (invoice.status === 'void' || invoice.status === 'draft') return back('error=unavailable');
  if (!company.stripe_account_id || !company.stripe_charges_enabled)
    return back('error=unavailable');

  const amount = toPence(Number(invoice.total));
  if (amount < 30) return back('error=unavailable'); // Stripe's minimum charge in GBP

  try {
    const session = await stripeRequest<{ id: string; url: string }>(
      'POST',
      '/checkout/sessions',
      {
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'gbp',
              unit_amount: amount,
              product_data: { name: `Invoice ${invoice.number}`, description: company.name },
            },
          },
        ],
        customer_email: customer?.email ?? undefined,
        payment_intent_data: {
          application_fee_amount: applicationFeePence(amount),
          description: `${company.name} invoice ${invoice.number}`,
          metadata: { invoice_id: invoice.id, company_id: invoice.company_id },
        },
        metadata: { invoice_id: invoice.id, company_id: invoice.company_id },
        success_url: `${site}/pay/${params.token}?status=success`,
        cancel_url: `${site}/pay/${params.token}`,
      },
      { account: company.stripe_account_id },
    );

    await supabase.from('invoices').update({ stripe_session_id: session.id }).eq('id', invoice.id);
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    console.error('[pay] checkout failed', error);
    return back('error=checkout');
  }
}
