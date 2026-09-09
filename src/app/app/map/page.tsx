import type { Metadata } from 'next';
import Link from 'next/link';
import { MapBoard } from '@/components/admin/MapBoard';
import { requireStaff } from '@/lib/auth';
import { getJobsForDay } from '@/lib/db/jobs';
import { signPhotoUrls } from '@/lib/db/photos';
import { getCleaners, getCompany } from '@/lib/db/staff';
import { photoPaths, toJobView } from '@/lib/db/views';
import { todayInTimezone } from '@/lib/format';
import { cn } from '@/lib/cn';
import 'leaflet/dist/leaflet.css';

export const metadata: Metadata = { title: 'Round map' };

export default async function MapPage({
  searchParams,
}: {
  searchParams: { date?: string; cleaner?: string };
}) {
  const viewer = await requireStaff();
  const today = todayInTimezone(viewer.company.timezone);
  const date = searchParams.date?.match(/^\d{4}-\d{2}-\d{2}$/) ? searchParams.date : today;
  const cleanerId =
    searchParams.cleaner && searchParams.cleaner !== 'all' ? searchParams.cleaner : null;

  const [jobs, staff, company] = await Promise.all([
    getJobsForDay(date),
    getCleaners(),
    getCompany(),
  ]);

  const signed = await signPhotoUrls(photoPaths(jobs));
  const views = jobs
    .map((job) => toJobView(job, signed))
    .filter((job) => (cleanerId ? job.assignedTo === cleanerId : true))
    .filter((job) => job.status !== 'cancelled')
    .sort((a, b) => a.sequence - b.sequence);

  const start =
    typeof company?.start_lat === 'number' && typeof company?.start_lng === 'number'
      ? { lat: company.start_lat, lng: company.start_lng }
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Round map</h1>
          <p className="text-grey-500">
            {start
              ? 'Numbered in driving order from the yard.'
              : 'Set a start postcode in Settings to order the route from the yard.'}
          </p>
        </div>

        <form className="flex flex-wrap items-center gap-2" action="/app/map">
          <label className="sr-only" htmlFor="date">
            Day
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={date}
            className="h-11 rounded-btn border border-grey-200 bg-white px-3 text-base"
          />
          <label className="sr-only" htmlFor="cleaner">
            Cleaner
          </label>
          <select
            id="cleaner"
            name="cleaner"
            defaultValue={cleanerId ?? 'all'}
            className="h-11 rounded-btn border border-grey-200 bg-white px-3 text-base"
          >
            <option value="all">Everyone</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className={cn(
              'h-11 rounded-btn bg-blue-500 px-4 font-semibold text-white hover:bg-blue-600',
            )}
          >
            Show
          </button>
        </form>
      </div>

      <MapBoard jobs={views} staff={staff} date={date} cleanerId={cleanerId} start={start} />

      <p className="text-sm text-grey-500">
        <Link href="/app/schedule" className="font-semibold text-blue-700">
          Schedule
        </Link>{' '}
        if you want to move jobs between days.
      </p>
    </div>
  );
}
