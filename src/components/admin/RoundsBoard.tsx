'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteRoundAction, topUpScheduleAction } from '@/app/actions/rounds';
import { RoundForm, type RoundFormValues } from '@/components/admin/RoundForm';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';
import { Notice } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/States';
import { RepeatIcon } from '@/components/ui/Icons';
import { formatShortDate } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { FREQUENCY_LABELS } from '@/lib/recurrence';

export interface RoundRowView extends RoundFormValues {
  customerName: string;
  customerPostcode: string;
  cleanerName: string | null;
  nextVisit: string | null;
}

interface Option {
  id: string;
  label: string;
}

export function RoundsBoard({
  rounds,
  customers,
  cleaners,
  properties,
  workingDays,
  today,
  openForCustomer,
}: {
  rounds: RoundRowView[];
  customers: Option[];
  cleaners: Option[];
  properties: { id: string; customerId: string; label: string }[];
  workingDays: number[];
  today: string;
  openForCustomer?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<RoundFormValues | null>(
    openForCustomer
      ? {
          customer_id: openForCustomer,
          property_id: null,
          price: 0,
          duration_mins: 30,
          frequency: '4weekly',
          anchor_date: today,
          assigned_cleaner: null,
          is_active: true,
          instructions: null,
        }
      : null,
  );
  const [open, setOpen] = useState(Boolean(openForCustomer));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startNew() {
    setEditing(null);
    setOpen(true);
  }

  function edit(round: RoundRowView) {
    setEditing(round);
    setOpen(true);
  }

  const active = rounds.filter((round) => round.is_active);
  const stopped = rounds.filter((round) => !round.is_active);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Rounds</h1>
          <p className="text-grey-500">
            {active.length} running. Visits book themselves eight weeks ahead.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await topUpScheduleAction();
                setMessage(result.ok ? (result.message ?? 'Diary topped up') : result.error);
                router.refresh();
              })
            }
          >
            Top up the diary
          </Button>
          <Button onClick={startNew}>New round</Button>
        </div>
      </div>

      {message ? <Notice tone="success">{message}</Notice> : null}

      <Card>
        <CardHeader title="Running" subtitle={`${active.length} rounds`} />
        {active.length === 0 ? (
          <EmptyState
            icon={<RepeatIcon className="h-7 w-7" />}
            title="No rounds set up"
            description="A round is a customer, a price and how often you go. Set one up and the visits book themselves."
            action={<Button onClick={startNew}>New round</Button>}
          />
        ) : (
          <RoundList
            rounds={active}
            onEdit={edit}
            onStop={(id) =>
              startTransition(async () => {
                await deleteRoundAction({ roundId: id });
                router.refresh();
              })
            }
          />
        )}
      </Card>

      {stopped.length > 0 ? (
        <Card>
          <CardHeader title="Stopped" subtitle={`${stopped.length} rounds`} />
          <RoundList rounds={stopped} onEdit={edit} />
        </Card>
      ) : null}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing?.id ? 'Edit round' : 'New round'}
        subtitle="The dates below are exactly what will be booked in."
        width="max-w-xl"
      >
        <RoundForm
          key={editing?.id ?? editing?.customer_id ?? 'new'}
          round={editing ?? undefined}
          customers={customers}
          cleaners={cleaners}
          properties={properties}
          workingDays={workingDays}
          today={today}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Drawer>
    </>
  );
}

function RoundList({
  rounds,
  onEdit,
  onStop,
}: {
  rounds: RoundRowView[];
  onEdit: (round: RoundRowView) => void;
  onStop?: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-grey-200">
      {rounds.map((round) => (
        <li key={round.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <div className="min-w-48 flex-1">
            <Link
              href={`/app/customers/${round.customer_id}`}
              className="font-medium hover:text-blue-700"
            >
              {round.customerName}
            </Link>
            <p className="text-sm uppercase text-grey-500">{round.customerPostcode}</p>
          </div>

          <Pill tone="blue">{FREQUENCY_LABELS[round.frequency]}</Pill>

          <span className="w-28 text-sm text-grey-500">{round.cleanerName ?? 'Nobody yet'}</span>
          <span className="w-24 text-sm text-grey-500">
            {round.nextVisit ? formatShortDate(round.nextVisit) : 'Not booked'}
          </span>
          <span className="w-20 text-right font-semibold tabular-nums">
            {formatMoney(round.price)}
          </span>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onEdit(round)}>
              Edit
            </Button>
            {onStop && round.id ? (
              <Button variant="ghost" size="sm" onClick={() => onStop(round.id!)}>
                Stop
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
