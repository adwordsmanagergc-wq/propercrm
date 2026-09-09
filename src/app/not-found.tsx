import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-grey-50 px-5">
      <div className="w-full max-w-md rounded-card border border-grey-200 bg-white p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold">We cannot find that page</h1>
        <p className="mt-2 text-grey-500">
          It may have been moved, or the link may be out of date.
        </p>
        <ButtonLink href="/app" size="lg" className="mt-6 w-full">
          Back to my day
        </ButtonLink>
      </div>
    </div>
  );
}
