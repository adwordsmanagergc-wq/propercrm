'use client';

import { useState } from 'react';
import { PhotoGrid, PhotoThumb } from '@/components/admin/JobPhotos';
import { Drawer } from '@/components/ui/Drawer';
import { JobStatusPill, SKIP_REASON_LABELS } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/States';
import type { JobView } from '@/lib/db/views';
import { formatDate, formatTime } from '@/lib/format';
import { formatMoney } from '@/lib/money';

export function CustomerHistory({ visits }: { visits: JobView[] }) {
  const [selected, setSelected] = useState<JobView | null>(null);

  if (visits.length === 0) {
    return (
      <EmptyState
        title="No visits yet"
        description="Once a cleaner has been, every visit shows here with its photos."
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-grey-200">
        {visits.map((visit) => (
          <li key={visit.id}>
            <button
              type="button"
              onClick={() => setSelected(visit)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-blue-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{formatDate(visit.scheduledDate)}</span>
                <span className="block text-sm text-grey-500">
                  {visit.assigneeName ?? 'Nobody assigned'}
                  {visit.completedAt ? ` · ${formatTime(visit.completedAt)}` : ''}
                  {visit.skipReason ? ` · ${SKIP_REASON_LABELS[visit.skipReason]}` : ''}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatMoney(visit.price)}
              </span>
              <JobStatusPill status={visit.status} />
              <PhotoThumb job={visit} />
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
        <Drawer
          open
          onClose={() => setSelected(null)}
          title={formatDate(selected.scheduledDate)}
          subtitle={selected.assigneeName ?? 'Nobody assigned'}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <JobStatusPill status={selected.status} />
              <span className="ml-auto text-lg font-semibold tabular-nums">
                {formatMoney(selected.price)}
              </span>
            </div>
            {selected.notes ? (
              <p className="rounded-btn bg-grey-50 px-3.5 py-3 text-sm">{selected.notes}</p>
            ) : null}
            <PhotoGrid photos={selected.photos} />
          </div>
        </Drawer>
      ) : null}
    </>
  );
}
