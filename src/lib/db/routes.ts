import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { planDay, type DayStop } from '@/lib/route';
import type { Database, JobStatus } from '@/lib/types/database';

type Client = SupabaseClient<Database>;
type LatLng = { lat: number; lng: number };

const coords = (lat: number | null | undefined, lng: number | null | undefined) =>
  typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;

/**
 * Where a cleaner sets off: their own start address if the office has set
 * one, otherwise the company yard.
 */
export function startFor(
  profile: { start_lat: number | null; start_lng: number | null } | null | undefined,
  yard: LatLng | null,
): LatLng | null {
  return coords(profile?.start_lat, profile?.start_lng) ?? yard;
}

interface Stop extends DayStop {
  cleaner: string | null;
}

/**
 * Puts one day in driving order, cleaner by cleaner, each from their own
 * start point. Work already done keeps its place (see planDay).
 *
 * Works with either client: under a user's session RLS already confines it
 * to their company; the night run passes the service client and must name
 * the company, so the filter is applied explicitly either way.
 *
 * Returns how many jobs were placed.
 */
export async function planCompanyDay(
  supabase: Client,
  { companyId, date, cleanerId }: { companyId: string; date: string; cleanerId?: string | null },
): Promise<number> {
  let jobsQuery = supabase
    .from('jobs')
    .select(
      'id, status, sequence, assigned_to, customer:customers(lat, lng), property:properties(lat, lng)',
    )
    .eq('company_id', companyId)
    .eq('scheduled_date', date)
    .neq('status', 'cancelled')
    .order('sequence');
  if (cleanerId) jobsQuery = jobsQuery.eq('assigned_to', cleanerId);

  const [jobs, company, people] = await Promise.all([
    jobsQuery,
    supabase.from('companies').select('start_lat, start_lng').eq('id', companyId).maybeSingle(),
    supabase.from('profiles').select('id, start_lat, start_lng').eq('company_id', companyId),
  ]);
  if (jobs.error) throw new Error(jobs.error.message);
  if (people.error) throw new Error(people.error.message);

  const yard = coords(company.data?.start_lat, company.data?.start_lng);
  const profiles = new Map((people.data ?? []).map((person) => [person.id, person]));

  const groups = new Map<string | null, Stop[]>();
  for (const job of jobs.data ?? []) {
    const stop: Stop = {
      id: job.id,
      status: job.status as JobStatus,
      cleaner: job.assigned_to,
      lat: job.property?.lat ?? job.customer?.lat ?? null,
      lng: job.property?.lng ?? job.customer?.lng ?? null,
    };
    const group = groups.get(job.assigned_to) ?? [];
    group.push(stop);
    groups.set(job.assigned_to, group);
  }

  const writes: PromiseLike<{ error: { message: string } | null }>[] = [];
  let placed = 0;
  for (const [cleaner, stops] of groups) {
    const start = cleaner ? startFor(profiles.get(cleaner), yard) : yard;
    planDay(stops, start).forEach((stop, index) => {
      writes.push(
        supabase
          .from('jobs')
          .update({ sequence: index + 1 })
          .eq('id', stop.id),
      );
      placed += 1;
    });
  }

  const results = await Promise.all(writes);
  const failed = results.find((result) => result.error)?.error;
  if (failed) throw new Error(failed.message);
  return placed;
}
