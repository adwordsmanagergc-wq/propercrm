'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { useSync } from '@/components/cleaner/SyncProvider';
import { useDevicePlatform } from '@/components/cleaner/JobCard';
import { Notice } from '@/components/ui/Field';
import { DogIcon, KeyIcon, PinIcon } from '@/components/ui/Icons';
import { directionsUrl } from '@/lib/maps';
import type { MyJobRow } from '@/lib/types/database';

const RouteMap = dynamic(() => import('@/components/map/RouteMap').then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <div className="h-[60vh] w-full animate-pulse rounded-card bg-blue-50" />,
});

/**
 * The cleaner's own day on a map: their jobs, numbered in the order the office
 * put them in, and nothing else. Same component the office map uses, fed from
 * the my_jobs view — so there is no route by which a price could appear here.
 *
 * The list stays the default. Tiles need a signal and the list does not.
 */
export function MyDayMap({ jobs }: { jobs: MyJobRow[] }) {
  const { online } = useSync();
  const platform = useDevicePlatform();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const located = jobs.filter((job) => job.lat !== null && job.lng !== null);
  const missing = jobs.length - located.length;
  const selected = jobs.find((job) => job.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      {!online ? (
        <Notice tone="info">
          No signal, so the map cannot load. Your list still works — switch back to it.
        </Notice>
      ) : null}

      {located.length === 0 ? (
        <Notice tone="info">
          None of today&rsquo;s jobs have a location saved yet. Ask the office to add postcodes, and
          use the list for now.
        </Notice>
      ) : (
        <RouteMap
          pins={located.map((job) => ({
            id: job.id,
            lat: job.lat,
            lng: job.lng,
            status: job.status,
            title: job.customer_first_name,
            subtitle: job.address_line1,
          }))}
          start={null}
          selectedId={selectedId}
          onSelect={setSelectedId}
          className="h-[60vh] w-full rounded-card border border-grey-200 bg-blue-50"
        />
      )}

      {missing > 0 && located.length > 0 ? (
        <p className="text-sm text-grey-500">
          {missing} {missing === 1 ? 'job has' : 'jobs have'} no location saved and{' '}
          {missing === 1 ? 'is' : 'are'} not on the map. {missing === 1 ? 'It is' : 'They are'}{' '}
          still on your list.
        </p>
      ) : null}

      {/* Tapping a pin brings up that job, thumb-sized, over the map. */}
      {selected ? (
        <div className="rounded-card border border-grey-200 bg-white p-4 shadow-card">
          <p className="text-lg font-semibold">
            <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-pill bg-blue-100 text-sm tabular-nums text-blue-700">
              {located.findIndex((job) => job.id === selected.id) + 1}
            </span>
            {selected.customer_first_name}
          </p>

          <a
            href={directionsUrl(
              {
                lat: selected.lat,
                lng: selected.lng,
                address_line1: selected.address_line1,
                city: selected.city,
                postcode: selected.postcode,
              },
              platform,
            )}
            className="mt-1.5 flex items-start gap-2 text-base text-blue-700"
          >
            <PinIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              {selected.address_line1}
              <br />
              <span className="font-semibold uppercase">{selected.postcode}</span>
            </span>
          </a>

          {selected.gate_code || selected.access_notes || selected.dog_on_site ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-blue-900">
              {selected.gate_code || selected.access_notes ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-blue-50 px-2.5 py-1">
                  <KeyIcon className="h-4 w-4" /> Access note
                </span>
              ) : null}
              {selected.dog_on_site ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-blue-50 px-2.5 py-1">
                  <DogIcon className="h-4 w-4" /> Dog
                </span>
              ) : null}
            </p>
          ) : null}

          <Link
            href={`/app/jobs/${selected.id}`}
            className={
              selected.status === 'completed' || selected.status === 'skipped'
                ? 'mt-3 flex h-12 w-full items-center justify-center rounded-btn border border-grey-200 bg-white text-base font-semibold text-grey-500'
                : 'mt-3 flex h-16 w-full items-center justify-center rounded-btn bg-blue-500 text-xl font-semibold text-white shadow-card active:bg-blue-700'
            }
          >
            {selected.status === 'completed'
              ? 'Done — view'
              : selected.status === 'skipped'
                ? 'Missed — view'
                : selected.status === 'in_progress'
                  ? 'Carry on'
                  : 'Start job'}
          </Link>
        </div>
      ) : located.length > 0 ? (
        <p className="text-center text-base text-grey-500">Tap a pin to open that job.</p>
      ) : null}
    </div>
  );
}
