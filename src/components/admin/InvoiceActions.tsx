'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  markInvoicePaidAction,
  markInvoiceSentAction,
  voidInvoiceAction,
} from '@/app/actions/invoices';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { Field, Notice, Select, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { InvoiceStatus, PaymentMethod } from '@/lib/types/database';

export function InvoiceActions({
  invoiceId,
  status,
  today,
  chaseText,
}: {
  invoiceId: string;
  status: InvoiceStatus;
  today: string;
  chaseText: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('bank');
  const [paidOn, setPaidOn] = useState(today);
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
    <div className="space-y-3">
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex flex-wrap gap-2">
        {status === 'draft' ? (
          <Button
            disabled={pending}
            onClick={() => act(() => markInvoiceSentAction({ invoiceId }))}
          >
            Mark as sent
          </Button>
        ) : null}

        {status !== 'paid' && status !== 'void' ? (
          <Button variant="success" disabled={pending} onClick={() => setPayOpen(true)}>
            Mark as paid
          </Button>
        ) : null}

        {status === 'sent' || status === 'overdue' ? (
          <CopyButton text={chaseText} label="Chase" copiedLabel="Reminder copied" />
        ) : null}

        <ButtonLink href={`/print/invoices/${invoiceId}`} variant="secondary" target="_blank">
          Print or save as PDF
        </ButtonLink>

        {status !== 'void' && status !== 'paid' ? (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => act(() => voidInvoiceAction({ invoiceId }))}
          >
            Void
          </Button>
        ) : null}
      </div>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Mark as paid"
        description="How and when did it come in?"
      >
        <div className="space-y-4">
          <Field label="How they paid" htmlFor="method">
            <Select
              id="method"
              value={method}
              onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            >
              <option value="bank">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="other">Something else</option>
            </Select>
          </Field>
          <Field label="When" htmlFor="paidOn">
            <Input
              id="paidOn"
              type="date"
              value={paidOn}
              onChange={(event) => setPaidOn(event.target.value)}
            />
          </Field>
          <Button
            size="lg"
            variant="success"
            className="w-full"
            disabled={pending}
            onClick={() => {
              setPayOpen(false);
              act(() => markInvoicePaidAction({ invoiceId, method, paidOn }));
            }}
          >
            Mark as paid
          </Button>
        </div>
      </Modal>
    </div>
  );
}
