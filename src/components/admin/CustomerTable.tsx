'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/States';
import { SearchIcon } from '@/components/ui/Icons';
import { FREQUENCY_LABELS } from '@/lib/recurrence';
import { formatMoney } from '@/lib/money';
import { formatRelativeDay } from '@/lib/format';
import type { Frequency } from '@/lib/types/database';

export interface CustomerRowView {
  id: string;
  name: string;
  addressLine1: string;
  postcode: string;
  isActive: boolean;
  frequency: Frequency | null;
  nextVisit: string | null;
  balance: number;
  lifetimeValue: number;
}

export function CustomerTable({ customers }: { customers: CustomerRowView[] }) {
  const [query, setQuery] = useState('');
  const [showStopped, setShowStopped] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((customer) => {
      if (!showStopped && !customer.isActive) return false;
      if (needle === '') return true;
      return (
        customer.name.toLowerCase().includes(needle) ||
        customer.addressLine1.toLowerCase().includes(needle) ||
        customer.postcode.toLowerCase().replace(/\s/g, '').includes(needle.replace(/\s/g, ''))
      );
    });
  }, [customers, query, showStopped]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-grey-200 p-4">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-grey-500" />
          <Input
            type="search"
            className="pl-10"
            placeholder="Search name, street or postcode"
            aria-label="Search customers"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-grey-500">
          <input
            type="checkbox"
            className="h-4 w-4 accent-blue-500"
            checked={showStopped}
            onChange={(event) => setShowStopped(event.target.checked)}
          />
          Show stopped
        </label>
        <span className="shrink-0 text-sm text-grey-500">
          {filtered.length} of {customers.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? 'Nobody matches that' : 'No customers yet'}
          description={
            query
              ? 'Try part of a surname, a street or a postcode.'
              : 'Add your first customer and set them up on a round.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-grey-200 text-xs uppercase tracking-wide text-grey-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Postcode</th>
                <th className="px-5 py-3 font-semibold">Round</th>
                <th className="px-5 py-3 font-semibold">Next visit</th>
                <th className="px-5 py-3 text-right font-semibold">Owed</th>
                <th className="px-5 py-3 text-right font-semibold">Lifetime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-200">
              {filtered.map((customer) => (
                <tr key={customer.id} className="transition-colors hover:bg-blue-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/app/customers/${customer.id}`}
                      className="font-medium text-grey-900 hover:text-blue-700"
                    >
                      {customer.name}
                    </Link>
                    <span className="block text-grey-500">{customer.addressLine1}</span>
                    {!customer.isActive ? <Pill className="mt-1">Stopped</Pill> : null}
                  </td>
                  <td className="px-5 py-3 uppercase text-grey-500">{customer.postcode}</td>
                  <td className="px-5 py-3 text-grey-500">
                    {customer.frequency ? FREQUENCY_LABELS[customer.frequency] : 'No round'}
                  </td>
                  <td className="px-5 py-3 text-grey-500">
                    {customer.nextVisit ? formatRelativeDay(customer.nextVisit) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {customer.balance > 0 ? (
                      <span className="font-semibold text-danger">
                        {formatMoney(customer.balance)}
                      </span>
                    ) : (
                      <span className="text-grey-500">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-grey-500">
                    {formatMoney(customer.lifetimeValue)}
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
