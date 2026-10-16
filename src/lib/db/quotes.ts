import 'server-only';
import { createClient } from '@/lib/supabase/server';

// prettier-ignore
const QUOTE_LIST = 'id, number, status, contact_name, postcode, frequency, total, valid_until, sent_at, viewed_at, responded_at, created_at, customer_id';

export async function getQuotes() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('quotes')
    .select(QUOTE_LIST)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getQuote(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('quotes')
    .select(
      '*, lines:quote_lines(id, description, quantity, unit_price, position), customer:customers(id, name)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCustomerQuotes(customerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('quotes')
    .select(QUOTE_LIST)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
