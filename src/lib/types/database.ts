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
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
export type RequestKind = 'skip_next' | 'extra_clean' | 'callback' | 'message';
export type MessageKind =
  'visit_reminder' | 'job_done' | 'overdue' | 'invoice' | 'quote' | 'portal';
export type MessageChannel = 'email' | 'sms';
export type MessageStatus = 'sent' | 'failed' | 'skipped';

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
  quote_prefix: string;
  next_quote_number: number;
  quote_valid_days: number;
  quote_terms: string | null;
  notify_visit_reminder: boolean;
  notify_job_done: boolean;
  notify_overdue: boolean;
  chase_every_days: number;
  sms_sender: string | null;
  tpl_visit_reminder: string | null;
  tpl_job_done: string | null;
  tpl_overdue: string | null;
  tpl_invoice: string | null;
  tpl_quote: string | null;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  auto_route: boolean;
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
  start_address: string | null;
  start_postcode: string | null;
  start_lat: number | null;
  start_lng: number | null;
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
  portal_token: string;
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
  pay_token: string;
  stripe_session_id: string | null;
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

export type QuoteRow = {
  id: string;
  company_id: string;
  customer_id: string | null;
  number: string;
  status: QuoteStatus;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string | null;
  postcode: string;
  lat: number | null;
  lng: number | null;
  frequency: Frequency;
  duration_mins: number;
  proposed_start: string | null;
  valid_until: string;
  total: number;
  message: string | null;
  token: string;
  sent_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  decline_reason: string | null;
  template_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteLineRow = {
  id: string;
  company_id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  position: number;
  created_at: string;
};

export type CustomerRequestRow = {
  id: string;
  company_id: string;
  customer_id: string;
  kind: RequestKind;
  job_id: string | null;
  message: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

export type MessageLogRow = {
  id: string;
  company_id: string;
  customer_id: string | null;
  kind: MessageKind;
  channel: MessageChannel;
  recipient: string;
  subject: string | null;
  body: string;
  status: MessageStatus;
  error: string | null;
  provider_id: string | null;
  related_id: string | null;
  dedupe_key: string | null;
  created_by: string | null;
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
  start_lat: number | null;
  start_lng: number | null;
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
      quotes: Table<
        QuoteRow,
        [
          CompanyRel<'quotes'>,
          Rel<'quotes_customer_id_fkey', 'customer_id', 'customers'>,
          Rel<'quotes_template_id_fkey', 'template_id', 'job_templates'>,
        ]
      >;
      quote_lines: Table<
        QuoteLineRow,
        [CompanyRel<'quote_lines'>, Rel<'quote_lines_quote_id_fkey', 'quote_id', 'quotes'>]
      >;
      customer_requests: Table<
        CustomerRequestRow,
        [
          CompanyRel<'customer_requests'>,
          Rel<'customer_requests_customer_id_fkey', 'customer_id', 'customers'>,
          Rel<'customer_requests_job_id_fkey', 'job_id', 'jobs'>,
        ]
      >;
      message_log: Table<
        MessageLogRow,
        [CompanyRel<'message_log'>, Rel<'message_log_customer_id_fkey', 'customer_id', 'customers'>]
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
      reorder_my_day: { Args: { p_date: string; p_jobs: string[] }; Returns: number };
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
      topup_all_schedules: { Args: { p_weeks?: number }; Returns: number };
      mark_overdue_invoices: { Args: Record<string, never>; Returns: number };
      generate_jobs_for_template: {
        Args: { p_template: string; p_until: string };
        Returns: number;
      };
      save_quote: {
        Args: {
          p_id: string | null;
          p_customer: string | null;
          p_contact_name: string;
          p_contact_email: string | null;
          p_contact_phone: string | null;
          p_address_line1: string;
          p_address_line2: string | null;
          p_city: string | null;
          p_postcode: string;
          p_frequency: Frequency;
          p_duration_mins: number;
          p_proposed_start: string | null;
          p_valid_until: string | null;
          p_message: string | null;
          p_lines: { description: string; quantity: number; unit_price: number }[];
        };
        Returns: string;
      };
      quote_public: { Args: { p_token: string }; Returns: unknown };
      respond_to_quote: {
        Args: { p_token: string; p_accept: boolean; p_reason?: string | null };
        Returns: QuoteStatus;
      };
      expire_quotes: { Args: Record<string, never>; Returns: number };
      portal_snapshot: { Args: { p_token: string }; Returns: unknown };
      portal_request: {
        Args: { p_token: string; p_kind: RequestKind; p_message?: string | null };
        Returns: string;
      };
      today_for_company: { Args: { p_company: string }; Returns: string };
      report_summary: { Args: { p_from: string; p_to: string }; Returns: unknown };
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
      quote_status: QuoteStatus;
      request_kind: RequestKind;
    };
    CompositeTypes: Record<string, never>;
  };
};
