import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { JobStatus } from '@/lib/types/database';

/**
 * The office's view of a job: everything the Today list, the schedule and the
 * round map need, in one round trip.
 */
// prettier-ignore — PostgREST needs one string literal here, not a concatenation:
// TypeScript widens `'a' + 'b'` to `string`, and the select parser only
// resolves embedded relations from a literal type.
// prettier-ignore
export const JOB_SELECT = 'id, scheduled_date, sequence, status, price, duration_mins, notes, skip_reason, invoiced, started_at, completed_at, customer_id, property_id, template_id, assigned_to, customer:customers(id, name, phone, address_line1, address_line2, city, postcode, lat, lng, access_notes, gate_code, dog_on_site), property:properties(id, label, address_line1, postcode, lat, lng), assignee:profiles!jobs_assigned_to_fkey(id, full_name), photos:job_photos(id, kind, storage_path, taken_at)';

export type AdminJob = Awaited<ReturnType<typeof getJobsForRange>>[number];

export async function getJobsForRange(from: string, to: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .gte('scheduled_date', from)
    .lte('scheduled_date', to)
    .order('scheduled_date', { ascending: true })
    .order('sequence', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getJobsForDay(date: string) {
  return getJobsForRange(date, date);
}

export async function getJob(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from('jobs').select(JOB_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCustomerJobHistory(customerId: string, limit = 60) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('customer_id', customerId)
    .order('scheduled_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface JobCounts {
  scheduled: number;
  in_progress: number;
  completed: number;
  skipped: number;
  cancelled: number;
  total: number;
  value: number;
}

export function countJobs(jobs: { status: JobStatus; price: number }[]): JobCounts {
  const counts: JobCounts = {
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    skipped: 0,
    cancelled: 0,
    total: jobs.length,
    value: 0,
  };

  for (const job of jobs) {
    counts[job.status] += 1;
    if (job.status === 'completed') counts.value += Number(job.price);
  }
  return counts;
}

/** The day's work grouped by whoever is doing it, unassigned last. */
export function groupByCleaner<T extends { assignedTo: string | null; sequence: number }>(
  jobs: T[],
  staff: { id: string; full_name: string }[],
) {
  const byId = new Map(staff.map((person) => [person.id, person.full_name]));
  const groups = new Map<string | null, { name: string; jobs: T[] }>();

  for (const job of jobs) {
    const key = job.assignedTo;
    if (!groups.has(key)) {
      groups.set(key, { name: key ? (byId.get(key) ?? 'Someone else') : 'Not assigned', jobs: [] });
    }
    groups.get(key)!.jobs.push(job);
  }

  for (const group of groups.values()) {
    group.jobs.sort((a, b) => a.sequence - b.sequence);
  }

  return [...groups.entries()]
    .map(([id, group]) => ({ id, ...group }))
    .sort((a, b) => {
      if (a.id === null) return 1;
      if (b.id === null) return -1;
      return a.name.localeCompare(b.name);
    });
}
