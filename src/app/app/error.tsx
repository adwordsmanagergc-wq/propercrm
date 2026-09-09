'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg p-6 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-grey-500">
        That screen did not load. Try again — nothing you have done has been lost.
      </p>
      <div className="mt-5 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
      </div>
      {error.digest ? (
        <p className="mt-4 text-xs text-grey-500">Reference: {error.digest}</p>
      ) : null}
    </Card>
  );
}
