import type { Metadata } from 'next';
import Link from 'next/link';
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { NewJobPanel } from '@/components/admin/NewJobPanel';
import { ScheduleBoard } from '@/components/admin/ScheduleBoard';
import { ButtonLink } from '@/components/ui/Button';
import { requireStaff } from '@/lib/auth';
import { getCustomers } from '@/lib/db/customers';
import { getJobsForRange } from '@/lib/db/jobs';
import { signPhotoUrls } from '@/lib/db/photos';
import { getCleaners } from '@/lib/db/staff';
import { photoPaths, toJobView } from '@/lib/db/views';
import { todayInTimezone } from '@/lib/format';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Schedule' };

const iso = (date: Date) => format(date, 'yyyy-MM-dd');

function rangeFor(view: 'week' | 'month', anchor: Date) {
  if (view === 'week') {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return { start, end: addDays(start, 6) };
  }
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const monthEnd = endOfMonth(anchor);
  const end = addDays(startOfWeek(monthEnd, { weekStartsOn: 1 }), 6);
  return { start, end };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { view?: string; date?: string };
}) {
  const viewer = await requireStaff();
  const today = todayInTimezone(viewer.company.timezone);

  const view = searchParams.view === 'month' ? 'month' : 'week';
  const anchor = searchParams.date?.match(/^\d{4}-\d{2}-\d{2}$/)
    ? parseISO(searchParams.date)
    : parseISO(today);

  const { start, end } = rangeFor(view, anchor);
  const days: string[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) days.push(iso(cursor));

  const [jobs, staff, customers] = await Promise.all([
    getJobsForRange(iso(start), iso(end)),
    getCleaners(),
    getCustomers(),
  ]);
  const signed = await signPhotoUrls(photoPaths(jobs));
  const views = jobs.map((job) => toJobView(job, signed));

  const previous = view === 'week' ? iso(addDays(anchor, -7)) : iso(addMonths(anchor, -1));
  const next = view === 'week' ? iso(addDays(anchor, 7)) : iso(addMonths(anchor, 1));

  const heading =
    view === 'week'
      ? `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
      : format(anchor, 'MMMM yyyy');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-grey-500">{heading}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NewJobPanel
            customers={customers
              .filter((customer) => customer.is_active)
              .map((customer) => ({
                id: customer.id,
                label: `${customer.name} — ${customer.address_line1}`,
              }))}
            cleaners={staff.map((person) => ({ id: person.id, label: person.full_name }))}
            defaultDate={iso(anchor)}
          />
          <div className="flex rounded-btn border border-grey-200 bg-white p-1">
            {(['week', 'month'] as const).map((option) => (
              <Link
                key={option}
                href={`/app/schedule?view=${option}&date=${iso(anchor)}`}
                className={cn(
                  'rounded-[6px] px-3 py-1.5 text-sm font-semibold capitalize transition-colors',
                  view === option ? 'bg-blue-500 text-white' : 'text-grey-500 hover:text-blue-700',
                )}
              >
                {option}
              </Link>
            ))}
          </div>
          <ButtonLink
            href={`/app/schedule?view=${view}&date=${previous}`}
            variant="secondary"
            size="sm"
          >
            ← Back
          </ButtonLink>
          <ButtonLink
            href={`/app/schedule?view=${view}&date=${today}`}
            variant="secondary"
            size="sm"
          >
            Today
          </ButtonLink>
          <ButtonLink
            href={`/app/schedule?view=${view}&date=${next}`}
            variant="secondary"
            size="sm"
          >
            Forward →
          </ButtonLink>
        </div>
      </div>

      <ScheduleBoard jobs={views} staff={staff} days={days} view={view} today={today} />

      <p className="text-sm text-grey-500">
        Drag a job to another day or another cleaner. Tap one to open it.
      </p>
    </div>
  );
}
