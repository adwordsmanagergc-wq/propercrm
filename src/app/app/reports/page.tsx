import type { Metadata } from 'next';
import Link from 'next/link';
import {
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  endOfMonth,
} from 'date-fns';
import { MonthBars } from '@/components/admin/MonthBars';
import { Card, CardBody, CardHeader, StatTile } from '@/components/ui/Card';
import { SKIP_REASON_LABELS } from '@/components/ui/Pill';
import { requireStaff } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { formatDate, formatDuration, todayInTimezone } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { createClient } from '@/lib/supabase/server';
import type { SkipReason } from '@/lib/types/database';

export const metadata: Metadata = { title: 'Reports' };

interface Report {
  work: { completed: number; skipped: number; value_done: number; value_missed: number };
  skip_reasons: { reason: SkipReason; count: number }[];
  money: {
    invoiced: number;
    collected: number;
    collected_by_card: number;
    owed_now: number;
    uninvoiced_work: number;
  };
  cleaners: {
    id: string;
    name: string;
    completed: number;
    skipped: number;
    value_done: number;
    avg_minutes: number;
    photo_proof_pct: number;
  }[];
  monthly: { month: string; done: number; collected: number }[];
  book: {
    active_customers: number;
    new_customers: number;
    active_rounds: number;
    avg_round_price: number;
    annual_round_value: number;
  };
  quotes: {
    sent: number;
    accepted: number;
    declined: number;
    open: number;
    accepted_annual_value: number;
  };
  messages: { sent: number; failed: number };
}

const RANGES = [
  { key: 'month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: '90', label: 'Last 90 days' },
  { key: 'year', label: 'This year' },
] as const;

function rangeFor(key: string, today: Date) {
  switch (key) {
    case 'last-month': {
      const last = subMonths(today, 1);
      return { from: startOfMonth(last), to: endOfMonth(last) };
    }
    case '90':
      return { from: subDays(today, 89), to: today };
    case 'year':
      return { from: startOfYear(today), to: today };
    default:
      return { from: startOfMonth(today), to: today };
  }
}

export default async function ReportsPage({ searchParams }: { searchParams: { range?: string } }) {
  const viewer = await requireStaff();
  const today = parseISO(todayInTimezone(viewer.company.timezone));
  const rangeKey = RANGES.some((r) => r.key === searchParams.range) ? searchParams.range! : 'month';
  const { from, to } = rangeFor(rangeKey, today);
  const iso = (d: Date) => format(d, 'yyyy-MM-dd');

  const { data, error } = await createClient().rpc('report_summary', {
    p_from: iso(from),
    p_to: iso(to),
  });
  if (error) throw new Error(error.message);
  const report = data as Report;

  const n = (v: number | string) => Number(v);
  const attempted = n(report.work.completed) + n(report.work.skipped);
  const completionRate = attempted
    ? Math.round((100 * n(report.work.completed)) / attempted)
    : null;
  const answered = n(report.quotes.accepted) + n(report.quotes.declined);
  const winRate = answered ? Math.round((100 * n(report.quotes.accepted)) / answered) : null;
  const months = report.monthly.map((m) => ({
    label: format(parseISO(`${m.month}-01`), 'MMM yyyy'),
    done: n(m.done),
    collected: n(m.collected),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
          <p className="text-grey-500">
            {formatDate(from)} to {formatDate(to)}
          </p>
        </div>
        <nav aria-label="Date range" className="flex flex-wrap gap-2">
          {RANGES.map((range) => (
            <Link
              key={range.key}
              href={`/app/reports?range=${range.key}`}
              aria-current={range.key === rangeKey ? 'page' : undefined}
              className={cn(
                'rounded-pill border px-3 py-1.5 text-sm font-semibold',
                range.key === rangeKey
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-grey-200 bg-white text-grey-500 hover:text-blue-700',
              )}
            >
              {range.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Work done"
          value={formatMoney(n(report.work.value_done))}
          tone="blue"
          hint={`${report.work.completed} cleans`}
        />
        <StatTile
          label="Money in"
          value={formatMoney(n(report.money.collected))}
          tone="success"
          hint={
            n(report.money.collected_by_card) > 0
              ? `${formatMoney(n(report.money.collected_by_card))} by card`
              : undefined
          }
        />
        <StatTile
          label="Owed to you now"
          value={formatMoney(n(report.money.owed_now))}
          tone={n(report.money.owed_now) > 0 ? 'warning' : 'default'}
        />
        <StatTile
          label="Done but not invoiced"
          value={formatMoney(n(report.money.uninvoiced_work))}
          tone={n(report.money.uninvoiced_work) > 0 ? 'danger' : 'default'}
          hint="Raise these from Invoices."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardBody>
            <MonthBars
              title="Work done each month"
              months={months.map((m) => ({ label: m.label, value: m.done }))}
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <MonthBars
              title="Money in each month"
              months={months.map((m) => ({ label: m.label, value: m.collected }))}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Round book, per year"
          value={formatMoney(n(report.book.annual_round_value))}
          hint={`${report.book.active_rounds} rounds, average ${formatMoney(n(report.book.avg_round_price))}`}
        />
        <StatTile
          label="New customers"
          value={report.book.new_customers}
          hint={`${report.book.active_customers} active in all`}
        />
        <StatTile
          label="Quotes won"
          value={winRate === null ? '—' : `${winRate}%`}
          tone="success"
          hint={`${report.quotes.accepted} accepted, ${report.quotes.open} still open`}
        />
        <StatTile
          label="Cleans completed"
          value={completionRate === null ? '—' : `${completionRate}%`}
          tone={completionRate !== null && completionRate < 90 ? 'warning' : 'default'}
          hint={
            n(report.work.value_missed) > 0
              ? `${formatMoney(n(report.work.value_missed))} missed`
              : undefined
          }
        />
      </div>

      <Card>
        <CardHeader title="By cleaner" subtitle="Work done, speed and photo proof" />
        {report.cleaners.length === 0 ? (
          <CardBody>
            <p className="text-sm text-grey-500">No assigned work in this range.</p>
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-grey-200 text-xs uppercase tracking-wide text-grey-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Cleaner</th>
                  <th className="px-5 py-3 text-right font-semibold">Done</th>
                  <th className="px-5 py-3 text-right font-semibold">Missed</th>
                  <th className="px-5 py-3 text-right font-semibold">Value</th>
                  <th className="px-5 py-3 text-right font-semibold">Avg time</th>
                  <th className="px-5 py-3 text-right font-semibold">Photo proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-200">
                {report.cleaners.map((cleaner) => (
                  <tr key={cleaner.id}>
                    <td className="px-5 py-3 font-medium">{cleaner.name}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{cleaner.completed}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{cleaner.skipped}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {formatMoney(n(cleaner.value_done))}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {formatDuration(n(cleaner.avg_minutes))}
                    </td>
                    <td
                      className={cn(
                        'px-5 py-3 text-right tabular-nums',
                        n(cleaner.photo_proof_pct) < 90 ? 'text-warning' : 'text-success',
                      )}
                    >
                      {n(cleaner.photo_proof_pct)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Why cleans were missed" />
          <CardBody>
            {report.skip_reasons.length === 0 ? (
              <p className="text-sm text-grey-500">Nothing missed. Nice.</p>
            ) : (
              <ul className="space-y-2">
                {report.skip_reasons.map((row) => (
                  <li key={row.reason ?? 'none'} className="flex justify-between gap-3 text-sm">
                    <span>{row.reason ? SKIP_REASON_LABELS[row.reason] : 'No reason given'}</span>
                    <span className="font-semibold tabular-nums">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Customer messages" />
          <CardBody className="space-y-2 text-sm">
            <p className="flex justify-between">
              <span>Sent</span>
              <span className="font-semibold tabular-nums">{report.messages.sent}</span>
            </p>
            <p className="flex justify-between">
              <span>Failed</span>
              <span className="font-semibold tabular-nums">{report.messages.failed}</span>
            </p>
            <p className="flex justify-between">
              <span>Invoiced in range</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(n(report.money.invoiced))}
              </span>
            </p>
            <p className="flex justify-between">
              <span>Won from quotes, per year</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(n(report.quotes.accepted_annual_value))}
              </span>
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
