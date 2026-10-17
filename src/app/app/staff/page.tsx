import type { Metadata } from 'next';
import { startOfWeek } from 'date-fns';
import { StaffBoard, type PendingInvite, type StaffMember } from '@/components/admin/StaffBoard';
import { requireStaff } from '@/lib/auth';
import { getPendingInvites, getStaff, getStaffStats } from '@/lib/db/staff';
import { getSiteUrl } from '@/lib/env';
import { todayInTimezone } from '@/lib/format';
import { format, parseISO } from 'date-fns';

export const metadata: Metadata = { title: 'Staff' };

export default async function StaffPage() {
  const viewer = await requireStaff();
  const today = todayInTimezone(viewer.company.timezone);
  const weekStart = format(startOfWeek(parseISO(today), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const [staff, invites, stats] = await Promise.all([
    getStaff(),
    getPendingInvites(),
    getStaffStats(weekStart, today),
  ]);

  const members: StaffMember[] = staff.map((person) => {
    const personStats = stats.get(person.id);
    return {
      id: person.id,
      fullName: person.full_name,
      role: person.role,
      phone: person.phone,
      isActive: person.is_active,
      startAddress: person.start_address,
      startPostcode: person.start_postcode,
      startLocated: typeof person.start_lat === 'number' && typeof person.start_lng === 'number',
      completed: personStats?.completed ?? 0,
      skipped: personStats?.skipped ?? 0,
      avgMinutes: personStats?.avgMinutes ?? 0,
      photoCompliance: personStats?.photoCompliance ?? 100,
    };
  });

  const site = getSiteUrl();
  const pending: PendingInvite[] = invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    link: `${site}/accept-invite?token=${invite.token}`,
    expiresAt: invite.expires_at,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Staff</h1>
        <p className="text-grey-500">Who works for you, and how they are getting on.</p>
      </div>

      <StaffBoard
        staff={members}
        invites={pending}
        isOwner={viewer.isOwner}
        viewerId={viewer.userId}
      />
    </div>
  );
}
