'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveCustomerAction } from '@/app/actions/customers';
import { Button } from '@/components/ui/Button';

export function ArchiveCustomerButton({
  customerId,
  isActive,
}: {
  customerId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={isActive ? 'danger' : 'secondary'}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await archiveCustomerAction({ customerId, isActive: !isActive });
          router.refresh();
        })
      }
    >
      {isActive ? 'Stop this customer' : 'Start them again'}
    </Button>
  );
}
