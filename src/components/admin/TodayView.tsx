import { LiveJobs } from '@/components/admin/LiveJobs';
import { TodayBoard } from '@/components/admin/TodayBoard';
import { ButtonLink } from '@/components/ui/Button';
import { StatTile } from '@/components/ui/Card';
import type { Viewer } from '@/lib/auth';
import { countJobs, getJobsForDay, groupByCleaner } from '@/lib/db/jobs';
import { signPhotoUrls } from '@/lib/db/photos';
import { getCleaners } from '@/lib/db/staff';
import { photoPaths, toJobView } from '@/lib/db/views';
import { formatShortDate, todayInTimezone } from '@/lib/format';
import { formatMoney } from '@/lib/money';

export async function TodayView({ viewer }: { viewer: Viewer }) {
  const today = todayInTimezone(viewer.company.timezone);
  const [jobs, staff] = await Promise.all([getJobsForDay(today), getCleaners()]);
  const signed = await signPhotoUrls(photoPaths(jobs));

  const views = jobs.map((job) => toJobView(job, signed));
  const counts = countJobs(views);
  const groups = groupByCleaner(views, staff);

  return (
    <div className="space-y-5">
      <LiveJobs companyId={viewer.company.id} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Today</h1>
          <p className="text-grey-500">{formatShortDate(today)}</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/app/map" variant="secondary" size="sm">
            Round map
          </ButtonLink>
          <ButtonLink href="/app/schedule" size="sm">
            Schedule
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="To do" value={counts.scheduled} />
        <StatTile label="On site now" value={counts.in_progress} tone="blue" />
        <StatTile
          label="Done"
          value={counts.completed}
          tone="success"
          hint={counts.completed > 0 ? `${formatMoney(counts.value)} earned` : undefined}
        />
        <StatTile
          label="Missed"
          value={counts.skipped}
          tone={counts.skipped ? 'danger' : 'default'}
        />
      </div>

      <TodayBoard groups={groups} staff={staff.map(({ id, full_name }) => ({ id, full_name }))} />
    </div>
  );
}
