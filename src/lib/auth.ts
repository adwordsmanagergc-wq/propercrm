import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { MyCompanyRow, ProfileRow } from '@/lib/types/database';

export interface Viewer {
  userId: string;
  email: string;
  profile: ProfileRow;
  company: MyCompanyRow;
  isStaff: boolean;
  isOwner: boolean;
  isCleaner: boolean;
}

/**
 * Deduplicated for the render pass, so a page and its layout asking who the
 * viewer is costs one round trip, not two.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: company }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('my_company').select('*').maybeSingle(),
  ]);

  if (!profile || !company) return null;

  return {
    userId: user.id,
    email: user.email ?? '',
    profile,
    company,
    isStaff: profile.role === 'owner' || profile.role === 'manager',
    isOwner: profile.role === 'owner',
    isCleaner: profile.role === 'cleaner',
  };
});

/**
 * Signed in and attached to a company, or you go back to the front door.
 * A signed-in user with no company yet lands on /welcome rather than being
 * bounced to /sign-in, which the middleware would send straight back here.
 */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer) return viewer;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? '/welcome' : '/sign-in');
}

export async function requireStaff(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) redirect('/app');
  return viewer;
}

export async function requireOwner(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isOwner) redirect('/app');
  return viewer;
}

/**
 * Server Action guard. Actions never trust the form — they re-check the
 * caller's role before writing anything.
 */
export class NotAllowedError extends Error {
  constructor(message = 'You do not have permission to do that') {
    super(message);
    this.name = 'NotAllowedError';
  }
}

export async function assertStaff(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new NotAllowedError('Please sign in again');
  if (!viewer.isStaff) throw new NotAllowedError();
  return viewer;
}

export async function assertOwner(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new NotAllowedError('Please sign in again');
  if (!viewer.isOwner) throw new NotAllowedError('Only the owner can do that');
  return viewer;
}

export async function assertViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new NotAllowedError('Please sign in again');
  return viewer;
}
