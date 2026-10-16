import { NextResponse, type NextRequest } from 'next/server';
import { runDailyMessages } from '@/lib/messaging/daily';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * The evening customer messages (see vercel.json): tomorrow's visit
 * reminders, today's "job done" notes with photos, and overdue chasers.
 * Behind the same shared secret as the schedule top-up.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  }

  try {
    const result = await runDailyMessages();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Message run failed' },
      { status: 500 },
    );
  }
}
