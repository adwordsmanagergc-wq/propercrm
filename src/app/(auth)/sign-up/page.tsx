import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { SignUpForm } from '@/components/auth/SignUpForm';

export const metadata: Metadata = { title: 'Start your free trial' };

export default function SignUpPage() {
  return (
    <AuthCard
      title="Start your free trial"
      subtitle="Fourteen days, no card needed."
      footer={
        <span>
          Already with us?{' '}
          <Link href="/sign-in" className="font-medium text-blue-700 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
