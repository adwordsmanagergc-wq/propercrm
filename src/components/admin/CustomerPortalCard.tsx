'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resetPortalLinkAction, sendPortalLinkAction } from '@/app/actions/messages';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { Notice } from '@/components/ui/Field';

export function CustomerPortalCard({
  customerId,
  link,
  hasEmail,
  hasMobile,
}: {
  customerId: string;
  link: string;
  hasEmail: boolean;
  hasMobile: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function act(work: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setNotice(null);
    startTransition(async () => {
      const result = await work();
      setNotice(
        result.ok
          ? { tone: 'success', text: result.message ?? 'Done' }
          : { tone: 'error', text: result.error ?? 'That did not work' },
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-grey-500">
        Their own page: next clean, before and after photos, invoices to pay, and buttons to skip a
        clean or ask for an extra one. No password needed.
      </p>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <CopyButton text={link} label="Copy link" copiedLabel="Copied" size="sm" />
        <Button
          size="sm"
          variant="secondary"
          disabled={pending || !hasEmail}
          onClick={() => act(() => sendPortalLinkAction({ customerId, channel: 'email' }))}
        >
          Email it
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending || !hasMobile}
          onClick={() => act(() => sendPortalLinkAction({ customerId, channel: 'sms' }))}
        >
          Text it
        </Button>
        <ButtonLink href={link} target="_blank" size="sm" variant="ghost">
          Open
        </ButtonLink>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (window.confirm('Make a new link? The old one will stop working.')) {
              act(() => resetPortalLinkAction({ customerId }));
            }
          }}
        >
          New link
        </Button>
      </div>
    </div>
  );
}
