'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { portalRequestAction } from '@/app/actions/public';
import { Button } from '@/components/ui/Button';
import { Field, Notice, Textarea } from '@/components/ui/Field';
import type { RequestKind } from '@/lib/types/database';

const OPTIONS: { kind: RequestKind; label: string; needsNext?: boolean }[] = [
  { kind: 'skip_next', label: 'Skip my next clean', needsNext: true },
  { kind: 'extra_clean', label: 'Book an extra clean' },
  { kind: 'callback', label: 'Ask for a call back' },
];

export function PortalRequests({ token, hasNext }: { token: string; hasNext: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function send(kind: RequestKind) {
    setNotice(null);
    startTransition(async () => {
      const result = await portalRequestAction({
        portalToken: token,
        kind,
        message: message.trim() || undefined,
      });
      setNotice(
        result.ok
          ? { tone: 'success', text: result.message ?? 'Sent' }
          : { tone: 'error', text: result.error },
      );
      if (result.ok) {
        setMessage('');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.filter((option) => !option.needsNext || hasNext).map((option) => (
          <Button
            key={option.kind}
            variant="secondary"
            disabled={pending}
            onClick={() => send(option.kind)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <Field
        label="Or leave us a message"
        htmlFor="portal-message"
        hint="Gate code changed? New dog? Tell us here."
      >
        <Textarea
          id="portal-message"
          value={message}
          maxLength={1000}
          onChange={(event) => setMessage(event.target.value)}
        />
      </Field>
      <Button disabled={pending || message.trim() === ''} onClick={() => send('message')}>
        Send message
      </Button>
    </div>
  );
}
