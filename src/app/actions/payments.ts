'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { fail, ok, run, type ActionResult } from '@/lib/actions';
import { assertOwner } from '@/lib/auth';
import { getSiteUrl } from '@/lib/env';
import { stripeConfigured, stripeRequest } from '@/lib/stripe';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Starts (or resumes) Stripe onboarding for the company and sends the owner
 * to Stripe's hosted form. Stripe sends them back to Settings when done.
 */
export async function connectStripeAction(): Promise<ActionResult> {
  let destination: string | null = null;

  const result = await run(async () => {
    const viewer = await assertOwner();
    if (!stripeConfigured()) return fail('Card payments are not set up on this deploy yet');

    const supabase = createClient();
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, email, stripe_account_id')
      .maybeSingle();
    if (!company) return fail('Company not found');

    let accountId = company.stripe_account_id;
    if (!accountId) {
      const account = await stripeRequest<{ id: string }>(
        'POST',
        '/accounts',
        {
          type: 'standard',
          country: 'GB',
          email: company.email ?? viewer.email,
          business_profile: { name: company.name, mcc: '7349' },
          metadata: { company_id: company.id },
        },
        { idempotencyKey: `connect-${company.id}` },
      );
      accountId = account.id;
      const { error } = await createServiceClient()
        .from('companies')
        .update({ stripe_account_id: accountId, stripe_charges_enabled: false })
        .eq('id', company.id);
      if (error) return fail(error.message);
    }

    const site = getSiteUrl();
    const link = await stripeRequest<{ url: string }>('POST', '/account_links', {
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${site}/app/settings?stripe=refresh`,
      return_url: `${site}/app/settings?stripe=return`,
    });
    destination = link.url;
    return ok(undefined);
  });

  if (result.ok && destination) redirect(destination);
  return result;
}

/** Stops offering card payments. The Stripe account itself is left alone. */
export async function disconnectStripeAction(): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertOwner();
    const { error } = await createServiceClient()
      .from('companies')
      .update({ stripe_account_id: null, stripe_charges_enabled: false })
      .eq('id', viewer.company.id);
    if (error) return fail(error.message);
    revalidatePath('/app/settings');
    return ok(undefined, 'Card payments switched off');
  });
}
