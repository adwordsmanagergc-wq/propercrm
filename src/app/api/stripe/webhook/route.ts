import { NextResponse, type NextRequest } from 'next/server';
import { verifyStripeSignature } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface StripeEvent {
  id: string;
  type: string;
  account?: string;
  data: {
    object: {
      id: string;
      payment_status?: string;
      metadata?: Record<string, string>;
      charges_enabled?: boolean;
    };
  };
}

/**
 * Stripe Connect webhook. Add this URL in Stripe as a Connect endpoint
 * listening for checkout.session.completed, checkout.session.async_payment_succeeded
 * and account.updated, and put its signing secret in STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;
  const supabase = createServiceClient();
  const object = event.data.object;

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const invoiceId = object.metadata?.invoice_id;
    const companyId = object.metadata?.company_id;
    if (object.payment_status === 'paid' && invoiceId && companyId && event.account) {
      // Only trust the event for the company whose Stripe account it came from.
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('stripe_account_id', event.account)
        .maybeSingle();

      if (company) {
        const { data: updated } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            payment_method: 'card',
            paid_at: new Date().toISOString(),
            stripe_session_id: object.id,
          })
          .eq('id', invoiceId)
          .eq('company_id', company.id)
          .in('status', ['draft', 'sent', 'overdue'])
          .select('id, number, total');

        if (updated && updated.length > 0) {
          await supabase.from('activity_log').insert({
            company_id: company.id,
            actor_id: null,
            entity: 'invoice',
            entity_id: invoiceId,
            action: 'paid_online',
            payload: { session: object.id, event: event.id },
          });
        }
      }
    }
  }

  if (event.type === 'account.updated' && event.account) {
    await supabase
      .from('companies')
      .update({ stripe_charges_enabled: Boolean(object.charges_enabled) })
      .eq('stripe_account_id', event.account);
  }

  return NextResponse.json({ received: true });
}
