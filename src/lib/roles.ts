import type { UserRole } from '@/lib/types/database';

/**
 * Lives apart from lib/auth so client components can use it without dragging
 * the server-only Supabase client into the browser bundle.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  cleaner: 'Cleaner',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Everything, including billing and closing the account.',
  manager: 'Everything except billing and closing the account.',
  cleaner: 'Only their own jobs. Never prices, invoices or the customer list.',
};
