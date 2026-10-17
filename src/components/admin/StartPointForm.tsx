'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { saveStaffStartAction } from '@/app/actions/staff';
import { Button } from '@/components/ui/Button';
import { Input, Notice } from '@/components/ui/Field';
import { PinIcon } from '@/components/ui/Icons';
import { SubmitButton } from '@/components/ui/SubmitButton';

/**
 * "Starts from" on each person's row. Their day is routed outwards from here,
 * so it is one tap to see and two fields to change.
 */
export function StartPointForm({
  profileId,
  name,
  address,
  postcode,
  located,
}: {
  profileId: string;
  name: string;
  address: string | null;
  postcode: string | null;
  located: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useFormState(saveStaffStartAction, undefined);

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  const summary = [address, postcode].filter(Boolean).join(', ');

  if (!editing) {
    return (
      <div className="flex basis-full flex-wrap items-center gap-x-3 gap-y-1 rounded-btn bg-grey-50 px-3 py-2 text-sm">
        <PinIcon className="h-4 w-4 shrink-0 text-blue-500" />
        <span className="text-grey-500">Starts from</span>
        <span className="font-medium text-grey-900">{summary || 'the yard'}</span>
        {postcode && !located ? (
          <span className="text-warning">Postcode not found on the map</span>
        ) : null}
        {state?.ok && state.message ? <span className="text-success">{state.message}</span> : null}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => setEditing(true)}
          aria-label={`Change where ${name} starts from`}
        >
          {summary ? 'Change' : 'Set address'}
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="basis-full space-y-2 rounded-btn bg-grey-50 p-3">
      <input type="hidden" name="profileId" value={profileId} />
      <p className="text-sm font-semibold">Where does {name} start each day?</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto_auto]">
        <Input
          name="start_address"
          aria-label="Start address"
          placeholder="House and street"
          defaultValue={address ?? ''}
          autoComplete="off"
        />
        <Input
          name="start_postcode"
          aria-label="Start postcode"
          placeholder="Postcode"
          className="uppercase"
          defaultValue={postcode ?? ''}
          autoComplete="off"
        />
        <SubmitButton size="md">Save</SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-grey-500">
        Their day is put in driving order from here. Leave it blank to start from the yard.
      </p>
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
    </form>
  );
}
