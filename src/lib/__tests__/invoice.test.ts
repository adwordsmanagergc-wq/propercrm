import { describe, expect, it } from 'vitest';
import { agedDebt, chaseMessage, invoiceTotals, isOverdue, lineTotal } from '@/lib/invoice';
import { formatMoney, round2 } from '@/lib/money';
import type { InvoiceStatus } from '@/lib/types/database';

describe('lineTotal', () => {
  it('multiplies quantity by unit price', () => {
    expect(lineTotal({ quantity: 3, unit_price: 12.5 })).toBe(37.5);
  });

  it('does not leak floating point noise', () => {
    expect(lineTotal({ quantity: 3, unit_price: 12.35 })).toBe(37.05);
    expect(lineTotal({ quantity: 7, unit_price: 0.1 })).toBe(0.7);
  });

  it('rounds a half penny up', () => {
    expect(lineTotal({ quantity: 1, unit_price: 12.345 })).toBe(12.35);
  });
});

describe('invoiceTotals', () => {
  it('is zero for an empty invoice', () => {
    expect(invoiceTotals([])).toEqual({ subtotal: 0, total: 0 });
  });

  it('sums the lines', () => {
    const totals = invoiceTotals([
      { quantity: 1, unit_price: 18 },
      { quantity: 1, unit_price: 22.5 },
      { quantity: 2, unit_price: 12.25 },
    ]);
    expect(totals).toEqual({ subtotal: 65, total: 65 });
  });

  it('sums a long run of awkward numbers exactly', () => {
    const lines = Array.from({ length: 100 }, () => ({ quantity: 1, unit_price: 0.07 }));
    expect(invoiceTotals(lines).total).toBe(7);
  });

  it('keeps subtotal and total in step while there is no VAT', () => {
    const totals = invoiceTotals([{ quantity: 3, unit_price: 14.99 }]);
    expect(totals.subtotal).toBe(44.97);
    expect(totals.total).toBe(totals.subtotal);
  });
});

describe('round2 and formatMoney', () => {
  it('rounds to the penny', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('formats as pounds sterling', () => {
    expect(formatMoney(1234.5)).toBe('£1,234.50');
    expect(formatMoney(null)).toBe('£0.00');
  });
});

describe('agedDebt', () => {
  const today = new Date('2024-06-30T12:00:00Z');
  const invoice = (total: number, due: string, status: InvoiceStatus = 'sent') => ({
    total,
    due_date: due,
    status,
  });

  it('is all zeros with nothing outstanding', () => {
    expect(agedDebt([], today)).toEqual({ current: 0, d0_30: 0, d31_60: 0, d60_plus: 0, total: 0 });
  });

  it('drops each invoice into the right bucket', () => {
    const buckets = agedDebt(
      [
        invoice(10, '2024-07-10'), // not due yet
        invoice(20, '2024-06-20'), // 10 days over
        invoice(40, '2024-05-15'), // 46 days over
        invoice(80, '2024-03-01'), // 121 days over
      ],
      today,
    );
    expect(buckets).toEqual({ current: 10, d0_30: 20, d31_60: 40, d60_plus: 80, total: 150 });
  });

  it('ignores paid, draft and void invoices', () => {
    const buckets = agedDebt(
      [
        invoice(100, '2024-05-01', 'paid'),
        invoice(200, '2024-05-01', 'draft'),
        invoice(400, '2024-05-01', 'void'),
        invoice(25, '2024-06-25', 'overdue'),
      ],
      today,
    );
    expect(buckets.total).toBe(25);
    expect(buckets.d0_30).toBe(25);
  });

  it('puts a boundary invoice in the lower bucket', () => {
    expect(agedDebt([invoice(5, '2024-05-31')], today).d0_30).toBe(5); // exactly 30 days
    expect(agedDebt([invoice(5, '2024-05-30')], today).d31_60).toBe(5); // 31 days
  });

  it('adds up to the total owed', () => {
    const buckets = agedDebt(
      [invoice(12.35, '2024-06-01'), invoice(7.65, '2024-04-01'), invoice(10, '2024-07-01')],
      today,
    );
    expect(round2(buckets.current + buckets.d0_30 + buckets.d31_60 + buckets.d60_plus)).toBe(
      buckets.total,
    );
  });
});

describe('isOverdue', () => {
  const today = new Date('2024-06-30T12:00:00Z');
  it('is false on the due date itself', () => {
    expect(isOverdue('2024-06-30', today)).toBe(false);
  });
  it('is true the day after', () => {
    expect(isOverdue('2024-06-29', today)).toBe(true);
  });
});

describe('chaseMessage', () => {
  const base = {
    customerName: 'Margaret Barnes',
    companyName: 'Crystal Clear Windows',
    invoiceNumber: 'CCW-1042',
    amount: '£36.00',
    dueDate: '14 Jun 2024',
    daysOverdue: 16,
  };

  it('greets the customer by first name and names the invoice', () => {
    const message = chaseMessage(base);
    expect(message).toContain('Hello Margaret,');
    expect(message).toContain('CCW-1042');
    expect(message).toContain('£36.00');
    expect(message).toContain('16 days overdue');
    expect(message).toContain('Crystal Clear Windows');
  });

  it('says "1 day" rather than "1 days"', () => {
    expect(chaseMessage({ ...base, daysOverdue: 1 })).toContain('1 day overdue');
  });

  it('does not claim an invoice is overdue when it is not', () => {
    const message = chaseMessage({ ...base, daysOverdue: 0 });
    expect(message).toContain('It is due on 14 Jun 2024.');
    expect(message).not.toContain('overdue');
  });

  it('includes bank details only when they are set', () => {
    expect(chaseMessage(base)).not.toContain('sort code');
    const withBank = chaseMessage({
      ...base,
      bankAccountName: 'Crystal Clear Windows Ltd',
      bankSortCode: '30-96-26',
      bankAccountNumber: '11223344',
    });
    expect(withBank).toContain('sort code 30-96-26');
    expect(withBank).toContain('account 11223344');
  });
});
