import { z } from 'zod';

// The messages are shown to whoever deployed the app, on /setup-required, so
// they name the variable rather than leaving Zod's bare "Required".
const publicEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ required_error: 'NEXT_PUBLIC_SUPABASE_URL is not set' })
    .url('NEXT_PUBLIC_SUPABASE_URL must be a full URL, e.g. https://abcdefgh.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ required_error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set' })
    .min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short to be a real key'),
});

export type PublicEnv = z.infer<typeof publicEnv>;

/**
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` when referenced literally,
 * so they are spelled out rather than looped over.
 *
 * Returns the problems instead of throwing, because the middleware runs on
 * every request: a config mistake must never be allowed to take the whole
 * site down. Use `getPublicEnv()` where throwing is safe.
 */
export function readPublicEnv(): { ok: true; env: PublicEnv } | { ok: false; problems: string[] } {
  const parsed = publicEnv.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (parsed.success) return { ok: true, env: parsed.data };
  return { ok: false, problems: parsed.error.issues.map((issue) => issue.message) };
}

export function getPublicEnv(): PublicEnv {
  const result = readPublicEnv();
  if (result.ok) return result.env;

  throw new Error(
    `Supabase is not configured. Copy .env.example to .env.local and fill it in.\n` +
      result.problems.map((problem) => `  • ${problem}`).join('\n'),
  );
}

export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return key;
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
