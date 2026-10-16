import { Card } from '@/components/ui/Card';
import { ListSkeleton, StatSkeleton } from '@/components/ui/States';

export default function Loading() {
  return (
    <div className="space-y-5">
      <StatSkeleton />
      <Card>
        <ListSkeleton rows={5} />
      </Card>
    </div>
  );
}
