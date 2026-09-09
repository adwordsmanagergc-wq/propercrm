import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { readPublicEnv } from '@/lib/env';
import type { Database } from '@/lib/types/database';

/**
 * Refreshes the auth cookie on every request and gates /app behind a session.
 * Role checks happen in the layouts and Server Actions — this is only the
 * signed-in / signed-out gate.
 *
 * Nothing in here is allowed to throw. Middleware runs before every route, so
 * an unhandled error here is a 500 on the whole domain — the marketing page
 * included. When Supabase is missing or unreachable the request is waved
 * through instead: the gate is a convenience, and every /app page re-checks
 * the session server-side anyway, so waving one through cannot leak anything.
 */
/** Screens that cannot do anything useful without Supabase behind them. */
const NEEDS_SUPABASE = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
  '/welcome',
];

export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const config = readPublicEnv();

  if (!config.ok) {
    // The deploy is missing its Supabase variables. Say so on the screens that
    // need them, and leave the public pages working.
    if (pathname.startsWith('/app') || NEEDS_SUPABASE.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/setup-required';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  if (pathname === '/setup-required') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient<Database>(
      config.env.NEXT_PUBLIC_SUPABASE_URL,
      config.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (toSet) => {
            toSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && pathname.startsWith('/app')) {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }

    if (user && (pathname === '/sign-in' || pathname === '/sign-up')) {
      const url = request.nextUrl.clone();
      url.pathname = '/app';
      url.search = '';
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    // Supabase unreachable, or a bad key. Let it through — the page will
    // redirect to sign-in itself if there is no session.
    console.error('[middleware] session refresh failed', error);
    return NextResponse.next({ request });
  }
}
