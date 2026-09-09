'use client';

import { useEffect } from 'react';

/**
 * Backstop for the public pages. Anything unhandled out here would otherwise
 * be a bare 500 in front of someone deciding whether to sign up.
 */
export default function RootError({
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
    <div className="grid min-h-dvh place-items-center bg-grey-50 px-5">
      <div className="w-full max-w-md rounded-card border border-grey-200 bg-white p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-grey-500">
          That page did not load. Try again — if it keeps happening, the site owner has been logging
          it.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 h-14 w-full rounded-btn bg-blue-500 text-lg font-semibold text-white hover:bg-blue-600"
        >
          Try again
        </button>
        {error.digest ? (
          <p className="mt-4 text-xs text-grey-500">Reference: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
