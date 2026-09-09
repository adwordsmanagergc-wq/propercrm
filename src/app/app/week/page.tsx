import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { JobCard } from '@/components/cleaner/JobCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { CalendarIcon } from '@/components/ui/Icons';
import { requireViewer } from '@/lib/auth';
import { getMyJobs } from '@/lib/db/myjobs';
import { addDaysISO, formatRelativeDay, todayInTimezone } from '@/lib/format';

export const metadata: Metadata = { title: 'This week' };

/** The cleaner's week. The office uses /app/schedule instead. */
export default async function WeekPage() {
  const viewer = await requireViewer();
  if (!viewer.isCleaner) redirect('/app/schedule');

  const today = todayInTimezone(viewer.company.timezone);
  const jobs = await getMyJobs(today, addDaysISO(today, 7));

  const byDate = new Map<string, typeof jobs>();
  for (const job of jobs) {
    if (!byDate.has(job.scheduled_date)) byDate.set(job.scheduled_date, []);
    byDate.get(job.scheduled_date)!.push(job);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">The week ahead</h1>

      {byDate.size === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarIcon className="h-7 w-7" />}
            title="Nothing booked in"
            description="You have no jobs over the next seven days. The office will add them as rounds come due."
          />
        </Card>
      ) : (
        [...byDate.entries()].map(([date, dayJobs]) => (
          <Card key={date}>
            <CardHeader
              title={formatRelativeDay(date)}
              subtitle={`${dayJobs.length} ${dayJobs.length === 1 ? 'job' : 'jobs'}`}
            />
            <ul className="space-y-3 p-4">
              {dayJobs.map((job, index) => (
                <JobCard key={job.id} job={job} index={index + 1} />
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
