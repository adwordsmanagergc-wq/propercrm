import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { SignInForm } from '@/components/auth/SignInForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/forgot-password" className="font-medium text-blue-700 hover:underline">
            Forgotten your password?
          </Link>
          <span>
            No account?{' '}
            <Link href="/sign-up" className="font-medium text-blue-700 hover:underline">
              Start a free trial
            </Link>
          </span>
        </div>
      }
    >
      <SignInForm next={searchParams.next} linkExpired={searchParams.error === 'link-expired'} />
    </AuthCard>
  );
}
