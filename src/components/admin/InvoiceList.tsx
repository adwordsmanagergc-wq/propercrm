'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { InvoiceStatusPill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/States';
import { InvoiceIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import type { InvoiceStatus } from '@/lib/types/database';

export interface InvoiceRowView {
  id: string;
  number: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  total: number;
  daysOverdue: number;
}

const FILTERS: { value: InvoiceStatus | 'all' | 'owed'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'owed', label: 'Owed' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

export function InvoiceList({ invoices }: { invoices: InvoiceRowView[] }) {
  const [filter, setFilter] = useState<InvoiceStatus | 'all' | 'owed'>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return invoices;
    if (filter === 'owed') {
      return invoices.filter(
        (invoice) => invoice.status === 'sent' || invoice.status === 'overdue',
      );
    }
    return invoices.filter((invoice) => invoice.status === filter);
  }, [invoices, filter]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-grey-200 p-4">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={cn(
              'rounded-pill px-3.5 py-1.5 text-sm font-semibold transition-colors',
              filter === option.value
                ? 'bg-blue-500 text-white'
                : 'border border-grey-200 bg-white text-grey-500 hover:text-blue-700',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<InvoiceIcon className="h-7 w-7" />}
          title="Nothing here"
          description="No invoices match that filter."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-grey-200 text-xs uppercase tracking-wide text-grey-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Invoice</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Issued</th>
                <th className="px-5 py-3 font-semibold">Due</th>
                <th className="px-5 py-3 text-right font-semibold">Total</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-200">
              {filtered.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-blue-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/app/invoices/${invoice.id}`}
                      className="font-medium text-grey-900 hover:text-blue-700"
                    >
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-grey-500">{invoice.customerName}</td>
                  <td className="px-5 py-3 text-grey-500">{formatDate(invoice.issueDate)}</td>
                  <td className="px-5 py-3 text-grey-500">
                    {formatDate(invoice.dueDate)}
                    {invoice.daysOverdue > 0 && invoice.status !== 'paid' ? (
                      <span className="ml-1.5 font-semibold text-danger">
                        +{invoice.daysOverdue}d
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">
                    {formatMoney(invoice.total)}
                  </td>
                  <td className="px-5 py-3">
                    <InvoiceStatusPill status={invoice.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
