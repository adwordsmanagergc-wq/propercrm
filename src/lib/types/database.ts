/**
 * Hand-maintained mirror of supabase/migrations. Keep in step with the SQL —
 * `supabase gen types typescript` will regenerate this file if you prefer.
 */

export type UserRole = 'owner' | 'manager' | 'cleaner';
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
export type Frequency = 'weekly' | 'fortnightly' | '4weekly' | '8weekly' | 'one_off';
export type PhotoKind = 'before' | 'after' | 'issue';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
export type PaymentMethod = 'cash' | 'bank' | 'card' | 'other';
export type ContactPref = 'phone' | 'sms' | 'email' | 'none';
export type SkipReason = 'no_access' | 'dog_on_site' | 'customer_cancelled' | 'weather' | 'other';

export type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  timezone: string;
  plan: string;
  trial_ends_at: string;
  start_postcode: string | null;
  start_lat: number | null;
  start_lng: number | null;
  working_days: number[];
  invoice_prefix: string;
  next_invoice_number: number;
  payment_terms_days: number;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_sort_code: string | null;
  bank_account_number: string | null;
  invoice_footer: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  company_id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InviteRow = {
  id: string;
  company_id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type CustomerRow = {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string | null;
  postcode: string;
  lat: number | null;
  lng: number | null;
  access_notes: string | null;
  gate_code: string | null;
  dog_on_site: boolean;
  preferred_contact: ContactPref;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyRow = {
  id: string;
  company_id: string;
  customer_id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string | null;
  postcode: string;
  lat: number | null;
  lng: number | null;
  window_count: number | null;
  storeys: number | null;
  has_conservatory: boolean;
  price: number | null;
  access_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type JobTemplateRow = {
  id: string;
  company_id: string;
  customer_id: string;
  property_id: string | null;
  price: number;
  duration_mins: number;
  frequency: Frequency;
  anchor_date: string;
  assigned_cleaner: string | null;
  is_active: boolean;
  instructions: string | null;
  created_at: string;
  updated_at: string;
};

export type JobRow = {
  id: string;
  company_id: string;
  template_id: string | null;
  customer_id: string;
  property_id: string | null;
  scheduled_date: string;
  sequence: number;
  assigned_to: string | null;
  status: JobStatus;
  price: number;
  duration_mins: number;
  started_at: string | null;
  completed_at: string | null;
  start_lat: number | null;
  start_lng: number | null;
  complete_lat: number | null;
  complete_lng: number | null;
  notes: string | null;
  skip_reason: SkipReason | null;
  invoiced: boolean;
  created_at: string;
  updated_at: string;
};

export type JobPhotoRow = {
  id: string;
  company_id: string;
  job_id: string;
  kind: PhotoKind;
  storage_path: string;
  taken_at: string;
  lat: number | null;
  lng: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type InvoiceRow = {
  id: string;
  company_id: string;
  customer_id: string;
  number: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  total: number;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  notes: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineRow = {
  id: string;
  company_id: string;
  invoice_id: string;
  job_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  position: number;
  created_at: string;
};

export type ActivityLogRow = {
  id: number;
  company_id: string;
  actor_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
};

/** public.my_jobs — the cleaner-safe view. Note: no price, ever. */
export type MyJobRow = {
  id: string;
  company_id: string;
  scheduled_date: string;
  sequence: number;
  status: JobStatus;
  duration_mins: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  skip_reason: SkipReason | null;
  customer_id: string;
  customer_first_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string | null;
  postcode: string;
  lat: number | null;
  lng: number | null;
  access_notes: string | null;
  gate_code: string | null;
  dog_on_site: boolean;
  instructions: string | null;
  before_photos: number;
  after_photos: number;
  issue_photos: number;
};

export type MyCompanyRow = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  logo_url: string | null;
  timezone: string;
  working_days: number[];
  plan: string;
  trial_ends_at: string;
};

/**
 * Foreign keys, spelled out so embedded selects (`customer:customers(...)`)
 * type-check. Names follow Postgres's default `<table>_<column>_fkey`.
 */
type Rel<FK extends string, Column extends string, Referenced extends string> = {
  foreignKeyName: FK;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Referenced;
  referencedColumns: ['id'];
};

type Table<R, Rels extends Rel<string, string, string>[] = []> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: Rels;
};
type View<R> = { Row: R; Relationships: [] };

type CompanyRel<T extends string> = Rel<`${T}_company_id_fkey`, 'company_id', 'companies'>;

export type Database = {
  public: {
    Tables: {
      companies: Table<CompanyRow>;
      profiles: Table<ProfileRow, [CompanyRel<'profiles'>]>;
      invites: Table<
        InviteRow,
        [CompanyRel<'invites'>, Rel<'invites_invited_by_fkey', 'invited_by', 'profiles'>]
      >;
      customers: Table<CustomerRow, [CompanyRel<'customers'>]>;
      properties: Table<
        PropertyRow,
        [CompanyRel<'properties'>, Rel<'properties_customer_id_fkey', 'customer_id', 'customers'>]
      >;
      job_templates: Table<
        JobTemplateRow,
        [
          CompanyRel<'job_templates'>,
          Rel<'job_templates_customer_id_fkey', 'customer_id', 'customers'>,
          Rel<'job_templates_property_id_fkey', 'property_id', 'properties'>,
          Rel<'job_templates_assigned_cleaner_fkey', 'assigned_cleaner', 'profiles'>,
        ]
      >;
      jobs: Table<
        JobRow,
        [
          CompanyRel<'jobs'>,
          Rel<'jobs_customer_id_fkey', 'customer_id', 'customers'>,
          Rel<'jobs_property_id_fkey', 'property_id', 'properties'>,
          Rel<'jobs_template_id_fkey', 'template_id', 'job_templates'>,
          Rel<'jobs_assigned_to_fkey', 'assigned_to', 'profiles'>,
        ]
      >;
      job_photos: Table<
        JobPhotoRow,
        [
          CompanyRel<'job_photos'>,
          Rel<'job_photos_job_id_fkey', 'job_id', 'jobs'>,
          Rel<'job_photos_uploaded_by_fkey', 'uploaded_by', 'profiles'>,
        ]
      >;
      invoices: Table<
        InvoiceRow,
        [CompanyRel<'invoices'>, Rel<'invoices_customer_id_fkey', 'customer_id', 'customers'>]
      >;
      invoice_lines: Table<
        InvoiceLineRow,
        [
          CompanyRel<'invoice_lines'>,
          Rel<'invoice_lines_invoice_id_fkey', 'invoice_id', 'invoices'>,
          Rel<'invoice_lines_job_id_fkey', 'job_id', 'jobs'>,
        ]
      >;
      activity_log: Table<
        ActivityLogRow,
        [CompanyRel<'activity_log'>, Rel<'activity_log_actor_id_fkey', 'actor_id', 'profiles'>]
      >;
    };
    Views: {
      my_jobs: View<MyJobRow>;
      my_company: View<MyCompanyRow>;
    };
    Functions: {
      create_company_and_owner: {
        Args: { p_company_name: string; p_full_name: string; p_phone?: string | null };
        Returns: string;
      };
      accept_invite: { Args: { p_token: string }; Returns: string };
      invite_preview: {
        Args: { p_token: string };
        Returns: { company_name: string; role: UserRole; email: string; expired: boolean }[];
      };
      company_today: { Args: Record<string, never>; Returns: string };
      start_job: {
        Args: { p_job: string; p_lat?: number | null; p_lng?: number | null };
        Returns: undefined;
      };
      complete_job: {
        Args: {
          p_job: string;
          p_lat?: number | null;
          p_lng?: number | null;
          p_notes?: string | null;
        };
        Returns: undefined;
      };
      skip_job: {
        Args: { p_job: string; p_reason: SkipReason; p_notes?: string | null };
        Returns: undefined;
      };
      add_job_photo: {
        Args: {
          p_job: string;
          p_kind: PhotoKind;
          p_path: string;
          p_lat?: number | null;
          p_lng?: number | null;
          p_taken_at?: string;
        };
        Returns: string;
      };
      my_stats: {
        Args: Record<string, never>;
        Returns: {
          completed_this_week: number;
          skipped_this_week: number;
          avg_minutes: number;
          photo_compliance: number;
        }[];
      };
      create_invoice_from_jobs: {
        Args: { p_customer: string; p_job_ids: string[]; p_notes?: string | null };
        Returns: string;
      };
      aged_debt: {
        Args: Record<string, never>;
        Returns: {
          bucket_current: number;
          bucket_0_30: number;
          bucket_31_60: number;
          bucket_60_plus: number;
          total_owed: number;
        }[];
      };
      customer_balances: {
        Args: Record<string, never>;
        Returns: { customer_id: string; balance: number; lifetime_value: number }[];
      };
      topup_company_schedule: { Args: { p_company: string; p_weeks?: number }; Returns: number };
      generate_jobs_for_template: {
        Args: { p_template: string; p_until: string };
        Returns: number;
      };
      recalc_invoice_totals: { Args: { p_invoice: string }; Returns: undefined };
    };
    Enums: {
      user_role: UserRole;
      job_status: JobStatus;
      frequency: Frequency;
      photo_kind: PhotoKind;
      invoice_status: InvoiceStatus;
      payment_method: PaymentMethod;
      contact_pref: ContactPref;
      skip_reason: SkipReason;
    };
    CompositeTypes: Record<string, never>;
  };
};
