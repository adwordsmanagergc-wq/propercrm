import { Suspense } from 'react';
import { MyDay } from '@/components/cleaner/MyDay';
import { TodayView } from '@/components/admin/TodayView';
import { StatSkeleton, ListSkeleton } from '@/components/ui/States';
import { Card } from '@/components/ui/Card';
import { requireViewer } from '@/lib/auth';
import { OpenRequests } from '@/components/admin/OpenRequests';

export default async function AppHomePage() {
  const viewer = await requireViewer();

  if (viewer.isCleaner) {
    return (
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <MyDay viewer={viewer} />
      </Suspense>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="space-y-5">
          <StatSkeleton />
          <Card>
            <ListSkeleton rows={6} />
          </Card>
        </div>
      }
    >
      <div className="space-y-5">
        <OpenRequests />
        <TodayView viewer={viewer} />
      </div>
    </Suspense>
  );
}
