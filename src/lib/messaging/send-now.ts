import 'server-only';
import { composeMessage } from '@/lib/messaging/plan';
import { deliver, type DeliveryResult } from '@/lib/messaging/deliver';
import { firstName, pickChannel, type TemplateVars } from '@/lib/messaging/templates';
import type { createClient } from '@/lib/supabase/server';
import type { CompanyRow, ContactPref, MessageChannel, MessageKind } from '@/lib/types/database';

type Client = ReturnType<typeof createClient>;

export interface Recipient {
  id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  preferred_contact: ContactPref;
}

const TEMPLATE_FIELD: Partial<Record<MessageKind, keyof CompanyRow>> = {
  visit_reminder: 'tpl_visit_reminder',
  job_done: 'tpl_job_done',
  overdue: 'tpl_overdue',
  invoice: 'tpl_invoice',
  quote: 'tpl_quote',
};

/**
 * A message the office sends by pressing a button: an invoice, a quote, a
 * portal link. Sent straight away and written to the customer's history with
 * the signed-in user as the sender.
 */
export async function sendNow(input: {
  supabase: Client;
  userId: string;
  company: CompanyRow;
  recipient: Recipient;
  kind: MessageKind;
  channel?: MessageChannel;
  vars: TemplateVars;
  relatedId?: string | null;
}): Promise<DeliveryResult & { channel?: MessageChannel; to?: string }> {
  const { supabase, company, recipient, kind } = input;

  const route = pickChannel(recipient, input.channel);
  if (!route) {
    return {
      status: 'failed',
      error:
        input.channel === 'sms'
          ? 'There is no mobile number to text'
          : input.channel === 'email'
            ? 'There is no email address to send to'
            : 'This customer has no email or mobile number',
    };
  }

  const field = TEMPLATE_FIELD[kind];
  const template = field ? (company[field] as string | null) : null;
  const { subject, body } = composeMessage(
    kind,
    template,
    {
      company: company.name,
      company_phone: company.phone ?? '',
      first_name: firstName(recipient.name),
      ...input.vars,
    },
    route.channel,
  );

  const outcome = await deliver({
    channel: route.channel,
    to: route.to,
    subject,
    body,
    fromName: company.name,
    replyTo: company.email,
    smsSender: company.sms_sender,
  });

  await supabase.from('message_log').insert({
    company_id: company.id,
    customer_id: recipient.id,
    kind,
    channel: route.channel,
    recipient: route.to,
    subject,
    body,
    status: outcome.status,
    error: outcome.error ?? null,
    provider_id: outcome.providerId ?? null,
    related_id: input.relatedId ?? null,
    created_by: input.userId,
  });

  return { ...outcome, channel: route.channel, to: route.to };
}

export function describeOutcome(
  outcome: DeliveryResult & { channel?: MessageChannel; to?: string },
): string {
  const how = outcome.channel === 'sms' ? 'Text' : 'Email';
  if (outcome.status === 'sent') return `${how} sent to ${outcome.to}`;
  if (outcome.status === 'skipped') return `${how} not sent: ${outcome.error}`;
  return outcome.error ?? 'It did not send';
}
