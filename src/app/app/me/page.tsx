import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/cleaner/ProfileForm';
import { SignOutButton } from '@/components/shell/SignOutButton';
import { Card, CardBody, CardHeader, StatTile } from '@/components/ui/Card';
import { requireViewer } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/roles';
import { getMyStats } from '@/lib/db/myjobs';
import { formatDuration } from '@/lib/format';

export const metadata: Metadata = { title: 'Me' };

export default async function MePage() {
  const viewer = await requireViewer();
  if (!viewer.isCleaner) redirect('/app/settings');

  const stats = await getMyStats();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Me</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Done this week" value={stats.completed_this_week} tone="success" />
        <StatTile
          label="Missed"
          value={stats.skipped_this_week}
          tone={stats.skipped_this_week ? 'danger' : 'default'}
        />
        <StatTile label="Average job" value={formatDuration(stats.avg_minutes)} />
        <StatTile label="Photos done" value={`${stats.photo_compliance}%`} tone="blue" />
      </div>

      <Card>
        <CardHeader
          title="Your details"
          subtitle={`${ROLE_LABELS[viewer.profile.role]} at ${viewer.company.name}`}
        />
        <CardBody>
          <ProfileForm
            fullName={viewer.profile.full_name}
            phone={viewer.profile.phone ?? ''}
            email={viewer.email}
          />
        </CardBody>
      </Card>

      <SignOutButton className="w-full" />
    </div>
  );
}
