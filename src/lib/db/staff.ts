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
