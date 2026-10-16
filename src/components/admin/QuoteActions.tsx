'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteQuoteAction, markQuoteSentAction, sendQuoteAction } from '@/app/actions/quotes';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { Notice } from '@/components/ui/Field';
import type { QuoteStatus } from '@/lib/types/database';

export function QuoteActions({
  quoteId,
  status,
  link,
  hasEmail,
  hasMobile,
}: {
  quoteId: string;
  status: QuoteStatus;
  link: string;
  hasEmail: boolean;
  hasMobile: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const answered = status === 'accepted' || status === 'declined';

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
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        {!answered ? (
          <>
            <Button
              disabled={pending || !hasEmail}
              onClick={() => act(() => sendQuoteAction({ quoteId, channel: 'email' }))}
              title={hasEmail ? undefined : 'Add an email address first'}
            >
              Email it
            </Button>
            <Button
              variant="secondary"
              disabled={pending || !hasMobile}
              onClick={() => act(() => sendQuoteAction({ quoteId, channel: 'sms' }))}
              title={hasMobile ? undefined : 'Add a mobile number first'}
            >
              Text it
            </Button>
          </>
        ) : null}
        <CopyButton text={link} label="Copy link" copiedLabel="Link copied" />
        {status === 'draft' ? (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => act(() => markQuoteSentAction({ quoteId }))}
          >
            I sent it myself
          </Button>
        ) : null}
        {status !== 'draft' ? (
          <ButtonLink href={link} target="_blank" variant="ghost">
            See what they see
          </ButtonLink>
        ) : null}
        {status !== 'accepted' ? (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (window.confirm('Delete this quote?')) act(() => deleteQuoteAction({ quoteId }));
            }}
          >
            Delete
          </Button>
        ) : null}
      </div>
      {status === 'draft' ? (
        <p className="text-sm text-grey-500">
          The link only works once the quote is sent, so nobody sees a half-finished draft.
        </p>
      ) : null}
    </div>
  );
}
