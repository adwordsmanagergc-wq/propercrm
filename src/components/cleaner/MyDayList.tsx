'use client';

import { useEffect, useState } from 'react';
import { JobCard } from '@/components/cleaner/JobCard';
import { EmptyState } from '@/components/ui/States';
import { SprayIcon } from '@/components/ui/Icons';
import { cacheJobs, readCachedJobs } from '@/lib/offline/cache';
import type { MyJobRow } from '@/lib/types/database';

/**
 * Renders the round from the server when there is signal, and from the copy on
 * the phone when there is not. Every successful load refreshes that copy, so
 * the addresses and access notes are always to hand.
 */
export function MyDayList({ jobs, date }: { jobs: MyJobRow[]; date: string }) {
  const [rows, setRows] = useState(jobs);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (jobs.length > 0) {
      setRows(jobs);
      setFromCache(false);
      void cacheJobs(jobs);
      return;
    }

    // Nothing from the server: fall back to what is on the phone.
    let cancelled = false;
    void readCachedJobs().then((cached) => {
      if (cancelled || !cached) return;
      const forDate = cached.jobs.filter((job) => job.scheduled_date === date);
      if (forDate.length > 0) {
        setRows(forDate);
        setFromCache(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [jobs, date]);

  const todaysJobs = rows.filter((job) => job.scheduled_date === date);
  const remaining = todaysJobs.filter(
    (job) => job.status === 'scheduled' || job.status === 'in_progress',
  ).length;

  if (todaysJobs.length === 0) {
    return (
      <EmptyState
        icon={<SprayIcon className="h-7 w-7" />}
        title="Nothing on today"
        description="No jobs are booked in for you today. Check the week tab for what is coming up."
      />
    );
  }

  return (
    <>
      <p className="mb-3 text-base text-grey-500">
        {remaining === 0 ? 'All done — nice one.' : `${remaining} to go of ${todaysJobs.length}.`}
        {fromCache ? ' Showing the copy saved on this phone.' : ''}
      </p>
      <ul className="space-y-3">
        {todaysJobs.map((job, index) => (
          <JobCard key={job.id} job={job} index={index + 1} />
        ))}
      </ul>
    </>
  );
}
