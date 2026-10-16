import 'server-only';
import { createClient } from '@/lib/supabase/server';

// prettier-ignore
const INVOICE_SELECT = 'id, number, issue_date, due_date, status, subtotal, total, paid_at, payment_method, notes, sent_at, customer_id, customer:customers(id, name, email, phone, address_line1, address_line2, city, postcode)';

export async function getInvoices(customerId?: string) {
  const supabase = createClient();
  let query = supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .order('issue_date', { ascending: false })
    .order('number', { ascending: false });

  if (customerId) query = query.eq('customer_id', customerId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getInvoice(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select(
      // prettier-ignore
      'id, number, issue_date, due_date, status, subtotal, total, paid_at, payment_method, notes, sent_at, pay_token, customer_id, customer:customers(id, name, email, phone, address_line1, address_line2, city, postcode), lines:invoice_lines(id, description, quantity, unit_price, position, job_id)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getAgedDebt() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('aged_debt');
  if (error) throw new Error(error.message);
  return (
    data?.[0] ?? {
      bucket_current: 0,
      bucket_0_30: 0,
      bucket_31_60: 0,
      bucket_60_plus: 0,
      total_owed: 0,
    }
  );
}

/** Completed jobs that have not been put on an invoice yet. */
export async function getUninvoicedJobs() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('id, scheduled_date, price, customer_id, customer:customers(id, name, postcode)')
    .eq('status', 'completed')
    .eq('invoiced', false)
    .order('customer_id')
    .order('scheduled_date');

  if (error) throw new Error(error.message);
  return data ?? [];
}
