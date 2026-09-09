import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { MyJobRow } from '@/lib/types/database';

/**
 * The cleaner's own work, read through public.my_jobs — a view that filters on
 * auth.uid() and hands back only the columns they need. No prices.
 */
export async function getMyJobs(from: string, to: string): Promise<MyJobRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('my_jobs')
    .select('*')
    .gte('scheduled_date', from)
    .lte('scheduled_date', to)
    .order('scheduled_date')
    .order('sequence');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMyJob(id: string): Promise<MyJobRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('my_jobs').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getMyStats() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('my_stats');
  if (error) throw new Error(error.message);
  return (
    data?.[0] ?? {
      completed_this_week: 0,
      skipped_this_week: 0,
      avg_minutes: 0,
      photo_compliance: 100,
    }
  );
}
