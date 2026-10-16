import 'server-only';
import { stripeConfigured, stripeRequest } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

interface StripeAccount {
  id: string;
  charges_enabled: boolean;
  details_submitted: boolean;
}

/** Re-reads a connected account from Stripe and stores whether it can take cards. */
export async function syncStripeAccount(companyId: string, accountId: string): Promise<boolean> {
  if (!stripeConfigured()) return false;
  const account = await stripeRequest<StripeAccount>('GET', `/accounts/${accountId}`);
  const supabase = createServiceClient();
  await supabase
    .from('companies')
    .update({ stripe_charges_enabled: account.charges_enabled })
    .eq('id', companyId)
    .eq('stripe_account_id', accountId);
  return account.charges_enabled;
}
