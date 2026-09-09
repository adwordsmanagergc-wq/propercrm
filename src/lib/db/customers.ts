import 'server-only';
import { createClient } from '@/lib/supabase/server';

// prettier-ignore
const CUSTOMER_SELECT = 'id, name, phone, email, address_line1, address_line2, city, postcode, lat, lng, access_notes, gate_code, dog_on_site, preferred_contact, is_active, notes, created_at';

export async function getCustomers() {
  const supabase = createClient();
  const { data, error } = await supabase.from('customers').select(CUSTOMER_SELECT).order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCustomer(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('customers')
    .select(CUSTOMER_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getProperties(customerId?: string) {
  const supabase = createClient();
  let query = supabase.from('properties').select('*').order('label');
  if (customerId) query = query.eq('customer_id', customerId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface CustomerSummary {
  nextVisit: string | null;
  frequency: string | null;
  balance: number;
  lifetimeValue: number;
  visits: number;
}

/**
 * The numbers the customer table shows: when they are next due, how often,
 * what they owe and what they have been worth. One query each rather than one
 * per customer.
 */
export async function getCustomerSummaries(today: string): Promise<Map<string, CustomerSummary>> {
  const supabase = createClient();

  const [upcoming, rounds, balances, completed] = await Promise.all([
    supabase
      .from('jobs')
      .select('customer_id, scheduled_date')
      .gte('scheduled_date', today)
      .eq('status', 'scheduled')
      .order('scheduled_date'),
    supabase.from('job_templates').select('customer_id, frequency').eq('is_active', true),
    supabase.rpc('customer_balances'),
    supabase.from('jobs').select('customer_id').eq('status', 'completed'),
  ]);

  const summaries = new Map<string, CustomerSummary>();
  const ensure = (id: string) => {
    if (!summaries.has(id)) {
      summaries.set(id, {
        nextVisit: null,
        frequency: null,
        balance: 0,
        lifetimeValue: 0,
        visits: 0,
      });
    }
    return summaries.get(id)!;
  };

  for (const job of upcoming.data ?? []) {
    const summary = ensure(job.customer_id);
    if (!summary.nextVisit) summary.nextVisit = job.scheduled_date;
  }
  for (const round of rounds.data ?? []) {
    const summary = ensure(round.customer_id);
    if (!summary.frequency) summary.frequency = round.frequency;
  }
  for (const row of balances.data ?? []) {
    const summary = ensure(row.customer_id);
    summary.balance = Number(row.balance);
    summary.lifetimeValue = Number(row.lifetime_value);
  }
  for (const job of completed.data ?? []) {
    ensure(job.customer_id).visits += 1;
  }

  return summaries;
}

export async function getRounds(customerId?: string) {
  const supabase = createClient();
  let query = supabase
    .from('job_templates')
    .select(
      'id, price, duration_mins, frequency, anchor_date, is_active, instructions, customer_id, property_id, assigned_cleaner, customer:customers(id, name, address_line1, postcode), property:properties(id, label), cleaner:profiles!job_templates_assigned_cleaner_fkey(id, full_name)',
    )
    .order('is_active', { ascending: false });

  if (customerId) query = query.eq('customer_id', customerId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRound(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('job_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
