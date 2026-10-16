import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getMessageLog(customerId: string, limit = 15) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('message_log')
    .select('id, kind, channel, recipient, status, error, created_at, body')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getOpenRequests(customerId?: string) {
  const supabase = createClient();
  let query = supabase
    .from('customer_requests')
    .select(
      'id, kind, message, created_at, customer_id, job:jobs(id, scheduled_date), customer:customers(id, name, postcode)',
    )
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(50);
  if (customerId) query = query.eq('customer_id', customerId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
