'use client';

import { useMemo, useState, useTransition } from 'react';
import { createInvoiceAction } from '@/app/actions/invoices';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Notice } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/format';
import { formatMoney } from '@/lib/money';

export interface UninvoicedJob {
  id: string;
  customerId: string;
  customerName: string;
  postcode: string;
  scheduledDate: string;
  price: number;
}

/**
 * "Two clicks": pick the customer, then raise the invoice. Every completed job
 * of theirs is ticked by default, so the common case is exactly two taps.
 */
export function NewInvoicePanel({ jobs }: { jobs: UninvoicedJob[] }) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byCustomer = useMemo(() => {
    const map = new Map<string, { name: string; postcode: string; jobs: UninvoicedJob[] }>();
    for (const job of jobs) {
      if (!map.has(job.customerId)) {
        map.set(job.customerId, { name: job.customerName, postcode: job.postcode, jobs: [] });
      }
      map.get(job.customerId)!.jobs.push(job);
    }
    return [...map.entries()]
      .map(([id, group]) => ({ id, ...group }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [jobs]);

  const selected = byCustomer.find((group) => group.id === customerId) ?? null;
  const chosenJobs = selected?.jobs.filter((job) => !excluded.has(job.id)) ?? [];
  const total = chosenJobs.reduce((sum, job) => sum + job.price, 0);

  function close() {
    setOpen(false);
    setCustomerId(null);
    setExcluded(new Set());
    setError(null);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>New invoice</Button>

      <Drawer
        open={open}
        onClose={close}
        title={selected ? selected.name : 'Who are we invoicing?'}
        subtitle={
          selected
            ? `${chosenJobs.length} ${chosenJobs.length === 1 ? 'job' : 'jobs'} · ${formatMoney(total)}`
            : 'Only customers with finished, uninvoiced jobs are listed.'
        }
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pending || chosenJobs.length === 0}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const result = await createInvoiceAction({
                      customerId: selected.id,
                      jobIds: chosenJobs.map((job) => job.id),
                    });
                    if (!result.ok) setError(result.error);
                  })
                }
              >
                {pending ? 'Raising…' : `Raise invoice for ${formatMoney(total)}`}
              </Button>
              <Button variant="ghost" onClick={() => setCustomerId(null)}>
                Pick someone else
              </Button>
            </div>
          ) : null
        }
      >
        {error ? <Notice tone="error">{error}</Notice> : null}

        {byCustomer.length === 0 ? (
          <EmptyState
            title="Nothing to invoice"
            description="Every finished job has already been put on an invoice."
          />
        ) : !selected ? (
          <ul className="divide-y divide-grey-200">
            {byCustomer.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => setCustomerId(group.id)}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left hover:text-blue-700"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{group.name}</span>
                    <span className="block text-sm text-grey-500">
                      {group.jobs.length} {group.jobs.length === 1 ? 'job' : 'jobs'} ·{' '}
                      <span className="uppercase">{group.postcode}</span>
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(group.jobs.reduce((sum, job) => sum + job.price, 0))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-grey-200">
            {selected.jobs.map((job) => {
              const included = !excluded.has(job.id);
              return (
                <li key={job.id}>
                  <label className="flex cursor-pointer items-center gap-3 py-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-blue-500"
                      checked={included}
                      onChange={(event) =>
                        setExcluded((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.delete(job.id);
                          else next.add(job.id);
                          return next;
                        })
                      }
                    />
                    <span className="flex-1 text-sm">{formatDate(job.scheduledDate)}</span>
                    <span className="font-semibold tabular-nums">{formatMoney(job.price)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </Drawer>
    </>
  );
}
