import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getStaff() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone, is_active, created_at')
    .order('full_name');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCleaners() {
  const staff = await getStaff();
  return staff.filter((person) => person.is_active);
}

export async function getCompany() {
  const supabase = createClient();
  const { data, error } = await supabase.from('companies').select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getPendingInvites() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('invites')
    .select('id, email, role, token, expires_at, created_at')
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface StaffStats {
  completed: number;
  skipped: number;
  avgMinutes: number;
  photoCompliance: number;
}

/**
 * Per-cleaner numbers for the Staff page: how much they got through, how long
 * a job takes them, and how often the photo proof actually got taken.
 */
export async function getStaffStats(from: string, to: string): Promise<Map<string, StaffStats>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('jobs')
    .select('id, assigned_to, status, started_at, completed_at, photos:job_photos(kind)')
    .gte('scheduled_date', from)
    .lte('scheduled_date', to);

  if (error) throw new Error(error.message);

  const totals = new Map<
    string,
    { completed: number; skipped: number; minutes: number[]; withProof: number }
  >();

  for (const job of data ?? []) {
    if (!job.assigned_to) continue;
    if (!totals.has(job.assigned_to)) {
      totals.set(job.assigned_to, { completed: 0, skipped: 0, minutes: [], withProof: 0 });
    }
    const entry = totals.get(job.assigned_to)!;

    if (job.status === 'skipped') entry.skipped += 1;
    if (job.status !== 'completed') continue;

    entry.completed += 1;

    if (job.started_at && job.completed_at) {
      const minutes =
        (new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 60000;
      if (minutes > 0 && minutes < 8 * 60) entry.minutes.push(minutes);
    }

    const kinds = new Set((job.photos ?? []).map((photo) => photo.kind));
    if (kinds.has('before') && kinds.has('after')) entry.withProof += 1;
  }

  const stats = new Map<string, StaffStats>();
  for (const [id, entry] of totals) {
    stats.set(id, {
      completed: entry.completed,
      skipped: entry.skipped,
      avgMinutes:
        entry.minutes.length > 0
          ? Math.round(entry.minutes.reduce((sum, value) => sum + value, 0) / entry.minutes.length)
          : 0,
      photoCompliance:
        entry.completed > 0 ? Math.round((entry.withProof / entry.completed) * 100) : 100,
    });
  }

  return stats;
}
