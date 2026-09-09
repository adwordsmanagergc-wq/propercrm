'use client';

import { useEffect, useMemo, useState } from 'react';
import { JobCard } from '@/components/cleaner/JobCard';
import { MyDayMap } from '@/components/cleaner/MyDayMap';
import { useSync } from '@/components/cleaner/SyncProvider';
import { EmptyState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { SprayIcon } from '@/components/ui/Icons';
import { cacheJobs, readCachedJobs } from '@/lib/offline/cache';
import { pending, type QueueEntry } from '@/lib/offline/queue';
import type { MyJobRow } from '@/lib/types/database';

/**
 * Renders the round from the server when there is signal, and from the copy on
 * the phone when there is not. Every successful load refreshes that copy, so
 * the addresses and access notes are always to hand.
 *
 * Anything still sitting in the outbound queue is folded in on top: a job
 * finished in a back garden with no bars must show as finished, not offer to
 * be started again.
 */
export function MyDayList({ jobs, date }: { jobs: MyJobRow[]; date: string }) {
  const { revision } = useSync();
  const [rows, setRows] = useState(jobs);
  const [fromCache, setFromCache] = useState(false);
  const [queued, setQueued] = useState<QueueEntry[]>([]);
  const [view, setView] = useState<'list' | 'map'>('list');

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
      if (cached.jobs.length > 0) {
        setRows(cached.jobs);
        setFromCache(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [jobs]);

  useEffect(() => {
    let cancelled = false;
    void pending().then((entries) => {
      if (!cancelled) setQueued(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  const todaysJobs = useMemo(() => {
    const queuedStatus = new Map<string, MyJobRow['status']>();
    for (const entry of queued) {
      if (entry.op.kind === 'complete') queuedStatus.set(entry.op.jobId, 'completed');
      else if (entry.op.kind === 'skip') queuedStatus.set(entry.op.jobId, 'skipped');
      else if (entry.op.kind === 'start' && !queuedStatus.has(entry.op.jobId)) {
        queuedStatus.set(entry.op.jobId, 'in_progress');
      }
    }

    return rows
      .filter((job) => job.scheduled_date === date)
      .map((job) => {
        const status = queuedStatus.get(job.id);
        return status && job.status !== 'completed' ? { ...job, status } : job;
      })
      .sort((a, b) => a.sequence - b.sequence);
  }, [rows, date, queued]);

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
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-base text-grey-500">
          {remaining === 0 ? 'All done — nice one.' : `${remaining} to go of ${todaysJobs.length}.`}
          {fromCache ? ' Saved on this phone.' : ''}
        </p>

        {/* Deliberately a toggle inside Today, not a fourth tab — the bottom
            nav stays at three items. */}
        <div className="flex shrink-0 rounded-btn border border-grey-200 bg-white p-1">
          {(['list', 'map'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              aria-pressed={view === option}
              className={cn(
                'rounded-[6px] px-3.5 py-1.5 text-sm font-semibold capitalize transition-colors',
                view === option ? 'bg-blue-500 text-white' : 'text-grey-500',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {view === 'map' ? (
        <MyDayMap jobs={todaysJobs} />
      ) : (
        <ul className="space-y-3">
          {todaysJobs.map((job, index) => (
            <JobCard key={job.id} job={job} index={index + 1} />
          ))}
        </ul>
      )}
    </>
  );
}
