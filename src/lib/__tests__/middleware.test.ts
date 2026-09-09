import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * The middleware runs before every route, so anything it throws is a 500 on
 * the whole domain — marketing page included. These tests exist because that
 * is exactly what a missing Supabase URL used to do in production.
 */
const ORIGINAL = { ...process.env };

function request(path: string) {
  return new NextRequest(new URL(path, 'https://propercrm.test'));
}

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('middleware with no Supabase configuration', () => {
  it('keeps the marketing page up instead of crashing', async () => {
    const response = await updateSession(request('/'));
    expect(response.status).toBe(200);
  });

  it('sends the app to the setup page rather than a 500', async () => {
    const response = await updateSession(request('/app/customers'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://propercrm.test/setup-required');
  });

  it('does the same for every screen that needs a database', async () => {
    const paths = [
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/reset-password',
      '/accept-invite',
      '/welcome',
    ];
    for (const path of paths) {
      const response = await updateSession(request(path));
      expect(response.headers.get('location')).toBe('https://propercrm.test/setup-required');
    }
  });

  it('lets the setup page itself render', async () => {
    const response = await updateSession(request('/setup-required'));
    expect(response.status).toBe(200);
  });

  it('never throws, whatever the path', async () => {
    const paths = ['/', '/sign-in', '/app', '/app/jobs/abc', '/print/invoices/x', '/anything'];
    for (const path of paths) {
      await expect(updateSession(request(path))).resolves.toBeDefined();
    }
  });
});

describe('middleware with a malformed Supabase URL', () => {
  it('treats it as unconfigured rather than crashing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'abcdefgh.supabase.co'; // no scheme
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(40);

    const response = await updateSession(request('/'));
    expect(response.status).toBe(200);
  });
});

describe('middleware when Supabase is configured but unreachable', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://unreachable.invalid';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(40);
  });

  it('degrades to the sign-in screen instead of taking the site down', async () => {
    // getUser() reports "no user" rather than throwing when it cannot reach
    // Supabase, so this lands on the ordinary signed-out path.
    const response = await updateSession(request('/app'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://propercrm.test/sign-in?next=%2Fapp');
  });

  it('leaves the marketing page alone', async () => {
    const response = await updateSession(request('/'));
    expect(response.status).toBe(200);
  });

  it('stops sending people to the setup page once the config is there', async () => {
    const response = await updateSession(request('/setup-required'));
    expect(response.headers.get('location')).toBe('https://propercrm.test/');
  });
});

describe('the setup page diagnostics', () => {
  it('names the variable that is missing, not just "Required"', async () => {
    const { readPublicEnv } = await import('@/lib/env');
    const result = readPublicEnv();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      'NEXT_PUBLIC_SUPABASE_URL is not set',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set',
    ]);
  });

  it('explains a URL that is missing its scheme', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'abcdefgh.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(40);

    const { readPublicEnv } = await import('@/lib/env');
    const result = readPublicEnv();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toContain('must be a full URL');
  });
});
