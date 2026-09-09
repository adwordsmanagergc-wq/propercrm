import Link from 'next/link';
import { Wordmark } from '@/components/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-grey-50">
      <header className="px-5 py-5">
        <Link href="/" aria-label="Proper CRM home" className="inline-block">
          <Wordmark />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-5 pb-16 sm:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
