import { z } from 'zod';

/**
 * One set of schemas, used by the forms in the browser and re-validated by
 * every Server Action. The client copy is a convenience; the server copy is
 * the one that counts.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

export const uuid = z.string().uuid('Not a valid id');

/**
 * HTML checkboxes send "on" (or nothing at all), and a hidden field sends the
 * string "false" — which `z.coerce.boolean()` would read as true. This reads
 * form values the way forms actually send them.
 */
const checkbox = (fallback: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === '') return fallback;
      if (typeof value === 'boolean') return value;
      return value === 'true' || value === 'on' || value === '1' || value === 'yes';
    });

const roleSchema = z.enum(['owner', 'manager', 'cleaner']);
const frequencySchema = z.enum(['weekly', 'fortnightly', '4weekly', '8weekly', 'one_off']);
const skipReasonSchema = z.enum([
  'no_access',
  'dog_on_site',
  'customer_cancelled',
  'weather',
  'other',
]);
const paymentMethodSchema = z.enum(['cash', 'bank', 'card', 'other']);

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('That does not look like an email address')
  .toLowerCase();

const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'That password is too long');

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const signUpSchema = z.object({
  companyName: trimmed(120).min(2, 'What is the business called?'),
  fullName: trimmed(120).min(2, 'What is your name?'),
  email: emailSchema,
  password: passwordSchema,
  phone: optionalText(40),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
  next: z.string().optional(),
});

export const magicLinkSchema = z.object({ email: emailSchema, next: z.string().optional() });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ password: passwordSchema });
export const acceptInviteSchema = z.object({
  token: z.string().min(10, 'That invite link looks wrong'),
  fullName: trimmed(120).min(2, 'What is your name?'),
  password: passwordSchema,
});

// ---------------------------------------------------------------------------
// Customers and properties
// ---------------------------------------------------------------------------
export const customerSchema = z.object({
  id: uuid.optional(),
  name: trimmed(160).min(2, 'A name is required'),
  phone: optionalText(40),
  email: z
    .union([z.literal(''), z.string().trim().email('That does not look like an email address')])
    .transform((v) => (v === '' ? null : v.toLowerCase()))
    .nullable()
    .optional(),
  address_line1: trimmed(160),
  address_line2: optionalText(160),
  city: optionalText(80),
  postcode: trimmed(12),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  access_notes: optionalText(600),
  gate_code: optionalText(40),
  dog_on_site: checkbox(false),
  preferred_contact: z.enum(['phone', 'sms', 'email', 'none']).default('phone'),
  is_active: checkbox(true),
  notes: optionalText(2000),
});

export const propertySchema = z.object({
  id: uuid.optional(),
  customer_id: uuid,
  label: trimmed(80).min(1, 'Give it a name, e.g. "Shop front"'),
  address_line1: trimmed(160),
  address_line2: optionalText(160),
  city: optionalText(80),
  postcode: trimmed(12),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  window_count: z.coerce.number().int().min(0).max(500).nullable().optional(),
  storeys: z.coerce.number().int().min(1).max(10).nullable().optional(),
  has_conservatory: checkbox(false),
  price: z.coerce.number().min(0).max(100000).nullable().optional(),
  access_notes: optionalText(600),
});

// ---------------------------------------------------------------------------
// Rounds and jobs
// ---------------------------------------------------------------------------
export const roundSchema = z.object({
  id: uuid.optional(),
  customer_id: uuid,
  property_id: z
    .union([uuid, z.literal('')])
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  price: z.coerce.number().min(0, 'Price cannot be negative').max(100000),
  duration_mins: z.coerce.number().int().min(5).max(600).default(30),
  frequency: frequencySchema,
  anchor_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a start date'),
  assigned_cleaner: z
    .union([uuid, z.literal('')])
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  is_active: checkbox(true),
  instructions: optionalText(1000),
  /** Editing a round: does it change future jobs only, or every unstarted one? */
  applyTo: z.enum(['future', 'all_unstarted']).default('future'),
});

export const jobSchema = z.object({
  id: uuid.optional(),
  customer_id: uuid,
  property_id: z
    .union([uuid, z.literal('')])
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  assigned_to: z
    .union([uuid, z.literal('')])
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  price: z.coerce.number().min(0).max(100000),
  duration_mins: z.coerce.number().int().min(5).max(600).default(30),
  notes: optionalText(2000),
});

export const moveJobSchema = z.object({
  jobId: uuid,
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assigned_to: z
    .union([uuid, z.literal('unassigned')])
    .transform((v) => (v === 'unassigned' ? null : v))
    .nullable()
    .optional(),
});

export const bulkAssignSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cleanerId: uuid,
  onlyUnassigned: checkbox(true),
});

export const startJobSchema = z.object({
  jobId: uuid,
  lat: z.coerce.number().nullable().optional(),
  lng: z.coerce.number().nullable().optional(),
});

export const completeJobSchema = startJobSchema.extend({ notes: optionalText(2000) });

export const skipJobSchema = z.object({
  jobId: uuid,
  reason: skipReasonSchema,
  notes: optionalText(2000),
});

export const optimiseRouteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cleanerId: z
    .union([uuid, z.literal('all')])
    .transform((v) => (v === 'all' ? null : v))
    .nullable()
    .optional(),
});

// ---------------------------------------------------------------------------
// Invoicing
// ---------------------------------------------------------------------------
export const createInvoiceSchema = z.object({
  customerId: uuid,
  jobIds: z.array(uuid).min(1, 'Pick at least one completed job'),
  notes: optionalText(1000),
});

export const markPaidSchema = z.object({
  invoiceId: uuid,
  method: paymentMethodSchema,
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ---------------------------------------------------------------------------
// Staff and settings
// ---------------------------------------------------------------------------
export const inviteSchema = z.object({
  email: emailSchema,
  role: roleSchema,
  fullName: optionalText(120),
});

export const staffUpdateSchema = z.object({
  profileId: uuid,
  role: roleSchema.optional(),
  is_active: checkbox(true).optional(),
});

export const settingsSchema = z.object({
  name: trimmed(120).min(2, 'What is the business called?'),
  phone: optionalText(40),
  email: z
    .union([z.literal(''), z.string().trim().email('That does not look like an email address')])
    .transform((v) => (v === '' ? null : v.toLowerCase()))
    .nullable()
    .optional(),
  timezone: trimmed(60).default('Europe/London'),
  start_postcode: optionalText(12),
  start_lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  start_lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  working_days: z.array(z.coerce.number().int().min(1).max(7)).min(1, 'Pick at least one day'),
  invoice_prefix: trimmed(10).min(1, 'A prefix is required'),
  payment_terms_days: z.coerce.number().int().min(0).max(180),
  bank_name: optionalText(80),
  bank_account_name: optionalText(80),
  bank_sort_code: optionalText(12),
  bank_account_number: optionalText(20),
  invoice_footer: optionalText(500),
});

export const profileSchema = z.object({
  full_name: trimmed(120).min(2, 'What is your name?'),
  phone: optionalText(40),
});
