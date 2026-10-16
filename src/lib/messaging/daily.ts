import 'server-only';
import { addDays, format, parseISO } from 'date-fns';
import { getSiteUrl } from '@/lib/env';
import { deliver } from '@/lib/messaging/deliver';
import { planDailyMessages, type PlanCustomer } from '@/lib/messaging/plan';
import { createServiceClient } from '@/lib/supabase/server';

const CUSTOMER_FIELDS = 'id, name, email, phone, preferred_contact, is_active, portal_token';

export interface DailyRunResult {
  companies: number;
  sent: number;
  skipped: number;
  failed: number;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * The evening run: tomorrow's visit reminders, today's "job done" notes and
 * overdue chasers, for every company that switched them on. Safe to run more
 * than once a day; message_log's dedupe key means nobody hears twice.
 */
export async function runDailyMessages(): Promise<DailyRunResult> {
  const supabase = createServiceClient();
  const siteUrl = getSiteUrl();
  const result: DailyRunResult = { companies: 0, sent: 0, skipped: 0, failed: 0 };

  const { data: companies, error } = await supabase
    .from('companies')
    .select(
      'id, name, phone, email, timezone, sms_sender, notify_visit_reminder, notify_job_done, notify_overdue, chase_every_days, tpl_visit_reminder, tpl_job_done, tpl_overdue',
    )
    .or('notify_visit_reminder.eq.true,notify_job_done.eq.true,notify_overdue.eq.true');
  if (error) throw new Error(error.message);

  for (const company of companies ?? []) {
    result.companies += 1;
    const { data: todayValue } = await supabase.rpc('today_for_company', { p_company: company.id });
    const today = String(todayValue ?? format(new Date(), 'yyyy-MM-dd'));
    const tomorrow = format(addDays(parseISO(today), 1), 'yyyy-MM-dd');
    const since = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();

    const [tomorrowJobs, doneJobs, overdue] = await Promise.all([
      company.notify_visit_reminder
        ? supabase
            .from('jobs')
            .select(`id, scheduled_date, customer:customers(${CUSTOMER_FIELDS})`)
            .eq('company_id', company.id)
            .eq('scheduled_date', tomorrow)
            .eq('status', 'scheduled')
            .limit(1000)
        : Promise.resolve({ data: [], error: null }),
      company.notify_job_done
        ? supabase
            .from('jobs')
            .select(`id, scheduled_date, customer:customers(${CUSTOMER_FIELDS})`)
            .eq('company_id', company.id)
            .eq('status', 'completed')
            .gte('completed_at', since)
            .limit(1000)
        : Promise.resolve({ data: [], error: null }),
      company.notify_overdue
        ? supabase
            .from('invoices')
            .select(
              `id, number, due_date, total, pay_token, customer:customers(${CUSTOMER_FIELDS})`,
            )
            .eq('company_id', company.id)
            .eq('status', 'overdue')
            .limit(1000)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const planned = planDailyMessages({
      company,
      today,
      siteUrl,
      jobsTomorrow: (tomorrowJobs.data ?? []).map((job) => ({
        id: job.id,
        scheduled_date: job.scheduled_date,
        customer: one(job.customer) as PlanCustomer | null,
      })),
      jobsDone: (doneJobs.data ?? []).map((job) => ({
        id: job.id,
        scheduled_date: job.scheduled_date,
        customer: one(job.customer) as PlanCustomer | null,
      })),
      overdueInvoices: (overdue.data ?? []).map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        due_date: invoice.due_date,
        total: Number(invoice.total),
        pay_token: invoice.pay_token,
        customer: one(invoice.customer) as PlanCustomer | null,
      })),
    });
    if (planned.length === 0) continue;

    const { data: already } = await supabase
      .from('message_log')
      .select('dedupe_key')
      .eq('company_id', company.id)
      .neq('status', 'failed')
      .in(
        'dedupe_key',
        planned.map((message) => message.dedupeKey),
      );
    const done = new Set((already ?? []).map((row) => row.dedupe_key));

    for (const message of planned) {
      if (done.has(message.dedupeKey)) continue;

      const outcome = await deliver({
        channel: message.channel,
        to: message.to,
        subject: message.subject,
        body: message.body,
        fromName: company.name,
        replyTo: company.email,
        smsSender: company.sms_sender,
      });

      // If two runs overlap, the unique index rejects the second log row;
      // that is the outcome we want, so the error is ignored.
      await supabase.from('message_log').insert({
        company_id: company.id,
        customer_id: message.customerId,
        kind: message.kind,
        channel: message.channel,
        recipient: message.to,
        subject: message.subject,
        body: message.body,
        status: outcome.status,
        error: outcome.error ?? null,
        provider_id: outcome.providerId ?? null,
        related_id: message.relatedId,
        dedupe_key: message.dedupeKey,
      });

      result[outcome.status] += 1;
    }
  }

  return result;
}
