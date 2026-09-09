import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { ForgotPasswordForm } from '@/components/auth/SimpleForms';

export const metadata: Metadata = { title: 'Forgotten password' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgotten your password?"
      subtitle="Tell us your email and we will send you a link to set a new one."
      footer={
        <Link href="/sign-in" className="font-medium text-blue-700 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
