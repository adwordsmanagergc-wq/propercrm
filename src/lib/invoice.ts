import { differenceInCalendarDays } from 'date-fns';
import { round2, toPence, toPounds } from '@/lib/money';
import type { InvoiceStatus } from '@/lib/types/database';

export interface InvoiceLineInput {
  description?: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceTotals {
  subtotal: number;
  total: number;
}

export function lineTotal(line: InvoiceLineInput): number {
  return round2(line.quantity * line.unit_price);
}

/**
 * Proper CRM is aimed at sole traders and small firms, most of whom are not
 * VAT registered, so total === subtotal for now. Keeping them separate leaves
 * room for VAT without a schema change.
 */
export function invoiceTotals(lines: InvoiceLineInput[]): InvoiceTotals {
  const pence = lines.reduce((sum, line) => sum + toPence(lineTotal(line)), 0);
  const subtotal = toPounds(pence);
  return { subtotal, total: subtotal };
}

export interface AgeableInvoice {
  total: number;
  due_date: string | Date;
  status: InvoiceStatus;
}

export interface AgedDebt {
  current: number;
  d0_30: number;
  d31_60: number;
  d60_plus: number;
  total: number;
}

const OUTSTANDING: InvoiceStatus[] = ['sent', 'overdue'];

/** Aged debt: 0–30 / 31–60 / 60+ days past the due date. */
export function agedDebt(invoices: AgeableInvoice[], today: Date = new Date()): AgedDebt {
  const buckets: AgedDebt = { current: 0, d0_30: 0, d31_60: 0, d60_plus: 0, total: 0 };

  for (const invoice of invoices) {
    if (!OUTSTANDING.includes(invoice.status)) continue;

    const due =
      typeof invoice.due_date === 'string' ? new Date(invoice.due_date) : invoice.due_date;
    const daysOver = differenceInCalendarDays(today, due);
    const pence = toPence(invoice.total);

    if (daysOver < 0) buckets.current += pence;
    else if (daysOver <= 30) buckets.d0_30 += pence;
    else if (daysOver <= 60) buckets.d31_60 += pence;
    else buckets.d60_plus += pence;

    buckets.total += pence;
  }

  return {
    current: toPounds(buckets.current),
    d0_30: toPounds(buckets.d0_30),
    d31_60: toPounds(buckets.d31_60),
    d60_plus: toPounds(buckets.d60_plus),
    total: toPounds(buckets.total),
  };
}

export function isOverdue(due: string | Date, today: Date = new Date()): boolean {
  const dueDate = typeof due === 'string' ? new Date(due) : due;
  return differenceInCalendarDays(today, dueDate) > 0;
}

export interface ChaseMessageInput {
  customerName: string;
  companyName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  daysOverdue: number;
  bankAccountName?: string | null;
  bankSortCode?: string | null;
  bankAccountNumber?: string | null;
}

/** The ready-written reminder that the "Chase" button copies. */
export function chaseMessage(input: ChaseMessageInput): string {
  const firstName = input.customerName.trim().split(' ')[0] ?? input.customerName;
  const bank =
    input.bankSortCode && input.bankAccountNumber
      ? `\n\nBank transfer: ${input.bankAccountName ?? input.companyName}, sort code ${input.bankSortCode}, account ${input.bankAccountNumber}.`
      : '';

  const overdueLine =
    input.daysOverdue > 0
      ? `It was due on ${input.dueDate}, so it is now ${input.daysOverdue} day${input.daysOverdue === 1 ? '' : 's'} overdue.`
      : `It is due on ${input.dueDate}.`;

  return (
    `Hello ${firstName},\n\n` +
    `Just a quick reminder about invoice ${input.invoiceNumber} for ${input.amount}. ` +
    `${overdueLine}${bank}\n\n` +
    `If you have already paid, please ignore this — and thank you.\n\n` +
    `Many thanks,\n${input.companyName}`
  );
}
