'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { format, parseISO } from 'date-fns';
import { z } from 'zod';
import { fail, ok, parseForm, run, type ActionResult } from '@/lib/actions';
import { assertStaff } from '@/lib/auth';
import { getSiteUrl } from '@/lib/env';
import { payUrl, portalUrl } from '@/lib/messaging/plan';
import { describeOutcome, sendNow } from '@/lib/messaging/send-now';
import { unknownPlaceholders } from '@/lib/messaging/templates';
import { formatMoney } from '@/lib/money';
import { createClient } from '@/lib/supabase/server';
import { channelSchema, messagingSettingsSchema, uuid } from '@/lib/validation';

const CUSTOMER_FIELDS = 'id, name, email, phone, preferred_contact, portal_token';

async function loadCompany() {
  const supabase = createClient();
  const { data, error } = await supabase.from('companies').select('*').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Company not found');
  return data;
}

/** Emails or texts an invoice with its pay link. A draft becomes "sent". */
export async function sendInvoiceAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertStaff();
    const { invoiceId, channel } = z
      .object({ invoiceId: uuid, channel: channelSchema.optional() })
      .parse(input);
    const supabase = createClient();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(
        `id, number, status, total, due_date, pay_token, customer:customers(${CUSTOMER_FIELDS})`,
      )
      .eq('id', invoiceId)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!invoice?.customer) return fail('Invoice not found');
    if (invoice.status === 'void' || invoice.status === 'paid') {
      return fail('There is nothing to send: this invoice is ' + invoice.status);
    }

    const company = await loadCompany();
    const overdue = invoice.status === 'overdue';
    const outcome = await sendNow({
      supabase,
      userId: viewer.userId,
      company,
      recipient: invoice.customer,
      kind: overdue ? 'overdue' : 'invoice',
      channel,
      relatedId: invoice.id,
      vars: {
        invoice_number: invoice.number,
        amount: formatMoney(Number(invoice.total)),
        due_date: format(parseISO(invoice.due_date), 'd MMMM'),
        link: payUrl(getSiteUrl(), invoice.pay_token),
      },
    });

    if (outcome.status !== 'sent') return fail(describeOutcome(outcome));

    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', invoice.id)
        .eq('status', 'draft');
    }

    revalidatePath(`/app/invoices/${invoice.id}`);
    revalidatePath('/app/invoices');
    return ok(undefined, describeOutcome(outcome));
  });
}

export async function sendPortalLinkAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertStaff();
    const { customerId, channel } = z
      .object({ customerId: uuid, channel: channelSchema.optional() })
      .parse(input);
    const supabase = createClient();

    const { data: customer, error } = await supabase
      .from('customers')
      .select(CUSTOMER_FIELDS)
      .eq('id', customerId)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!customer) return fail('Customer not found');

    const outcome = await sendNow({
      supabase,
      userId: viewer.userId,
      company: await loadCompany(),
      recipient: customer,
      kind: 'portal',
      channel,
      relatedId: customer.id,
      vars: { link: portalUrl(getSiteUrl(), customer.portal_token) },
    });

    revalidatePath(`/app/customers/${customer.id}`);
    return outcome.status === 'sent'
      ? ok(undefined, describeOutcome(outcome))
      : fail(describeOutcome(outcome));
  });
}

/** Kills the old portal link (say a customer forwarded it on) and issues a new one. */
export async function resetPortalLinkAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const { customerId } = z.object({ customerId: uuid }).parse(input);
    const supabase = createClient();
    const { error } = await supabase
      .from('customers')
      .update({ portal_token: randomBytes(24).toString('hex') })
      .eq('id', customerId);
    if (error) return fail(error.message);
    revalidatePath(`/app/customers/${customerId}`);
    return ok(undefined, 'New link made. The old one no longer works.');
  });
}

/**
 * Closes a customer request. For "skip my next clean" the office can also
 * mark that visit as missed in the same click.
 */
export async function resolveRequestAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertStaff();
    const { requestId, skipJob } = z
      .object({ requestId: uuid, skipJob: z.boolean().default(false) })
      .parse(input);
    const supabase = createClient();

    const { data: request, error } = await supabase
      .from('customer_requests')
      .select('id, kind, job_id, customer_id, message')
      .eq('id', requestId)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!request) return fail('Request not found');

    if (skipJob && request.kind === 'skip_next' && request.job_id) {
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'skipped',
          skip_reason: 'customer_cancelled',
          notes: request.message
            ? `Customer asked to skip: ${request.message}`
            : 'Customer asked to skip',
        })
        .eq('id', request.job_id)
        .eq('status', 'scheduled');
      if (jobError) return fail(jobError.message);
    }

    const { error: updateError } = await supabase
      .from('customer_requests')
      .update({ resolved_at: new Date().toISOString(), resolved_by: viewer.userId })
      .eq('id', request.id);
    if (updateError) return fail(updateError.message);

    revalidatePath('/app');
    revalidatePath(`/app/customers/${request.customer_id}`);
    revalidatePath('/app/schedule');
    return ok(undefined, skipJob ? 'Visit skipped and request closed' : 'Request closed');
  });
}

export async function saveMessagingSettingsAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertStaff();
    const input = parseForm(messagingSettingsSchema, formData);

    const templates = {
      tpl_visit_reminder: input.tpl_visit_reminder ?? null,
      tpl_job_done: input.tpl_job_done ?? null,
      tpl_overdue: input.tpl_overdue ?? null,
      tpl_invoice: input.tpl_invoice ?? null,
      tpl_quote: input.tpl_quote ?? null,
    };
    for (const [field, template] of Object.entries(templates)) {
      const unknown = template ? unknownPlaceholders(template) : [];
      if (unknown.length > 0) {
        return fail(`Unknown placeholder {${unknown[0]}}`, {
          [field]: `{${unknown[0]}} is not something we can fill in`,
        });
      }
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('companies')
      .update({
        notify_visit_reminder: input.notify_visit_reminder,
        notify_job_done: input.notify_job_done,
        notify_overdue: input.notify_overdue,
        chase_every_days: input.chase_every_days,
        sms_sender: input.sms_sender ?? null,
        quote_prefix: input.quote_prefix.toUpperCase(),
        quote_valid_days: input.quote_valid_days,
        quote_terms: input.quote_terms ?? null,
        ...templates,
      })
      .eq('id', viewer.company.id);
    if (error) return fail(error.message);

    revalidatePath('/app/settings');
    return ok(undefined, 'Message settings saved');
  });
}
