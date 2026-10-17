import Image from 'next/image';
import Link from 'next/link';
import { Wordmark } from '@/components/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-grey-50 lg:grid-cols-[1fr_minmax(0,34rem)]">
      <div className="flex min-h-dvh flex-col">
        <header className="px-5 py-5 sm:px-8">
          <Link href="/" aria-label="Proper CRM home" className="inline-block">
            <Wordmark />
          </Link>
        </header>
        <main
          id="main"
          className="flex flex-1 items-start justify-center px-5 pb-16 sm:items-center"
        >
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>

      {/* Desktop only: the round itself, so the form never sits in a void. */}
      <aside className="relative hidden overflow-hidden lg:block" aria-hidden="true">
        <Image
          src="/images/hero-round.webp"
          alt=""
          fill
          sizes="34rem"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-grey-900/85 via-grey-900/20 to-transparent" />
        <p className="absolute inset-x-0 bottom-0 p-10 text-2xl font-extrabold leading-snug tracking-tight text-white">
          Rounds, routes, photo proof and getting paid. In your pocket.
        </p>
      </aside>
    </div>
  );
}
