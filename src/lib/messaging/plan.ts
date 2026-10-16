import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { formatMoney } from '@/lib/money';
import type { ContactPref, MessageChannel, MessageKind } from '@/lib/types/database';
import {
  DEFAULT_TEMPLATES,
  EMAIL_SUBJECTS,
  firstName,
  pickChannel,
  renderTemplate,
  toSmsText,
  type TemplateVars,
} from '@/lib/messaging/templates';

/**
 * Works out what the daily run should send. Pure: it is handed the rows and
 * returns the messages, so the rules are tested without a database.
 */

export interface PlanCompany {
  id: string;
  name: string;
  phone: string | null;
  notify_visit_reminder: boolean;
  notify_job_done: boolean;
  notify_overdue: boolean;
  chase_every_days: number;
  tpl_visit_reminder: string | null;
  tpl_job_done: string | null;
  tpl_overdue: string | null;
}

export interface PlanCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferred_contact: ContactPref;
  is_active: boolean;
  portal_token: string;
}

export interface PlanJob {
  id: string;
  scheduled_date: string;
  customer: PlanCustomer | null;
}

export interface PlanInvoice {
  id: string;
  number: string;
  due_date: string;
  total: number;
  pay_token: string;
  customer: PlanCustomer | null;
}

export interface PlannedMessage {
  kind: MessageKind;
  channel: MessageChannel;
  to: string;
  subject: string | null;
  body: string;
  customerId: string;
  relatedId: string;
  dedupeKey: string;
}

/** Stop chasing after this many reminders; by then it needs a phone call. */
export const MAX_CHASES = 5;

export function portalUrl(siteUrl: string, token: string) {
  return `${siteUrl}/portal/${token}`;
}
export function payUrl(siteUrl: string, token: string) {
  return `${siteUrl}/pay/${token}`;
}
export function quoteUrl(siteUrl: string, token: string) {
  return `${siteUrl}/q/${token}`;
}

export function composeMessage(
  kind: MessageKind,
  template: string | null | undefined,
  vars: TemplateVars,
  channel: MessageChannel,
): { subject: string | null; body: string } {
  const body = renderTemplate(template?.trim() || DEFAULT_TEMPLATES[kind], vars);
  return {
    subject: channel === 'email' ? renderTemplate(EMAIL_SUBJECTS[kind], vars) : null,
    body: channel === 'sms' ? toSmsText(body) : body,
  };
}

export function planDailyMessages(input: {
  company: PlanCompany;
  today: string;
  siteUrl: string;
  jobsTomorrow: PlanJob[];
  jobsDone: PlanJob[];
  overdueInvoices: PlanInvoice[];
}): PlannedMessage[] {
  const { company, today, siteUrl } = input;
  const planned: PlannedMessage[] = [];
  const base = { company: company.name, company_phone: company.phone ?? '' };

  const add = (
    kind: MessageKind,
    template: string | null,
    customer: PlanCustomer | null,
    relatedId: string,
    dedupeKey: string,
    vars: TemplateVars,
  ) => {
    if (!customer || !customer.is_active) return;
    const route = pickChannel(customer);
    if (!route) return;
    const { subject, body } = composeMessage(
      kind,
      template,
      { ...base, first_name: firstName(customer.name), ...vars },
      route.channel,
    );
    planned.push({
      kind,
      channel: route.channel,
      to: route.to,
      subject,
      body,
      customerId: customer.id,
      relatedId,
      dedupeKey,
    });
  };

  if (company.notify_visit_reminder) {
    const tomorrow = format(addDays(parseISO(today), 1), 'yyyy-MM-dd');
    // One reminder per customer per day, however many properties they have.
    const seen = new Set<string>();
    for (const job of input.jobsTomorrow) {
      if (job.scheduled_date !== tomorrow || !job.customer || seen.has(job.customer.id)) continue;
      seen.add(job.customer.id);
      add('visit_reminder', company.tpl_visit_reminder, job.customer, job.id, `visit:${job.id}`, {
        day: 'tomorrow',
        date: format(parseISO(job.scheduled_date), 'EEEE d MMMM'),
        link: portalUrl(siteUrl, job.customer.portal_token),
      });
    }
  }

  if (company.notify_job_done) {
    const seen = new Set<string>();
    for (const job of input.jobsDone) {
      if (!job.customer || seen.has(job.customer.id)) continue;
      seen.add(job.customer.id);
      add('job_done', company.tpl_job_done, job.customer, job.id, `done:${job.id}`, {
        date: format(parseISO(job.scheduled_date), 'EEEE d MMMM'),
        link: portalUrl(siteUrl, job.customer.portal_token),
      });
    }
  }

  if (company.notify_overdue) {
    const every = Math.max(1, company.chase_every_days);
    for (const invoice of input.overdueInvoices) {
      const daysOverdue = differenceInCalendarDays(parseISO(today), parseISO(invoice.due_date));
      if (daysOverdue < 1) continue;
      // Day 1, then every N days: buckets 0, 1, 2… each send once.
      const bucket = Math.floor((daysOverdue - 1) / every);
      if (bucket >= MAX_CHASES) continue;
      add(
        'overdue',
        company.tpl_overdue,
        invoice.customer,
        invoice.id,
        `overdue:${invoice.id}:${bucket}`,
        {
          invoice_number: invoice.number,
          amount: formatMoney(invoice.total),
          due_date: format(parseISO(invoice.due_date), 'd MMMM'),
          days_overdue: daysOverdue,
          link: payUrl(siteUrl, invoice.pay_token),
        },
      );
    }
  }

  return planned;
}
