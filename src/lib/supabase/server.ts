import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getPublicEnv, getServiceRoleKey } from '@/lib/env';
import type { Database } from '@/lib/types/database';

/** Request-scoped client that carries the signed-in user's session. */
export function createClient() {
  const cookieStore = cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot set cookies. The middleware refreshes
            // the session on every request, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Bypasses RLS. Server-only, and only for work that has no user session:
 * sending invites and the scheduled schedule top-up.
 */
export function createServiceClient() {
  const env = getPublicEnv();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, getServiceRoleKey(), {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
