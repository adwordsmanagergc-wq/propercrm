import { MyDayList } from '@/components/cleaner/MyDayList';
import type { Viewer } from '@/lib/auth';
import { getMyJobs } from '@/lib/db/myjobs';
import { formatShortDate, todayInTimezone } from '@/lib/format';

export async function MyDay({ viewer }: { viewer: Viewer }) {
  const today = todayInTimezone(viewer.company.timezone);
  const jobs = await getMyJobs(today, today);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">My day</h1>
      <p className="mb-4 text-grey-500">{formatShortDate(today)}</p>
      <MyDayList jobs={jobs} date={today} />
    </div>
  );
}
