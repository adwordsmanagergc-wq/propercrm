/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/admin/PrintButton';
import { requireStaff } from '@/lib/auth';
import { getInvoice } from '@/lib/db/invoices';
import { getCompany } from '@/lib/db/staff';
import { formatDate } from '@/lib/format';
import { invoiceTotals, lineTotal } from '@/lib/invoice';
import { formatMoney } from '@/lib/money';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const invoice = await getInvoice(params.id);
  return { title: invoice ? `Invoice ${invoice.number}` : 'Invoice', robots: { index: false } };
}

/**
 * The printable invoice. Plain A4-ish layout with the company's logo — "Save
 * as PDF" in the browser's print dialog is the PDF export.
 */
export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  await requireStaff();
  const [invoice, company] = await Promise.all([getInvoice(params.id), getCompany()]);
  if (!invoice || !company) notFound();

  const lines = [...(invoice.lines ?? [])].sort((a, b) => a.position - b.position);
  const totals = invoiceTotals(
    lines.map((line) => ({ quantity: Number(line.quantity), unit_price: Number(line.unit_price) })),
  );
  const customer = invoice.customer;

  return (
    <div className="min-h-dvh bg-grey-50 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[52rem] justify-end print:hidden">
        <PrintButton />
      </div>

      <article className="mx-auto max-w-[52rem] rounded-card border border-grey-200 bg-white p-8 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-grey-200 pb-6">
          <div>
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="mb-3 h-14 w-auto" />
            ) : null}
            <h1 className="text-lg font-semibold">{company.name}</h1>
            <p className="mt-1 text-sm text-grey-500">
              {company.phone ? (
                <>
                  {company.phone}
                  <br />
                </>
              ) : null}
              {company.email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight">Invoice</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{invoice.number}</p>
            <dl className="mt-3 space-y-0.5 text-sm text-grey-500">
              <div className="flex justify-end gap-3">
                <dt>Issued</dt>
                <dd className="font-medium text-grey-900">{formatDate(invoice.issue_date)}</dd>
              </div>
              <div className="flex justify-end gap-3">
                <dt>Due</dt>
                <dd className="font-medium text-grey-900">{formatDate(invoice.due_date)}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-grey-500">
              Invoice to
            </h2>
            <p className="mt-2 font-semibold">{customer?.name}</p>
            <p className="text-sm text-grey-500">
              {customer?.address_line1}
              {customer?.address_line2 ? (
                <>
                  <br />
                  {customer.address_line2}
                </>
              ) : null}
              {customer?.city ? (
                <>
                  <br />
                  {customer.city}
                </>
              ) : null}
              {customer?.postcode ? (
                <>
                  <br />
                  <span className="uppercase">{customer.postcode}</span>
                </>
              ) : null}
            </p>
          </div>

          {company.bank_sort_code && company.bank_account_number ? (
            <div className="sm:text-right">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-grey-500">
                How to pay
              </h2>
              <p className="mt-2 text-sm">
                {company.bank_account_name ?? company.name}
                <br />
                Sort code {company.bank_sort_code}
                <br />
                Account {company.bank_account_number}
                {company.bank_name ? (
                  <>
                    <br />
                    {company.bank_name}
                  </>
                ) : null}
              </p>
            </div>
          ) : null}
        </section>

        <table className="w-full text-left text-sm">
          <thead className="border-y border-grey-200 text-xs uppercase tracking-wide text-grey-500">
            <tr>
              <th className="py-3 font-semibold">Description</th>
              <th className="py-3 text-right font-semibold">Qty</th>
              <th className="py-3 text-right font-semibold">Price</th>
              <th className="py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-200">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="py-3 pr-4">{line.description}</td>
                <td className="py-3 text-right tabular-nums">{Number(line.quantity)}</td>
                <td className="py-3 text-right tabular-nums">
                  {formatMoney(Number(line.unit_price))}
                </td>
                <td className="py-3 text-right font-semibold tabular-nums">
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
            <tr className="border-t-2 border-grey-900">
              <td colSpan={3} className="py-4 text-right font-semibold">
                Total due
              </td>
              <td className="py-4 text-right text-xl font-semibold tabular-nums">
                {formatMoney(totals.total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {invoice.notes ? <p className="mt-6 text-sm text-grey-500">{invoice.notes}</p> : null}
        {company.invoice_footer ? (
          <p className="mt-8 border-t border-grey-200 pt-4 text-sm text-grey-500">
            {company.invoice_footer}
          </p>
        ) : null}
      </article>
    </div>
  );
}
