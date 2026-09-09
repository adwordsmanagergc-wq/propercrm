'use client';

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bulkAssignDayAction, moveJobAction } from '@/app/actions/jobs';
import { JobDrawer } from '@/components/admin/JobDrawer';
import { Card, CardHeader } from '@/components/ui/Card';
import { Notice, Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import type { JobView } from '@/lib/db/views';
import { formatMoney } from '@/lib/money';

interface Staff {
  id: string;
  full_name: string;
}

interface Move {
  jobId: string;
  date: string;
  assignedTo: string | null;
}

const DAY_LABEL = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const DATE_LABEL = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function labelFor(iso: string, formatter: Intl.DateTimeFormat) {
  return formatter.format(new Date(`${iso}T12:00:00`));
}

/**
 * Week and month views of the diary. Jobs drag between days and between
 * cleaners; the move is applied locally first and rolled back if the server
 * says no, so a drag never feels like it hangs.
 */
export function ScheduleBoard({
  jobs,
  staff,
  days,
  view,
  today,
}: {
  jobs: JobView[];
  staff: Staff[];
  days: string[];
  view: 'week' | 'month';
  today: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobView | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticJobs, applyMove] = useOptimistic(jobs, (current: JobView[], move: Move) =>
    current.map((job) =>
      job.id === move.jobId
        ? { ...job, scheduledDate: move.date, assignedTo: move.assignedTo }
        : job,
    ),
  );

  const rows = useMemo(
    () => [
      ...staff.map((person) => ({ id: person.id, name: person.full_name })),
      { id: null, name: 'Not assigned' },
    ],
    [staff],
  );

  const byCell = useMemo(() => {
    const map = new Map<string, JobView[]>();
    for (const job of optimisticJobs) {
      const key = `${job.scheduledDate}|${job.assignedTo ?? 'none'}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    for (const list of map.values()) list.sort((a, b) => a.sequence - b.sequence);
    return map;
  }, [optimisticJobs]);

  const byDay = useMemo(() => {
    const map = new Map<string, JobView[]>();
    for (const job of optimisticJobs) {
      if (!map.has(job.scheduledDate)) map.set(job.scheduledDate, []);
      map.get(job.scheduledDate)!.push(job);
    }
    return map;
  }, [optimisticJobs]);

  const unassigned = optimisticJobs.filter((job) => job.assignedTo === null);

  function move(jobId: string, date: string, assignedTo: string | null) {
    setError(null);
    startTransition(async () => {
      applyMove({ jobId, date, assignedTo });
      const result = await moveJobAction({
        jobId,
        scheduled_date: date,
        assigned_to: assignedTo ?? 'unassigned',
      });
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  function onDrop(event: React.DragEvent, date: string, assignedTo: string | null) {
    event.preventDefault();
    setDropTarget(null);
    setDragging(null);
    const jobId = event.dataTransfer.getData('text/job-id');
    if (!jobId) return;
    const job = optimisticJobs.find((candidate) => candidate.id === jobId);
    if (!job) return;
    if (job.scheduledDate === date && job.assignedTo === assignedTo) return;
    move(jobId, date, assignedTo);
  }

  function bulkAssign(date: string, cleanerId: string) {
    if (!cleanerId) return;
    setError(null);
    startTransition(async () => {
      const result = await bulkAssignDayAction({ date, cleanerId, onlyUnassigned: 'false' });
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <Notice tone="error">{error}</Notice> : null}

      {view === 'week' ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_16rem]">
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[60rem] table-fixed border-collapse">
              <thead>
                <tr>
                  <th className="w-32 border-b border-grey-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-grey-500">
                    Cleaner
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className={cn(
                        'border-b border-l border-grey-200 px-2 py-2 text-left',
                        day === today && 'bg-blue-50',
                      )}
                    >
                      <span className="block text-xs font-semibold uppercase tracking-wide text-grey-500">
                        {labelFor(day, DAY_LABEL)}
                      </span>
                      <span className="block text-sm font-semibold">
                        {labelFor(day, DATE_LABEL)}
                      </span>
                      <Select
                        aria-label={`Assign every job on ${labelFor(day, DATE_LABEL)}`}
                        className="mt-1.5 h-8 px-2 py-0 text-xs"
                        value=""
                        onChange={(event) => bulkAssign(day, event.target.value)}
                      >
                        <option value="">Assign all to…</option>
                        {staff.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.full_name}
                          </option>
                        ))}
                      </Select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id ?? 'none'}>
                    <th
                      scope="row"
                      className="border-b border-grey-200 px-3 py-2 text-left align-top text-sm font-semibold"
                    >
                      {row.name}
                    </th>
                    {days.map((day) => {
                      const key = `${day}|${row.id ?? 'none'}`;
                      const cell = byCell.get(key) ?? [];
                      return (
                        <td
                          key={key}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDropTarget(key);
                          }}
                          onDragLeave={() =>
                            setDropTarget((current) => (current === key ? null : current))
                          }
                          onDrop={(event) => onDrop(event, day, row.id)}
                          className={cn(
                            'border-b border-l border-grey-200 p-1.5 align-top transition-colors',
                            dropTarget === key && 'bg-blue-100',
                            day === today && dropTarget !== key && 'bg-blue-50/60',
                          )}
                        >
                          <ul className="space-y-1.5">
                            {cell.map((job) => (
                              <li key={job.id}>
                                <JobChip
                                  job={job}
                                  dragging={dragging === job.id}
                                  onDragStart={(event) => {
                                    event.dataTransfer.setData('text/job-id', job.id);
                                    event.dataTransfer.effectAllowed = 'move';
                                    setDragging(job.id);
                                  }}
                                  onDragEnd={() => setDragging(null)}
                                  onClick={() => setSelected(job)}
                                />
                              </li>
                            ))}
                          </ul>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="h-fit">
            <CardHeader title="Not assigned" subtitle={`${unassigned.length} jobs`} />
            <div className="max-h-[32rem] space-y-2 overflow-y-auto p-3">
              {unassigned.length === 0 ? (
                <EmptyState
                  title="All covered"
                  description="Every job this week has a name against it."
                />
              ) : (
                unassigned.map((job) => (
                  <JobChip
                    key={job.id}
                    job={job}
                    showDate
                    dragging={dragging === job.id}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/job-id', job.id);
                      setDragging(job.id);
                    }}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => setSelected(job)}
                  />
                ))
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <div className="grid min-w-[52rem] grid-cols-7">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                className="border-b border-grey-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-grey-500"
              >
                {day}
              </div>
            ))}
            {days.map((day) => {
              const cell = byDay.get(day) ?? [];
              const done = cell.filter((job) => job.status === 'completed').length;
              return (
                <div
                  key={day}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropTarget(day);
                  }}
                  onDragLeave={() => setDropTarget((current) => (current === day ? null : current))}
                  onDrop={(event) => {
                    const jobId = event.dataTransfer.getData('text/job-id');
                    const job = optimisticJobs.find((candidate) => candidate.id === jobId);
                    onDrop(event, day, job?.assignedTo ?? null);
                  }}
                  className={cn(
                    'min-h-28 border-b border-l border-grey-200 p-2 align-top transition-colors',
                    dropTarget === day && 'bg-blue-100',
                    day === today && dropTarget !== day && 'bg-blue-50',
                  )}
                >
                  <p className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{labelFor(day, DATE_LABEL)}</span>
                    {cell.length > 0 ? (
                      <span className="text-xs text-grey-500">
                        {done}/{cell.length}
                      </span>
                    ) : null}
                  </p>
                  <ul className="space-y-1">
                    {cell.slice(0, 4).map((job) => (
                      <li key={job.id}>
                        <JobChip
                          job={job}
                          compact
                          dragging={dragging === job.id}
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/job-id', job.id);
                            setDragging(job.id);
                          }}
                          onDragEnd={() => setDragging(null)}
                          onClick={() => setSelected(job)}
                        />
                      </li>
                    ))}
                  </ul>
                  {cell.length > 4 ? (
                    <Link
                      href={`/app/schedule?view=week&date=${day}`}
                      className="mt-1 block text-xs font-semibold text-blue-700"
                    >
                      +{cell.length - 4} more
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <JobDrawer job={selected} staff={staff} onClose={() => setSelected(null)} />
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'border-grey-200 bg-white text-grey-900',
  in_progress: 'border-blue-200 bg-blue-100 text-blue-900',
  completed: 'border-success/30 bg-white text-success',
  skipped: 'border-danger/30 bg-white text-danger',
  cancelled: 'border-grey-200 bg-grey-50 text-grey-500 line-through',
};

function JobChip({
  job,
  compact,
  showDate,
  dragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  job: JobView;
  compact?: boolean;
  showDate?: boolean;
  dragging?: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'w-full cursor-grab rounded-btn border px-2 py-1.5 text-left text-xs transition-shadow hover:shadow-card active:cursor-grabbing',
        STATUS_STYLES[job.status],
        dragging && 'opacity-40',
      )}
    >
      <span className="block truncate font-semibold">{job.customerName}</span>
      {!compact ? (
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate uppercase opacity-70">{job.postcode}</span>
          <span className="shrink-0 tabular-nums">{formatMoney(job.price)}</span>
        </span>
      ) : null}
      {showDate ? (
        <span className="mt-0.5 block text-[0.7rem] opacity-70">
          {labelFor(job.scheduledDate, DATE_LABEL)}
        </span>
      ) : null}
    </button>
  );
}
