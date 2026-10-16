import type { ContactPref, MessageChannel, MessageKind } from '@/lib/types/database';

/**
 * Customer messages: the built-in wording, placeholder filling, and which
 * channel a customer should be reached on. No I/O in here, so it is all
 * unit-tested.
 */

export const PLACEHOLDERS = [
  'first_name',
  'company',
  'company_phone',
  'day',
  'date',
  'amount',
  'invoice_number',
  'quote_number',
  'due_date',
  'days_overdue',
  'frequency',
  'link',
] as const;

export type Placeholder = (typeof PLACEHOLDERS)[number];
export type TemplateVars = Partial<Record<Placeholder, string | number | null | undefined>>;

/** Kinds the company can reword in Settings. */
export type TemplateKind = Exclude<MessageKind, 'portal'>;

export const DEFAULT_TEMPLATES: Record<MessageKind, string> = {
  visit_reminder:
    'Hi {first_name}, {company} will be round to clean your windows {day}. ' +
    'Need to change anything? Use your account page: {link}',
  job_done:
    'Hi {first_name}, your windows were cleaned today by {company}. ' +
    'See the before and after photos here: {link} Thank you!',
  overdue:
    'Hi {first_name}, a friendly reminder that invoice {invoice_number} for {amount} is ' +
    '{days_overdue} days overdue. You can pay online here: {link} ' +
    'If you have already paid, thank you, and please ignore this. {company}',
  invoice:
    'Hi {first_name}, here is invoice {invoice_number} from {company} for {amount}, ' +
    'due {due_date}. View and pay it here: {link}',
  quote:
    'Hi {first_name}, thanks for asking {company} for a quote. Quote {quote_number} is ' +
    '{amount} per clean, {frequency}. View and accept it here: {link}',
  portal:
    'Hi {first_name}, here is your {company} account page. See your next clean, ' +
    'photos and invoices, and pay online: {link}',
};

export const TEMPLATE_LABELS: Record<MessageKind, string> = {
  visit_reminder: 'Visit tomorrow',
  job_done: 'Job done',
  overdue: 'Overdue invoice',
  invoice: 'New invoice',
  quote: 'Quote',
  portal: 'Account page link',
};

export const EMAIL_SUBJECTS: Record<MessageKind, string> = {
  visit_reminder: 'Your window clean is tomorrow',
  job_done: 'Your windows have been cleaned',
  overdue: 'Invoice {invoice_number} is overdue',
  invoice: 'Invoice {invoice_number} from {company}',
  quote: 'Your window cleaning quote from {company}',
  portal: 'Your {company} account page',
};

/** Fills {placeholders}. Unknown or empty ones are dropped, never left showing. */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{([a-z_]+)\}/g, (_match, key: string) => {
      const value = vars[key as Placeholder];
      return value === null || value === undefined ? '' : String(value);
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.!?])/g, '$1')
    .trim();
}

/** Words in a template that are not placeholders we know how to fill. */
export function unknownPlaceholders(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(/\{([a-zA-Z_]+)\}/g)) {
    const key = match[1] ?? '';
    if (!(PLACEHOLDERS as readonly string[]).includes(key)) found.add(key);
  }
  return [...found];
}

export function firstName(name: string): string {
  const trimmed = name.trim();
  // "Mr & Mrs Patel", "The Old Rectory": no sensible first name, use it all.
  if (/^(mr|mrs|ms|miss|dr|the)\b/i.test(trimmed)) return trimmed;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/**
 * UK numbers in, E.164 out. Returns null for anything that cannot be texted
 * (landlines, junk). Numbers already in international form are kept.
 */
export function toMobileE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  if (digits.startsWith('+44')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('44') && digits.length === 12) digits = `0${digits.slice(2)}`;

  if (/^07\d{9}$/.test(digits)) return `+44${digits.slice(1)}`;
  // Another country's mobile, already in international form.
  if (/^\+(?!44)[1-9]\d{7,14}$/.test(digits)) return digits;
  return null;
}

export interface Reachable {
  preferred_contact: ContactPref;
  email: string | null;
  phone: string | null;
}

/**
 * How to reach a customer. Honours their preference when the detail exists,
 * falls back to whatever does, and never contacts someone marked "none"
 * unless the office explicitly picked a channel.
 */
export function pickChannel(
  customer: Reachable,
  requested?: MessageChannel,
): { channel: MessageChannel; to: string } | null {
  const mobile = toMobileE164(customer.phone);
  const email = customer.email?.trim() || null;

  if (requested === 'sms') return mobile ? { channel: 'sms', to: mobile } : null;
  if (requested === 'email') return email ? { channel: 'email', to: email } : null;

  if (customer.preferred_contact === 'none') return null;

  const viaEmail = email ? { channel: 'email' as const, to: email } : null;
  const viaSms = mobile ? { channel: 'sms' as const, to: mobile } : null;

  return customer.preferred_contact === 'email' ? (viaEmail ?? viaSms) : (viaSms ?? viaEmail);
}

/** GSM-7 texts are 160 characters, or 153 each once split. */
export function smsSegments(text: string): number {
  // eslint-disable-next-line no-control-regex
  const gsm = /^[\x0A\x0D\x20-\x7E£¥èéùìòÇØøÅå_ÆæßÉ¡ÄÖÑÜ§¿äöñüà€]*$/.test(text);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  if (text.length <= single) return 1;
  return Math.ceil(text.length / multi);
}

/** Keep texts in the GSM alphabet so they cost one segment, not three. */
export function toSmsText(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');
}

const FREQUENCY_WORDS = {
  weekly: 'every week',
  fortnightly: 'every two weeks',
  '4weekly': 'every four weeks',
  '8weekly': 'every eight weeks',
  one_off: 'as a one-off',
} as const;

export function frequencyWords(frequency: keyof typeof FREQUENCY_WORDS): string {
  return FREQUENCY_WORDS[frequency];
}
