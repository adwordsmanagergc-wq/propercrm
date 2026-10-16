'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resolveRequestAction } from '@/app/actions/messages';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Field';
import { formatRelativeDay, formatShortDate } from '@/lib/format';
import type { RequestKind } from '@/lib/types/database';

export interface RequestView {
  id: string;
  kind: RequestKind;
  message: string | null;
  createdAt: string;
  customerId: string;
  customerName: string;
  jobDate: string | null;
}

const LABELS: Record<RequestKind, string> = {
  skip_next: 'Wants to skip their next clean',
  extra_clean: 'Wants an extra clean',
  callback: 'Wants a call back',
  message: 'Sent a message',
};

/** Requests customers made from their portal. Shown on Today until handled. */
export function RequestList({
  requests,
  showCustomer = true,
}: {
  requests: RequestView[];
  showCustomer?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resolve(requestId: string, skipJob: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await resolveRequestAction({ requestId, skipJob });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      {error ? (
        <div className="px-5 pt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      <ul className="divide-y divide-grey-200">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {showCustomer ? (
                  <Link
                    href={`/app/customers/${request.customerId}`}
                    className="hover:text-blue-700"
                  >
                    {request.customerName}
                  </Link>
                ) : null}
                {showCustomer ? ' · ' : ''}
                <span className={showCustomer ? 'font-normal' : ''}>{LABELS[request.kind]}</span>
              </p>
              {request.kind === 'skip_next' && request.jobDate ? (
                <p className="text-sm text-grey-500">Visit on {formatShortDate(request.jobDate)}</p>
              ) : null}
              {request.message ? (
                <p className="mt-1 whitespace-pre-line text-sm">{request.message}</p>
              ) : null}
              <p className="mt-1 text-xs text-grey-500">{formatRelativeDay(request.createdAt)}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {request.kind === 'skip_next' && request.jobDate ? (
                <Button size="sm" disabled={pending} onClick={() => resolve(request.id, true)}>
                  Skip that visit
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => resolve(request.id, false)}
              >
                Done
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
