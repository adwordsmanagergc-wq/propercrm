import { RequestList } from '@/components/admin/RequestList';
import { Card, CardHeader } from '@/components/ui/Card';
import { InboxIcon } from '@/components/ui/Icons';
import { getOpenRequests } from '@/lib/db/messages';
import { toRequestViews } from '@/lib/db/requests-view';

/** Anything customers asked for from their account page, until someone deals with it. */
export async function OpenRequests() {
  const requests = await getOpenRequests();
  if (requests.length === 0) return null;

  return (
    <Card className="border-warning/40">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <InboxIcon className="h-5 w-5 text-warning" /> Customer requests
          </span>
        }
        subtitle={`${requests.length} waiting`}
      />
      <RequestList requests={toRequestViews(requests)} />
    </Card>
  );
}
