import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { CreateCompanyForm } from '@/components/auth/SimpleForms';
import { getViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Set up your company' };

/**
 * The gap between "signed up" and "has a company". A confirmation email breaks
 * sign-up in two, so the company is created here, on the first visit with a
 * real session, from the details captured at sign-up.
 */
export default async function WelcomePage() {
  const viewer = await getViewer();
  if (viewer) redirect('/app');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/welcome');

  const meta = user.user_metadata as {
    full_name?: string;
    company_name?: string;
    phone?: string;
  };

  return (
    <AuthCard
      title="Set up your company"
      subtitle="One screen and you are in. You can change any of this later."
      footer={
        <span>
          Joining someone else&rsquo;s team? Open the invite link they emailed you, or{' '}
          <Link href="/sign-in" className="font-medium text-blue-700 hover:underline">
            sign in as someone else
          </Link>
          .
        </span>
      }
    >
      <CreateCompanyForm
        defaultCompanyName={meta.company_name}
        defaultFullName={meta.full_name ?? user.email?.split('@')[0]}
        defaultPhone={meta.phone}
      />
    </AuthCard>
  );
}
