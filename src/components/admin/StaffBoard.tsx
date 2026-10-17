'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { cancelInviteAction, inviteStaffAction, updateStaffAction } from '@/app/actions/staff';
import { StartPointForm } from '@/components/admin/StartPointForm';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { CopyButton } from '@/components/ui/CopyButton';
import { Field, Input, Notice, Select } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { EmptyState } from '@/components/ui/States';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/roles';
import { formatDate, formatDuration, initials } from '@/lib/format';
import type { UserRole } from '@/lib/types/database';

export interface StaffMember {
  id: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
  startAddress: string | null;
  startPostcode: string | null;
  startLocated: boolean;
  completed: number;
  skipped: number;
  avgMinutes: number;
  photoCompliance: number;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: UserRole;
  link: string;
  expiresAt: string;
}

export function StaffBoard({
  staff,
  invites,
  isOwner,
  viewerId,
}: {
  staff: StaffMember[];
  invites: PendingInvite[];
  isOwner: boolean;
  viewerId: string;
}) {
  const router = useRouter();
  const [state, action] = useFormState(inviteStaffAction, undefined);
  const [error, setError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<UserRole>('cleaner');
  const [pending, startTransition] = useTransition();

  function act(work: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) setError(result.error ?? 'That did not work');
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-5">
        {error ? <Notice tone="error">{error}</Notice> : null}

        <Card>
          <CardHeader title="Your team" subtitle="Numbers are for this week." />
          <ul className="divide-y divide-grey-200">
            {staff.map((person) => (
              <li key={person.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-blue-100 font-semibold text-blue-700">
                  {initials(person.fullName)}
                </span>

                <div className="min-w-44 flex-1">
                  <p className="font-medium">
                    {person.fullName}
                    {person.id === viewerId ? (
                      <span className="ml-2 text-sm text-grey-500">(you)</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-grey-500">{person.phone ?? 'No number on file'}</p>
                </div>

                <dl className="flex gap-5 text-sm">
                  <div>
                    <dt className="text-grey-500">Done</dt>
                    <dd className="font-semibold tabular-nums">{person.completed}</dd>
                  </div>
                  <div>
                    <dt className="text-grey-500">Missed</dt>
                    <dd className="font-semibold tabular-nums">{person.skipped}</dd>
                  </div>
                  <div>
                    <dt className="text-grey-500">Average</dt>
                    <dd className="font-semibold">{formatDuration(person.avgMinutes)}</dd>
                  </div>
                  <div>
                    <dt className="text-grey-500">Photos</dt>
                    <dd
                      className={
                        person.photoCompliance >= 95
                          ? 'font-semibold tabular-nums text-success'
                          : 'font-semibold tabular-nums text-warning'
                      }
                    >
                      {person.photoCompliance}%
                    </dd>
                  </div>
                </dl>

                <div className="flex items-center gap-2">
                  {isOwner && person.id !== viewerId ? (
                    <Select
                      aria-label={`Role for ${person.fullName}`}
                      className="h-9 w-32 py-0 text-sm"
                      defaultValue={person.role}
                      disabled={pending}
                      onChange={(event) =>
                        act(() =>
                          updateStaffAction({
                            profileId: person.id,
                            role: event.target.value,
                          }),
                        )
                      }
                    >
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="cleaner">Cleaner</option>
                    </Select>
                  ) : (
                    <Pill tone={person.role === 'cleaner' ? 'neutral' : 'blue'}>
                      {ROLE_LABELS[person.role]}
                    </Pill>
                  )}

                  {person.id !== viewerId ? (
                    <Button
                      variant={person.isActive ? 'ghost' : 'secondary'}
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        act(() =>
                          updateStaffAction({
                            profileId: person.id,
                            is_active: person.isActive ? 'false' : 'true',
                          }),
                        )
                      }
                    >
                      {person.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  ) : null}
                </div>

                {!person.isActive ? <Pill tone="danger">Deactivated</Pill> : null}

                {person.isActive ? (
                  <StartPointForm
                    profileId={person.id}
                    name={person.fullName.split(' ')[0] ?? person.fullName}
                    address={person.startAddress}
                    postcode={person.startPostcode}
                    located={person.startLocated}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Invites waiting" subtitle={`${invites.length} outstanding`} />
          {invites.length === 0 ? (
            <EmptyState
              title="Nobody waiting"
              description="Invite a cleaner and they will show here until they join."
            />
          ) : (
            <ul className="divide-y divide-grey-200">
              {invites.map((invite) => (
                <li key={invite.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-48 flex-1">
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-sm text-grey-500">
                      {ROLE_LABELS[invite.role]} · expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                  <CopyButton text={invite.link} label="Copy link" size="sm" />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => act(() => cancelInviteAction({ inviteId: invite.id }))}
                  >
                    Cancel
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader title="Invite someone" />
        <CardBody>
          <form action={action} className="space-y-4" noValidate>
            {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
            {state?.ok ? (
              <div className="space-y-2">
                <Notice tone="success">{state.message}</Notice>
                {!state.data.emailed ? (
                  <div className="space-y-2 rounded-btn border border-grey-200 p-3">
                    <p className="break-all text-xs text-grey-500">{state.data.link}</p>
                    <CopyButton text={state.data.link} label="Copy invite link" size="sm" />
                  </div>
                ) : null}
              </div>
            ) : null}

            <Field label="Their email" htmlFor="email">
              <Input id="email" name="email" type="email" inputMode="email" required />
            </Field>

            <Field label="Their name" htmlFor="fullName" hint="Optional.">
              <Input id="fullName" name="fullName" autoComplete="off" />
            </Field>

            <Field label="What can they do" htmlFor="role" hint={ROLE_DESCRIPTIONS[inviteRole]}>
              <Select
                id="role"
                name="role"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as UserRole)}
              >
                <option value="cleaner">Cleaner</option>
                <option value="manager">Manager</option>
                {isOwner ? <option value="owner">Owner</option> : null}
              </Select>
            </Field>

            <SubmitButton size="lg" className="w-full" pendingLabel="Sending…">
              Send invite
            </SubmitButton>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
