'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, ok, run, type ActionResult } from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';
import { requestKindSchema } from '@/lib/validation';

/**
 * Actions a customer can take without signing in. Each one goes through a
 * token-checked database function; the token is the only thing they hold.
 */
const token = z.string().regex(/^[a-f0-9]{48}$/, 'That link is not valid');

export async function respondToQuoteAction(input: unknown): Promise<ActionResult<string>> {
  return run(async () => {
    const { quoteToken, accept, reason } = z
      .object({ quoteToken: token, accept: z.boolean(), reason: z.string().max(500).optional() })
      .parse(input);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('respond_to_quote', {
      p_token: quoteToken,
      p_accept: accept,
      p_reason: reason ?? null,
    });
    if (error) return fail(error.message);
    revalidatePath(`/q/${quoteToken}`);
    return ok(
      data,
      data === 'accepted' ? 'Thank you! You are booked in.' : 'Thanks for letting us know.',
    );
  });
}

export async function portalRequestAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { portalToken, kind, message } = z
      .object({
        portalToken: token,
        kind: requestKindSchema,
        message: z.string().trim().max(1000).optional(),
      })
      .parse(input);
    if (kind === 'message' && !message) return fail('Write a message first');

    const supabase = createClient();
    const { error } = await supabase.rpc('portal_request', {
      p_token: portalToken,
      p_kind: kind,
      p_message: message ?? null,
    });
    if (error) return fail(error.message);
    revalidatePath(`/portal/${portalToken}`);
    return ok(undefined, 'Sent. We will be in touch if we need anything.');
  });
}
