import { describe, expect, it } from 'vitest';
import {
  MAX_CHASES,
  planDailyMessages,
  type PlanCompany,
  type PlanCustomer,
} from '@/lib/messaging/plan';
import {
  DEFAULT_TEMPLATES,
  firstName,
  pickChannel,
  renderTemplate,
  smsSegments,
  toMobileE164,
  toSmsText,
  unknownPlaceholders,
} from '@/lib/messaging/templates';

describe('renderTemplate', () => {
  it('fills placeholders', () => {
    expect(
      renderTemplate('Hi {first_name}, from {company}', { first_name: 'Jo', company: 'Clear' }),
    ).toBe('Hi Jo, from Clear');
  });

  it('drops missing placeholders without leaving gaps before punctuation', () => {
    expect(renderTemplate('Call {company_phone}.', {})).toBe('Call.');
    expect(renderTemplate('Hi {first_name} , thanks', {})).toBe('Hi, thanks');
  });

  it('never shows an unknown placeholder to a customer', () => {
    expect(renderTemplate('Hi {nonsense}there', {})).toBe('Hi there');
  });

  it('finds typos in a custom template', () => {
    expect(unknownPlaceholders('Hi {firstname}, {company} {link}')).toEqual(['firstname']);
  });

  it('every default template uses only known placeholders', () => {
    for (const template of Object.values(DEFAULT_TEMPLATES)) {
      expect(unknownPlaceholders(template)).toEqual([]);
    }
  });
});

describe('firstName', () => {
  it('takes the first word', () => {
    expect(firstName('  Sarah Jones ')).toBe('Sarah');
  });
  it('keeps titles whole', () => {
    expect(firstName('Mr & Mrs Patel')).toBe('Mr & Mrs Patel');
    expect(firstName('The Old Rectory')).toBe('The Old Rectory');
  });
});

describe('toMobileE164', () => {
  it.each([
    ['07700 900123', '+447700900123'],
    ['+44 7700 900123', '+447700900123'],
    ['+44 (0)7700 900123', '+447700900123'],
    ['447700900123', '+447700900123'],
    ['0044 7700 900123', '+447700900123'],
    ['+61 412 345 678', '+61412345678'],
  ])('%s → %s', (input, expected) => {
    expect(toMobileE164(input)).toBe(expected);
  });

  it.each(['01632 960123', '0207 946 0000', '12345', '', null])('rejects %s', (input) => {
    expect(toMobileE164(input)).toBeNull();
  });
});

describe('pickChannel', () => {
  const both = { email: 'a@b.com', phone: '07700900123' };

  it('honours the preference', () => {
    expect(pickChannel({ ...both, preferred_contact: 'email' })?.channel).toBe('email');
    expect(pickChannel({ ...both, preferred_contact: 'sms' })?.channel).toBe('sms');
    expect(pickChannel({ ...both, preferred_contact: 'phone' })?.channel).toBe('sms');
  });

  it('falls back to whatever detail exists', () => {
    expect(pickChannel({ email: null, phone: '07700900123', preferred_contact: 'email' })).toEqual({
      channel: 'sms',
      to: '+447700900123',
    });
    expect(
      pickChannel({ email: 'a@b.com', phone: '01632 960123', preferred_contact: 'sms' }),
    ).toEqual({
      channel: 'email',
      to: 'a@b.com',
    });
  });

  it('leaves "do not contact" customers alone unless the office picks a channel', () => {
    expect(pickChannel({ ...both, preferred_contact: 'none' })).toBeNull();
    expect(pickChannel({ ...both, preferred_contact: 'none' }, 'email')?.channel).toBe('email');
  });

  it('returns null when the requested channel has no detail', () => {
    expect(pickChannel({ email: null, phone: null, preferred_contact: 'email' }, 'sms')).toBeNull();
  });
});

describe('sms helpers', () => {
  it('counts segments', () => {
    expect(smsSegments('a'.repeat(160))).toBe(1);
    expect(smsSegments('a'.repeat(161))).toBe(2);
    expect(smsSegments('😀'.repeat(10))).toBe(1);
    expect(smsSegments('😀'.repeat(40))).toBe(2);
  });

  it('keeps texts in the cheap alphabet', () => {
    const text = toSmsText('It’s “done” – thanks…');
    expect(text).toBe('It\'s "done" - thanks...');
    expect(smsSegments(text)).toBe(1);
  });
});

describe('planDailyMessages', () => {
  const company: PlanCompany = {
    id: 'c1',
    name: 'Crystal Clear',
    phone: '0118 000 0000',
    notify_visit_reminder: true,
    notify_job_done: true,
    notify_overdue: true,
    chase_every_days: 7,
    tpl_visit_reminder: null,
    tpl_job_done: null,
    tpl_overdue: null,
  };
  const customer = (id: string, extra: Partial<PlanCustomer> = {}): PlanCustomer => ({
    id,
    name: 'Sam Smith',
    email: 'sam@example.com',
    phone: null,
    preferred_contact: 'email',
    is_active: true,
    portal_token: `tok-${id}`,
    ...extra,
  });
  const base = {
    company,
    today: '2026-10-16',
    siteUrl: 'https://crm.test',
    jobsTomorrow: [],
    jobsDone: [],
    overdueInvoices: [],
  };

  it('sends one reminder per customer for tomorrow, with their portal link', () => {
    const planned = planDailyMessages({
      ...base,
      jobsTomorrow: [
        { id: 'j1', scheduled_date: '2026-10-17', customer: customer('a') },
        { id: 'j2', scheduled_date: '2026-10-17', customer: customer('a') },
        { id: 'j3', scheduled_date: '2026-10-18', customer: customer('b') },
      ],
    });
    expect(planned).toHaveLength(1);
    expect(planned[0]).toMatchObject({
      kind: 'visit_reminder',
      dedupeKey: 'visit:j1',
      channel: 'email',
    });
    expect(planned[0]!.body).toContain('https://crm.test/portal/tok-a');
    expect(planned[0]!.body).toContain('Hi Sam');
    expect(planned[0]!.subject).toBe('Your window clean is tomorrow');
  });

  it('skips archived and do-not-contact customers', () => {
    const planned = planDailyMessages({
      ...base,
      jobsDone: [
        { id: 'j1', scheduled_date: '2026-10-16', customer: customer('a', { is_active: false }) },
        {
          id: 'j2',
          scheduled_date: '2026-10-16',
          customer: customer('b', { preferred_contact: 'none' }),
        },
      ],
    });
    expect(planned).toEqual([]);
  });

  it('respects the switches', () => {
    const planned = planDailyMessages({
      ...base,
      company: { ...company, notify_job_done: false },
      jobsDone: [{ id: 'j1', scheduled_date: '2026-10-16', customer: customer('a') }],
    });
    expect(planned).toEqual([]);
  });

  it('uses a custom template when one is set', () => {
    const planned = planDailyMessages({
      ...base,
      company: { ...company, tpl_job_done: 'Done at {first_name}s! {link}' },
      jobsDone: [
        {
          id: 'j1',
          scheduled_date: '2026-10-16',
          customer: customer('a', { preferred_contact: 'sms', phone: '07700900123' }),
        },
      ],
    });
    expect(planned[0]).toMatchObject({ channel: 'sms', to: '+447700900123', subject: null });
    expect(planned[0]!.body).toBe('Done at Sams! https://crm.test/portal/tok-a');
  });

  it('chases on day one, then every N days, then stops', () => {
    const chase = (due: string) =>
      planDailyMessages({
        ...base,
        overdueInvoices: [
          {
            id: 'i1',
            number: 'INV-0001',
            due_date: due,
            total: 21.5,
            pay_token: 'pay1',
            customer: customer('a'),
          },
        ],
      });

    expect(chase('2026-10-16')).toEqual([]); // due today, not overdue
    expect(chase('2026-10-15')[0]!.dedupeKey).toBe('overdue:i1:0'); // 1 day
    expect(chase('2026-10-09')[0]!.dedupeKey).toBe('overdue:i1:0'); // 7 days, same bucket
    expect(chase('2026-10-08')[0]!.dedupeKey).toBe('overdue:i1:1'); // 8 days, next chase
    const body = chase('2026-10-08')[0]!.body;
    expect(body).toContain('£21.50');
    expect(body).toContain('8 days overdue');
    expect(body).toContain('https://crm.test/pay/pay1');
    // 7 * MAX_CHASES + 1 days over: no more automatic chasers.
    expect(chase('2026-08-30')).toEqual([]);
    expect(MAX_CHASES).toBe(5);
  });
});
