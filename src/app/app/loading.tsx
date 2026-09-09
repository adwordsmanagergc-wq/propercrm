import { StatSkeleton, ListSkeleton } from '@/components/ui/States';
import { Card } from '@/components/ui/Card';

export default function AppLoading() {
  return (
    <div className="space-y-5">
      <StatSkeleton />
      <Card>
        <ListSkeleton rows={6} />
      </Card>
    </div>
  );
}
