'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  assignJobAction,
  cancelJobAction,
  completeJobAction,
  saveJobNoteAction,
  skipJobAction,
  startJobAction,
  updateJobAction,
} from '@/app/actions/jobs';
import { PhotoGrid } from '@/components/admin/JobPhotos';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Field, Input, Notice, Select, Textarea } from '@/components/ui/Field';
import { DogIcon, KeyIcon } from '@/components/ui/Icons';
import { JobStatusPill, SKIP_REASON_LABELS } from '@/components/ui/Pill';
import type { JobView } from '@/lib/db/views';
import { formatDate, formatDuration, formatTime, shortAddress } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import type { SkipReason } from '@/lib/types/database';

interface Staff {
  id: string;
  full_name: string;
}

export function JobDrawer({
  job,
  staff,
  onClose,
}: {
  job: JobView | null;
  staff: Staff[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [skipReason, setSkipReason] = useState<SkipReason>('no_access');
  const [editing, setEditing] = useState(false);

  if (!job) return null;

  function act(work: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) setError(result.error ?? 'That did not work');
      else router.refresh();
    });
  }

  const minutesOnSite =
    job.startedAt && job.completedAt
      ? Math.round(
          (new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 60000,
        )
      : null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={job.customerName}
      subtitle={shortAddress({ address_line1: job.addressLine1, postcode: job.postcode })}
      footer={
        <div className="flex flex-wrap gap-2">
          {job.status === 'scheduled' ? (
            <Button disabled={pending} onClick={() => act(() => startJobAction({ jobId: job.id }))}>
              Start job
            </Button>
          ) : null}
          {job.status === 'in_progress' || job.status === 'scheduled' ? (
            <Button
              variant="success"
              disabled={pending}
              onClick={() => act(() => completeJobAction({ jobId: job.id }))}
            >
              Mark done
            </Button>
          ) : null}
          {job.status !== 'completed' && job.status !== 'cancelled' ? (
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => act(() => skipJobAction({ jobId: job.id, reason: skipReason }))}
            >
              Mark missed
            </Button>
          ) : null}
          {job.status === 'scheduled' ? (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => act(() => cancelJobAction({ jobId: job.id }))}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5">
        {error ? <Notice tone="error">{error}</Notice> : null}

        <div className="flex flex-wrap items-center gap-2">
          <JobStatusPill status={job.status} />
          <span className="text-sm text-grey-500">{formatDate(job.scheduledDate)}</span>
          <span className="ml-auto text-lg font-semibold tabular-nums">
            {formatMoney(job.price)}
          </span>
        </div>

        {job.status === 'skipped' && job.skipReason ? (
          <Notice tone="error">Missed — {SKIP_REASON_LABELS[job.skipReason]}</Notice>
        ) : null}

        {job.accessNotes || job.gateCode || job.dogOnSite ? (
          <div className="space-y-2 rounded-card border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-900">Getting in</h3>
            {job.accessNotes ? <p className="text-sm text-grey-900">{job.accessNotes}</p> : null}
            <div className="flex flex-wrap gap-3 text-sm text-blue-900">
              {job.gateCode ? (
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <KeyIcon className="h-4 w-4" /> Code {job.gateCode}
                </span>
              ) : null}
              {job.dogOnSite ? (
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <DogIcon className="h-4 w-4" /> Dog on site
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Detail label="Customer">
            <Link
              href={`/app/customers/${job.customerId}`}
              className="font-medium text-blue-700 hover:underline"
            >
              {job.customerName}
            </Link>
          </Detail>
          <Detail label="Phone">
            {job.phone ? (
              <a href={`tel:${job.phone.replace(/\s/g, '')}`} className="text-blue-700">
                {job.phone}
              </a>
            ) : (
              '—'
            )}
          </Detail>
          <Detail label="Started">{job.startedAt ? formatTime(job.startedAt) : '—'}</Detail>
          <Detail label="Finished">{job.completedAt ? formatTime(job.completedAt) : '—'}</Detail>
          <Detail label="On site">{formatDuration(minutesOnSite)}</Detail>
          <Detail label="Invoiced">{job.invoiced ? 'Yes' : 'Not yet'}</Detail>
        </dl>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">This visit</h3>
            <Button variant="ghost" size="sm" onClick={() => setEditing((open) => !open)}>
              {editing ? 'Done' : 'Change'}
            </Button>
          </div>
          {editing ? (
            <JobEditFields
              job={job}
              pending={pending}
              onSave={(values) => act(() => updateJobAction(values))}
            />
          ) : (
            <p className="text-sm text-grey-500">
              {formatDate(job.scheduledDate)} · {formatMoney(job.price)} ·{' '}
              {formatDuration(job.durationMins)}
            </p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Who is doing it</h3>
          <Select
            aria-label="Assign this job"
            defaultValue={job.assignedTo ?? 'unassigned'}
            disabled={pending}
            onChange={(event) =>
              act(() => assignJobAction({ jobId: job.id, assigned_to: event.target.value }))
            }
          >
            <option value="unassigned">Not assigned</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
              </option>
            ))}
          </Select>
        </div>

        {job.status !== 'completed' && job.status !== 'cancelled' ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold">If it gets missed, why?</h3>
            <Select
              aria-label="Reason for missing this job"
              value={skipReason}
              onChange={(event) => setSkipReason(event.target.value as SkipReason)}
            >
              {Object.entries(SKIP_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Photos</h3>
          <PhotoGrid photos={job.photos} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Notes</h3>
          {job.notes ? (
            <p className="mb-2 rounded-btn bg-grey-50 px-3 py-2.5 text-sm text-grey-900">
              {job.notes}
            </p>
          ) : null}
          <Textarea
            aria-label="Add a note"
            placeholder="Anything the office should know…"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button
            variant="secondary"
            className="mt-2"
            disabled={pending || note.trim() === ''}
            onClick={() =>
              act(async () => {
                const result = await saveJobNoteAction({ jobId: job.id, notes: note });
                if (result.ok) setNote('');
                return result;
              })
            }
          >
            Save note
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-grey-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-grey-900">{children}</dd>
    </div>
  );
}

/** The small edit form behind "Change" — date, price and how long it takes. */
function JobEditFields({
  job,
  pending,
  onSave,
}: {
  job: JobView;
  pending: boolean;
  onSave: (values: {
    jobId: string;
    scheduled_date: string;
    price: number;
    duration_mins: number;
  }) => void;
}) {
  const [date, setDate] = useState(job.scheduledDate);
  const [price, setPrice] = useState(String(job.price));
  const [duration, setDuration] = useState(String(job.durationMins));

  return (
    <div className="space-y-3 rounded-card border border-grey-200 p-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="job-date">
          <Input
            id="job-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label="Price" htmlFor="job-price">
          <Input
            id="job-price"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </Field>
      </div>
      <Field label="How long it takes" htmlFor="job-duration" hint="Minutes.">
        <Input
          id="job-duration"
          type="number"
          min="5"
          max="600"
          step="5"
          inputMode="numeric"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
      </Field>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          onSave({
            jobId: job.id,
            scheduled_date: date,
            price: Number(price),
            duration_mins: Number(duration),
          })
        }
      >
        Save this visit
      </Button>
    </div>
  );
}
