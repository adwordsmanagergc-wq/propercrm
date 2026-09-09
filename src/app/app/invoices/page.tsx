import type { Metadata } from 'next';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { InvoiceList, type InvoiceRowView } from '@/components/admin/InvoiceList';
import { NewInvoicePanel, type UninvoicedJob } from '@/components/admin/NewInvoicePanel';
import { Card, StatTile } from '@/components/ui/Card';
import { requireStaff } from '@/lib/auth';
import { getAgedDebt, getInvoices, getUninvoicedJobs } from '@/lib/db/invoices';
import { todayInTimezone } from '@/lib/format';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Invoices' };

export default async function InvoicesPage() {
  const viewer = await requireStaff();
  const today = parseISO(todayInTimezone(viewer.company.timezone));

  const [invoices, aged, uninvoiced] = await Promise.all([
    getInvoices(),
    getAgedDebt(),
    getUninvoicedJobs(),
  ]);

  const rows: InvoiceRowView[] = invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    customerName: invoice.customer?.name ?? 'Customer',
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    status: invoice.status,
    total: Number(invoice.total),
    daysOverdue: Math.max(0, differenceInCalendarDays(today, parseISO(invoice.due_date))),
  }));

  const jobs: UninvoicedJob[] = uninvoiced.map((job) => ({
    id: job.id,
    customerId: job.customer_id,
    customerName: job.customer?.name ?? 'Customer',
    postcode: job.customer?.postcode ?? '',
    scheduledDate: job.scheduled_date,
    price: Number(job.price),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-grey-500">
            {formatMoney(Number(aged.total_owed))} owed across{' '}
            {rows.filter((r) => r.status === 'sent' || r.status === 'overdue').length} invoices.
          </p>
        </div>
        <NewInvoicePanel jobs={jobs} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Not due yet"
          value={formatMoney(Number(aged.bucket_current))}
          tone="blue"
        />
        <StatTile
          label="0–30 days over"
          value={formatMoney(Number(aged.bucket_0_30))}
          tone="warning"
        />
        <StatTile
          label="31–60 days over"
          value={formatMoney(Number(aged.bucket_31_60))}
          tone="warning"
        />
        <StatTile
          label="60+ days over"
          value={formatMoney(Number(aged.bucket_60_plus))}
          tone={Number(aged.bucket_60_plus) > 0 ? 'danger' : 'default'}
          hint="Chase these first."
        />
      </div>

      <Card>
        <InvoiceList invoices={rows} />
      </Card>
    </div>
  );
}
