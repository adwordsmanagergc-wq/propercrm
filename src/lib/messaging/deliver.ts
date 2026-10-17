import 'server-only';
import type { MessageChannel, MessageStatus } from '@/lib/types/database';

/**
 * Sends one email (Resend) or one text (Twilio). Both are plain HTTPS calls,
 * so there is no SDK to keep up to date. A deploy without the keys does not
 * fail: the message is logged as skipped with the reason, and the office sees
 * it in the customer's message history.
 */

export interface Outgoing {
  channel: MessageChannel;
  to: string;
  subject: string | null;
  body: string;
  fromName: string;
  replyTo?: string | null;
  smsSender?: string | null;
}

export interface DeliveryResult {
  status: MessageStatus;
  providerId?: string;
  error?: string;
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function smsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM,
  );
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Plain text in, simple readable HTML out, with links made clickable. */
export function textToHtml(text: string): string {
  const linked = escapeHtml(text).replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}" style="color:#0A6A75">${url}</a>`,
  );
  const paragraphs = linked
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return (
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;' +
    `line-height:1.5;color:#0D1B22;max-width:560px">${paragraphs}</div>`
  );
}

async function sendEmail(message: Outgoing): Promise<DeliveryResult> {
  if (!emailConfigured()) {
    return {
      status: 'skipped',
      error: 'Email is not set up on this deploy (RESEND_API_KEY, EMAIL_FROM)',
    };
  }
  const fromAddress = process.env.EMAIL_FROM!;
  const from = fromAddress.includes('<')
    ? fromAddress
    : `${message.fromName.replace(/[<>"]/g, '')} <${fromAddress}>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject ?? message.fromName,
      text: message.body,
      html: textToHtml(message.body),
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok)
    return { status: 'failed', error: payload.message ?? `Email failed (${response.status})` };
  return { status: 'sent', providerId: payload.id };
}

async function sendSms(message: Outgoing): Promise<DeliveryResult> {
  if (!smsConfigured()) {
    return {
      status: 'skipped',
      error:
        'Texts are not set up on this deploy (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)',
    };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const configuredFrom = process.env.TWILIO_FROM!;
  const params = new URLSearchParams({ To: message.to, Body: message.body });

  if (configuredFrom.startsWith('MG')) {
    params.set('MessagingServiceSid', configuredFrom);
  } else {
    // A company's own sender name ("JBCWindows") when alphanumeric senders are
    // allowed on the account, otherwise the shared number.
    const alpha = process.env.TWILIO_ALLOW_ALPHA_SENDER === 'true' && message.smsSender;
    params.set('From', alpha ? message.smsSender! : configuredFrom);
  }

  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const payload = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };
  if (!response.ok)
    return { status: 'failed', error: payload.message ?? `Text failed (${response.status})` };
  return { status: 'sent', providerId: payload.sid };
}

export async function deliver(message: Outgoing): Promise<DeliveryResult> {
  try {
    return message.channel === 'email' ? await sendEmail(message) : await sendSms(message);
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : 'Could not send' };
  }
}
