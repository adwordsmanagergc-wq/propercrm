import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { InvoiceActions } from '@/components/admin/InvoiceActions';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { InvoiceStatusPill } from '@/components/ui/Pill';
import { requireStaff } from '@/lib/auth';
import { getInvoice } from '@/lib/db/invoices';
import { getCompany } from '@/lib/db/staff';
import { formatDate, todayInTimezone } from '@/lib/format';
import { chaseMessage, lineTotal } from '@/lib/invoice';
import { formatMoney } from '@/lib/money';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const invoice = await getInvoice(params.id);
  return { title: invoice ? `Invoice ${invoice.number}` : 'Invoice' };
}

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const viewer = await requireStaff();
  const [invoice, company] = await Promise.all([getInvoice(params.id), getCompany()]);
  if (!invoice) notFound();

  const today = todayInTimezone(viewer.company.timezone);
  const daysOverdue = Math.max(
    0,
    differenceInCalendarDays(parseISO(today), parseISO(invoice.due_date)),
  );

  const chase = chaseMessage({
    customerName: invoice.customer?.name ?? 'there',
    companyName: company?.name ?? viewer.company.name,
    invoiceNumber: invoice.number,
    amount: formatMoney(Number(invoice.total)),
    dueDate: formatDate(invoice.due_date),
    daysOverdue,
    bankAccountName: company?.bank_account_name,
    bankSortCode: company?.bank_sort_code,
    bankAccountNumber: company?.bank_account_number,
  });

  const lines = [...(invoice.lines ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/app/invoices" className="text-sm font-semibold text-blue-700">
        ← Invoices
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{invoice.number}</h1>
          <p className="text-grey-500">
            <Link href={`/app/customers/${invoice.customer_id}`} className="hover:text-blue-700">
              {invoice.customer?.name}
            </Link>
            {' · '}
            {formatDate(invoice.issue_date)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <InvoiceStatusPill status={invoice.status} />
          <span className="text-2xl font-semibold tabular-nums">
            {formatMoney(Number(invoice.total))}
          </span>
        </div>
      </div>

      {invoice.status === 'overdue' ? (
        <p className="border-danger/30 rounded-btn border bg-white px-3.5 py-3 text-sm font-semibold text-danger">
          {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue. Due{' '}
          {formatDate(invoice.due_date)}.
        </p>
      ) : null}

      <Card>
        <CardHeader title="What it is for" subtitle={`${lines.length} lines`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="border-b border-grey-200 text-xs uppercase tracking-wide text-grey-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Description</th>
                <th className="px-5 py-3 text-right font-semibold">Qty</th>
                <th className="px-5 py-3 text-right font-semibold">Price</th>
                <th className="px-5 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-200">
              {lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-5 py-3">{line.description}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{Number(line.quantity)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatMoney(Number(line.unit_price))}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">
                    {formatMoney(
                      lineTotal({
                        quantity: Number(line.quantity),
                        unit_price: Number(line.unit_price),
                      }),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-grey-200">
                <td colSpan={3} className="px-5 py-3 text-right font-semibold">
                  Total
                </td>
                <td className="px-5 py-3 text-right text-lg font-semibold tabular-nums">
                  {formatMoney(Number(invoice.total))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="What next"
          subtitle={
            invoice.status === 'paid' && invoice.paid_at
              ? `Paid ${formatDate(invoice.paid_at)} by ${invoice.payment_method}`
              : `Due ${formatDate(invoice.due_date)}`
          }
        />
        <CardBody>
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status}
            today={today}
            chaseText={chase}
          />
        </CardBody>
      </Card>
    </div>
  );
}
