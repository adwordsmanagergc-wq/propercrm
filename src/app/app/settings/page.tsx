import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LogoUpload } from '@/components/admin/LogoUpload';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { ProfileForm } from '@/components/cleaner/ProfileForm';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';
import { requireStaff } from '@/lib/auth';
import { getCompany } from '@/lib/db/staff';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
  const viewer = await requireStaff();
  const company = await getCompany();
  if (!company) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-grey-500">How Proper CRM works for {company.name}.</p>
      </div>

      {searchParams.welcome ? (
        <Notice tone="success">
          You are all set up. Add your customers next, then put them on a round — the diary fills
          itself in from there.
        </Notice>
      ) : null}

      <Card>
        <CardHeader
          title="Your plan"
          subtitle={`Trial ends ${formatDate(company.trial_ends_at)}`}
          action={<Pill tone="blue">{company.plan}</Pill>}
        />
        <CardBody>
          <p className="text-sm text-grey-500">
            {viewer.isOwner
              ? 'Billing is handled by the owner. Get in touch if you need to change plan.'
              : 'Only the owner can change the plan or the billing details.'}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Logo" />
        <CardBody>
          <LogoUpload companyId={company.id} logoUrl={company.logo_url} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Company" />
        <CardBody>
          <SettingsForm company={company} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="You" />
        <CardBody>
          <ProfileForm
            fullName={viewer.profile.full_name}
            phone={viewer.profile.phone ?? ''}
            email={viewer.email}
          />
        </CardBody>
      </Card>
    </div>
  );
}
