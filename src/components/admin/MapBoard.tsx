'use client';

import dynamic from 'next/dynamic';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { optimiseRouteAction } from '@/app/actions/jobs';
import { JobDrawer } from '@/components/admin/JobDrawer';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Field';
import { JobStatusPill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/States';
import { MapIcon } from '@/components/ui/Icons';
import type { JobView } from '@/lib/db/views';
import { formatMoney } from '@/lib/money';
import { routeLengthKm } from '@/lib/route';

// Leaflet touches `window` on import, so it can only load in the browser.
const RouteMap = dynamic(() => import('@/components/map/RouteMap').then((m) => m.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="h-[28rem] w-full animate-pulse rounded-card border border-grey-200 bg-blue-50 lg:h-[36rem]" />
  ),
});

export function MapBoard({
  jobs,
  staff,
  date,
  cleanerId,
  start,
}: {
  jobs: JobView[];
  staff: { id: string; full_name: string }[];
  date: string;
  cleanerId: string | null;
  start: { lat: number; lng: number } | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<JobView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const distance = routeLengthKm(jobs, start);
  const missingCoords = jobs.filter((job) => job.lat === null || job.lng === null).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {message ? <Notice tone="success">{message}</Notice> : null}

        {jobs.length === 0 ? (
          <Card>
            <EmptyState
              icon={<MapIcon className="h-7 w-7" />}
              title="Nothing to plot"
              description="No jobs are booked for that day, or none of them have a location on file yet."
            />
          </Card>
        ) : (
          <RouteMap
            pins={jobs.map((job) => ({
              id: job.id,
              lat: job.lat,
              lng: job.lng,
              status: job.status,
              title: job.customerName,
              subtitle: job.addressLine1,
            }))}
            start={start}
            selectedId={selected?.id ?? null}
            onSelect={(id) => setSelected(jobs.find((job) => job.id === id) ?? null)}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-grey-500">
            {jobs.length} jobs · about {distance.toFixed(1)} km of driving
            {missingCoords > 0 ? ` · ${missingCoords} without a location, listed at the end` : ''}
          </p>
          <Button
            disabled={pending || jobs.length < 2}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                setMessage(null);
                const result = await optimiseRouteAction({ date, cleanerId: cleanerId ?? 'all' });
                if (result.ok) setMessage(result.message ?? 'Route updated');
                else setError(result.error);
                router.refresh();
              })
            }
          >
            {pending ? 'Working it out…' : 'Optimise route'}
          </Button>
        </div>
      </div>

      <Card className="h-fit">
        <CardHeader title="In order" subtitle={`${jobs.length} stops`} />
        <ol className="max-h-[36rem] divide-y divide-grey-200 overflow-y-auto">
          {jobs.map((job, index) => (
            <li key={job.id}>
              <button
                type="button"
                onClick={() => setSelected(job)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-blue-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-blue-100 text-sm font-semibold tabular-nums text-blue-700">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{job.customerName}</span>
                  <span className="block truncate text-xs uppercase text-grey-500">
                    {job.postcode || 'No postcode'}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-grey-500">
                  {formatMoney(job.price)}
                </span>
                <JobStatusPill status={job.status} />
              </button>
            </li>
          ))}
        </ol>
      </Card>

      <JobDrawer job={selected} staff={staff} onClose={() => setSelected(null)} />
    </div>
  );
}
