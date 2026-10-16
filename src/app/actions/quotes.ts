'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fail, ok, run, type ActionResult } from '@/lib/actions';
import { assertStaff } from '@/lib/auth';
import { getSiteUrl } from '@/lib/env';
import { quoteUrl } from '@/lib/messaging/plan';
import { describeOutcome, sendNow } from '@/lib/messaging/send-now';
import { frequencyWords } from '@/lib/messaging/templates';
import { formatMoney } from '@/lib/money';
import { createClient } from '@/lib/supabase/server';
import { channelSchema, quoteSchema, uuid } from '@/lib/validation';

function revalidateQuotes(id?: string) {
  revalidatePath('/app/quotes');
  if (id) revalidatePath(`/app/quotes/${id}`);
}

/** Creates or updates a quote and its lines in one database call. */
export async function saveQuoteAction(input: unknown): Promise<ActionResult<string>> {
  let createdId: string | null = null;

  const result = await run<string>(async () => {
    await assertStaff();
    const quote = quoteSchema.parse(input);
    const supabase = createClient();

    const { data, error } = await supabase.rpc('save_quote', {
      p_id: quote.id ?? null,
      p_customer: quote.customer_id ?? null,
      p_contact_name: quote.contact_name,
      p_contact_email: quote.contact_email ?? null,
      p_contact_phone: quote.contact_phone ?? null,
      p_address_line1: quote.address_line1,
      p_address_line2: quote.address_line2 ?? null,
      p_city: quote.city ?? null,
      p_postcode: quote.postcode,
      p_frequency: quote.frequency,
      p_duration_mins: quote.duration_mins,
      p_proposed_start: quote.proposed_start ?? null,
      p_valid_until: quote.valid_until ?? null,
      p_message: quote.message ?? null,
      p_lines: quote.lines,
    });

    if (error) return fail(error.message);
    if (!quote.id) createdId = data;
    revalidateQuotes(data);
    return ok(data, 'Quote saved');
  });

  if (result.ok && createdId) redirect(`/app/quotes/${createdId}`);
  return result;
}

async function loadQuote(quoteId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('quotes')
    .select(
      'id, number, status, token, total, frequency, contact_name, contact_email, contact_phone, customer_id',
    )
    .eq('id', quoteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Quote not found');
  return data;
}

/** Emails or texts the quote link, and marks it sent. */
export async function sendQuoteAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertStaff();
    const { quoteId, channel } = z
      .object({ quoteId: uuid, channel: channelSchema.optional() })
      .parse(input);
    const supabase = createClient();
    const quote = await loadQuote(quoteId);

    if (quote.status === 'accepted' || quote.status === 'declined') {
      return fail('That quote has already been answered');
    }

    const { data: company } = await supabase.from('companies').select('*').maybeSingle();
    if (!company) return fail('Company not found');

    const outcome = await sendNow({
      supabase,
      userId: viewer.userId,
      company,
      recipient: {
        id: quote.customer_id,
        name: quote.contact_name,
        email: quote.contact_email,
        phone: quote.contact_phone,
        preferred_contact: quote.contact_email ? 'email' : 'sms',
      },
      kind: 'quote',
      channel,
      relatedId: quote.id,
      vars: {
        quote_number: quote.number,
        amount: formatMoney(Number(quote.total)),
        frequency: frequencyWords(quote.frequency),
        link: quoteUrl(getSiteUrl(), quote.token),
      },
    });

    if (outcome.status === 'failed') return fail(describeOutcome(outcome));

    if (outcome.status === 'sent') {
      const { error } = await supabase
        .from('quotes')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', quote.id)
        .in('status', ['draft', 'sent', 'expired']);
      if (error) return fail(error.message);
    }

    revalidateQuotes(quote.id);
    return outcome.status === 'sent'
      ? ok(undefined, describeOutcome(outcome))
      : fail(describeOutcome(outcome));
  });
}

/** For when the office sends the link themselves (WhatsApp, a text from their own phone). */
export async function markQuoteSentAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const { quoteId } = z.object({ quoteId: uuid }).parse(input);
    const supabase = createClient();
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', quoteId)
      .eq('status', 'draft');
    if (error) return fail(error.message);
    revalidateQuotes(quoteId);
    return ok(undefined, 'Marked as sent. The link is live.');
  });
}

export async function deleteQuoteAction(input: unknown): Promise<ActionResult> {
  const result = await run(async () => {
    await assertStaff();
    const { quoteId } = z.object({ quoteId: uuid }).parse(input);
    const supabase = createClient();
    const { error, count } = await supabase
      .from('quotes')
      .delete({ count: 'exact' })
      .eq('id', quoteId)
      .neq('status', 'accepted');
    if (error) return fail(error.message);
    if (!count)
      return fail('An accepted quote is part of the customer record and cannot be deleted');
    revalidateQuotes();
    return ok(undefined, 'Quote deleted');
  });

  if (result.ok) redirect('/app/quotes');
  return result;
}
