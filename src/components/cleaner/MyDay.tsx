import { MyDayList } from '@/components/cleaner/MyDayList';
import type { Viewer } from '@/lib/auth';
import { getMyJobs } from '@/lib/db/myjobs';
import { addDaysISO, formatShortDate, todayInTimezone } from '@/lib/format';

export async function MyDay({ viewer }: { viewer: Viewer }) {
  const today = todayInTimezone(viewer.company.timezone);
  // The whole visible window, not just today: it is what gets cached on the
  // phone, and the week tab has to work with no signal too.
  const jobs = await getMyJobs(today, addDaysISO(today, 7));

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">My day</h1>
      <p className="mb-4 text-grey-500">{formatShortDate(today)}</p>
      <MyDayList jobs={jobs} date={today} />
    </div>
  );
}
