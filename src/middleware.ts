import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, the service worker and the manifest —
     * those must never be redirected or the PWA stops installing.
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
