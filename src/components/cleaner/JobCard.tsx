'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertIcon, CheckIcon, DogIcon, KeyIcon, PinIcon } from '@/components/ui/Icons';
import { SKIP_REASON_LABELS } from '@/components/ui/Pill';
import { detectPlatform, directionsUrl, type Platform } from '@/lib/maps';
import type { MyJobRow } from '@/lib/types/database';

export function useDevicePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>('web');
  useEffect(() => setPlatform(detectPlatform(navigator.userAgent)), []);
  return platform;
}

/**
 * One job, one card, one big button. Everything a cleaner needs standing at a
 * gate in the rain: the number, who it is, where it is, and whether the gate is
 * locked or the dog is out.
 */
export function JobCard({ job, index }: { job: MyJobRow; index: number }) {
  const platform = useDevicePlatform();
  const done = job.status === 'completed';
  const missed = job.status === 'skipped';
  const started = job.status === 'in_progress';

  return (
    <li className="overflow-hidden rounded-card border border-grey-200 bg-white shadow-card">
      <div className="flex items-start gap-3 p-4">
        <span
          className={
            done
              ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-success text-white'
              : missed
                ? 'ring-danger/30 flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-white text-danger ring-2'
                : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-blue-100 text-lg font-semibold tabular-nums text-blue-700'
          }
        >
          {done ? (
            <CheckIcon className="h-6 w-6" />
          ) : missed ? (
            <AlertIcon className="h-5 w-5" />
          ) : (
            index
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-grey-900">{job.customer_first_name}</p>
          <a
            href={directionsUrl(
              {
                lat: job.lat,
                lng: job.lng,
                address_line1: job.address_line1,
                city: job.city,
                postcode: job.postcode,
              },
              platform,
            )}
            className="mt-0.5 inline-flex items-start gap-1.5 text-base text-blue-700 underline-offset-2 hover:underline"
          >
            <PinIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {job.address_line1}
              <br />
              <span className="font-semibold uppercase">{job.postcode}</span>
            </span>
          </a>

          {(job.access_notes || job.gate_code || job.dog_on_site) && !done ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-blue-900">
              {job.gate_code || job.access_notes ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-blue-50 px-2.5 py-1">
                  <KeyIcon className="h-4 w-4" /> Access note
                </span>
              ) : null}
              {job.dog_on_site ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-blue-50 px-2.5 py-1">
                  <DogIcon className="h-4 w-4" /> Dog
                </span>
              ) : null}
            </p>
          ) : null}

          {missed && job.skip_reason ? (
            <p className="mt-2 text-sm font-semibold text-danger">
              Missed — {SKIP_REASON_LABELS[job.skip_reason]}
            </p>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-4">
        <Link
          href={`/app/jobs/${job.id}`}
          className={
            done || missed
              ? 'flex h-12 w-full items-center justify-center rounded-btn border border-grey-200 bg-white text-base font-semibold text-grey-500'
              : 'flex h-16 w-full items-center justify-center rounded-btn bg-blue-500 text-xl font-semibold text-white shadow-card active:bg-blue-700'
          }
        >
          {done ? 'View' : missed ? 'View' : started ? 'Carry on' : 'Start job'}
        </Link>
      </div>
    </li>
  );
}
