import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { JobFlow } from '@/components/cleaner/JobFlow';
import { requireViewer } from '@/lib/auth';
import { getMyJob } from '@/lib/db/myjobs';
import { formatRelativeDay } from '@/lib/format';

export const metadata: Metadata = { title: 'Job' };

export default async function JobPage({ params }: { params: { id: string } }) {
  const viewer = await requireViewer();
  // The office works jobs from the Today drawer, not this screen.
  if (!viewer.isCleaner) redirect('/app');

  const job = await getMyJob(params.id);
  if (!job) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/app" className="text-base font-semibold text-blue-700">
          ← My day
        </Link>
        <span className="text-sm text-grey-500">{formatRelativeDay(job.scheduled_date)}</span>
      </div>
      <JobFlow job={job} />
    </div>
  );
}
