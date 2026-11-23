import type { NotifyStatus } from '@/lib/types';
import { alertEmail, boazPhone, env, ntfyLive, smsLive, smtpLive } from './config';

export interface SendResult {
  status: NotifyStatus;
  error?: string;
}

const fail = (e: unknown): SendResult => ({ status: 'failed', error: e instanceof Error ? e.message.slice(0, 300) : 'Unknown error' });

/** Email over SMTP (Gmail app password by default; any SMTP host works). Never throws. */
export async function sendEmail(to: string, subject: string, text: string, html: string, ics?: string, icsMethod: 'PUBLISH' | 'CANCEL' = 'PUBLISH'): Promise<SendResult> {
  if (!smtpLive()) return { status: 'simulated' };
  try {
    const nodemailer = (await import('nodemailer')).default;
    const port = Number(env('SMTP_PORT')) || 465;
    const transport = nodemailer.createTransport({
      host: env('SMTP_HOST') || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });
    await transport.sendMail({
      from: env('EMAIL_FROM') || `Boaz Fishing Co. <${env('SMTP_USER')}>`,
      to,
      replyTo: env('BOAZ_EMAIL') || env('SMTP_USER'),
      subject,
      text,
      html,
      ...(ics ? { icalEvent: { method: icsMethod, content: ics, filename: 'lesson.ics' } } : {}),
    });
    return { status: 'sent' };
  } catch (e) {
    return fail(e);
  }
}

/** Push notification to Boaz's phone through ntfy.sh (free, no account, no key: just a private topic name). */
export async function sendNtfy(title: string, message: string, click?: string): Promise<SendResult> {
  if (!ntfyLive()) return { status: 'simulated' };
  try {
    const base = (env('NTFY_SERVER') || 'https://ntfy.sh').replace(/\/$/, '');
    const headers: Record<string, string> = {
      // Header values must be plain ASCII.
      Title: title.replace(/[^\x20-\x7e]/g, ''),
      Priority: 'high',
      Tags: 'fishing_pole_and_fish',
    };
    if (click) headers.Click = click;
    const res = await fetch(`${base}/${encodeURIComponent(env('NTFY_TOPIC'))}`, { method: 'POST', body: message, headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`ntfy responded ${res.status}`);
    return { status: 'sent' };
  } catch (e) {
    return fail(e);
  }
}

/** Optional real text message to Boaz through Twilio's REST API. */
export async function sendSms(body: string): Promise<SendResult> {
  if (!smsLive()) return { status: 'simulated' };
  try {
    const sid = env('TWILIO_ACCOUNT_SID');
    const base = env('TWILIO_API_BASE') || 'https://api.twilio.com';
    const res = await fetch(`${base}/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${env('TWILIO_AUTH_TOKEN')}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: boazPhone() ?? '', From: env('TWILIO_FROM'), Body: body }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Twilio responded ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return { status: 'sent' };
  } catch (e) {
    return fail(e);
  }
}

export const alertEmailTo = (): string => alertEmail();
