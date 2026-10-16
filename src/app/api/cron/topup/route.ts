import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Nightly housekeeping, run by Vercel Cron (see vercel.json):
 *   • tops every active round up to eight weeks ahead, so the diary is never
 *     empty even for a company whose cleaners have not finished a job in weeks
 *   • flips anything sent and past its due date to overdue
 *   • expires quotes that were never answered
 *
 * Runs as the service role, so it must be behind the shared secret.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const [topup, overdue, expired] = await Promise.all([
    supabase.rpc('topup_all_schedules', { p_weeks: 8 }),
    supabase.rpc('mark_overdue_invoices'),
    supabase.rpc('expire_quotes'),
  ]);

  if (topup.error || overdue.error || expired.error) {
    return NextResponse.json(
      { error: topup.error?.message ?? overdue.error?.message ?? expired.error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    jobsCreated: topup.data ?? 0,
    invoicesMarkedOverdue: overdue.data ?? 0,
    quotesExpired: expired.data ?? 0,
  });
}
