'use client';

import { useState } from 'react';
import { JobDrawer } from '@/components/admin/JobDrawer';
import { PhotoThumb } from '@/components/admin/JobPhotos';
import { Card, CardHeader } from '@/components/ui/Card';
import { DogIcon, KeyIcon } from '@/components/ui/Icons';
import { JobStatusPill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/States';
import type { JobView } from '@/lib/db/views';
import { formatMoney } from '@/lib/money';

interface Group {
  id: string | null;
  name: string;
  jobs: JobView[];
}

export function TodayBoard({
  groups,
  staff,
}: {
  groups: Group[];
  staff: { id: string; full_name: string }[];
}) {
  const [selected, setSelected] = useState<JobView | null>(null);

  if (groups.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Nothing booked for today"
          description="Either it is a day off, or the rounds have not been set up yet. Add a round and the schedule fills itself in."
        />
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {groups.map((group) => {
          const done = group.jobs.filter((job) => job.status === 'completed').length;
          return (
            <Card key={group.id ?? 'unassigned'}>
              <CardHeader
                title={group.name}
                subtitle={`${done} of ${group.jobs.length} done`}
                action={
                  <span className="text-sm font-semibold tabular-nums text-grey-500">
                    {formatMoney(group.jobs.reduce((sum, job) => sum + job.price, 0))}
                  </span>
                }
              />
              <ul className="divide-y divide-grey-200">
                {group.jobs.map((job) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(job)}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-blue-50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-blue-100 text-sm font-semibold tabular-nums text-blue-700">
                        {job.sequence}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-grey-900">
                          {job.customerName}
                        </span>
                        <span className="flex items-center gap-2 truncate text-sm text-grey-500">
                          {job.addressLine1}
                          {job.postcode ? ` · ${job.postcode}` : ''}
                          {job.gateCode ? <KeyIcon className="h-4 w-4 shrink-0" /> : null}
                          {job.dogOnSite ? <DogIcon className="h-4 w-4 shrink-0" /> : null}
                        </span>
                      </span>

                      <span className="hidden shrink-0 text-sm font-semibold tabular-nums text-grey-900 sm:block">
                        {formatMoney(job.price)}
                      </span>
                      <JobStatusPill status={job.status} />
                      <PhotoThumb job={job} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <JobDrawer job={selected} staff={staff} onClose={() => setSelected(null)} />
    </>
  );
}
