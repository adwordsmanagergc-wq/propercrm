import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { AcceptInviteForm } from '@/components/auth/SimpleForms';
import { Notice } from '@/components/ui/Field';
import { ROLE_LABELS, getViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Join the team' };

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  const viewer = await getViewer();
  if (viewer) redirect('/app');

  if (!token) {
    return (
      <AuthCard title="That link is incomplete">
        <Notice tone="error">
          Open the invite link straight from the email — it needs the code on the end.
        </Notice>
      </AuthCard>
    );
  }

  const supabase = createClient();
  const [{ data: previewRows }, { data: userData }] = await Promise.all([
    supabase.rpc('invite_preview', { p_token: token }),
    supabase.auth.getUser(),
  ]);

  const preview = previewRows?.[0];

  if (!preview) {
    return (
      <AuthCard title="We cannot find that invite">
        <Notice tone="error">
          It may have been cancelled. Ask whoever invited you to send a fresh one.
        </Notice>
      </AuthCard>
    );
  }

  if (preview.expired) {
    return (
      <AuthCard title="That invite has expired">
        <Notice tone="error">Ask {preview.company_name} to send you a new invite.</Notice>
      </AuthCard>
    );
  }

  if (!userData.user) {
    return (
      <AuthCard
        title={`Join ${preview.company_name}`}
        subtitle={`You have been invited as a ${ROLE_LABELS[preview.role].toLowerCase()}.`}
      >
        <Notice tone="info">
          Open this link from the email we sent to {preview.email} — that is how we know it is you.
        </Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={`Join ${preview.company_name}`}
      subtitle={`You have been invited as a ${ROLE_LABELS[preview.role].toLowerCase()}. Set a password and you are in.`}
      footer={
        <Link href="/sign-in" className="font-medium text-blue-700 hover:underline">
          Not you? Sign in as someone else
        </Link>
      }
    >
      <AcceptInviteForm
        token={token}
        defaultFullName={(userData.user.user_metadata as { full_name?: string }).full_name}
      />
    </AuthCard>
  );
}
