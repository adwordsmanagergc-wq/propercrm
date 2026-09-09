import 'server-only';
import type { AdminJob } from '@/lib/db/jobs';
import type { JobStatus, PhotoKind, SkipReason } from '@/lib/types/database';

/**
 * A job flattened into a plain object for the client components. Server
 * Components can only hand serialisable data across the boundary, and the
 * client has no business with the raw row shape anyway.
 */
export interface JobView {
  id: string;
  scheduledDate: string;
  sequence: number;
  status: JobStatus;
  price: number;
  durationMins: number;
  notes: string | null;
  skipReason: SkipReason | null;
  invoiced: boolean;
  startedAt: string | null;
  completedAt: string | null;
  customerId: string;
  customerName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  postcode: string;
  lat: number | null;
  lng: number | null;
  accessNotes: string | null;
  gateCode: string | null;
  dogOnSite: boolean;
  assignedTo: string | null;
  assigneeName: string | null;
  photos: { id: string; kind: PhotoKind; url: string | null; takenAt: string }[];
}

export function toJobView(job: AdminJob, signedUrls: Map<string, string>): JobView {
  const property = job.property;
  const customer = job.customer;

  return {
    id: job.id,
    scheduledDate: job.scheduled_date,
    sequence: job.sequence,
    status: job.status,
    price: Number(job.price),
    durationMins: job.duration_mins,
    notes: job.notes,
    skipReason: job.skip_reason,
    invoiced: job.invoiced,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    customerId: job.customer_id,
    customerName: customer?.name ?? 'Customer',
    phone: customer?.phone ?? null,
    addressLine1: property?.address_line1 || (customer?.address_line1 ?? ''),
    addressLine2: customer?.address_line2 ?? null,
    city: customer?.city ?? null,
    postcode: property?.postcode || (customer?.postcode ?? ''),
    lat: property?.lat ?? customer?.lat ?? null,
    lng: property?.lng ?? customer?.lng ?? null,
    accessNotes: customer?.access_notes ?? null,
    gateCode: customer?.gate_code ?? null,
    dogOnSite: customer?.dog_on_site ?? false,
    assignedTo: job.assigned_to,
    assigneeName: job.assignee?.full_name ?? null,
    photos: (job.photos ?? []).map((photo) => ({
      id: photo.id,
      kind: photo.kind,
      url: signedUrls.get(photo.storage_path) ?? null,
      takenAt: photo.taken_at,
    })),
  };
}

export function photoPaths(jobs: AdminJob[]): string[] {
  return jobs.flatMap((job) => (job.photos ?? []).map((photo) => photo.storage_path));
}
