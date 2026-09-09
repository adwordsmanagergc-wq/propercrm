'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';
import type { Database } from '@/lib/types/database';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** One browser client per tab — creating more breaks realtime subscriptions. */
export function createClient() {
  if (cached) return cached;
  const env = getPublicEnv();
  cached = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return cached;
}
