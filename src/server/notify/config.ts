import type { ChannelStatus } from '@/lib/types';

/** Everything is optional. With no keys set, notifications are simulated and logged (see Admin > Alerts). */
export const env = (key: string): string => process.env[key]?.trim() ?? '';

/** Boaz's own phone number, from BOAZ_PHONE (kept out of the code so it never lands in the public repo). */
export const boazPhone = (): string | null => env('BOAZ_PHONE') || null;
export const phoneDigits = (p: string): string => p.replace(/\D/g, '');
export function prettyPhone(p: string): string {
  const d = phoneDigits(p).replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : p;
}

export const smtpLive = (): boolean => Boolean(env('SMTP_USER') && env('SMTP_PASS'));
/** Gmail without an app password: a tiny Google Apps Script web app that sends the mail from Boaz's own Gmail. */
export const webhookLive = (): boolean => Boolean(env('EMAIL_WEBHOOK_URL') && env('EMAIL_WEBHOOK_SECRET'));
export const emailLive = (): boolean => smtpLive() || webhookLive();
export const boazEmail = (): string => env('BOAZ_EMAIL') || env('SMTP_USER');
export const alertEmail = (): string => env('BOAZ_ALERT_EMAIL');
export const ntfyLive = (): boolean => Boolean(env('NTFY_TOPIC'));
export const smsLive = (): boolean => Boolean(env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_FROM') && boazPhone());

export function siteUrl(): string {
  const explicit = env('SITE_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = env('VERCEL_PROJECT_PRODUCTION_URL');
  return vercel ? `https://${vercel}` : 'http://localhost:3000';
}

export function channelStatuses(): ChannelStatus[] {
  return [
    {
      channel: 'email',
      label: 'Student emails',
      live: emailLive(),
      detail: emailLive() ? `Sending from ${smtpLive() ? env('EMAIL_FROM') || env('SMTP_USER') : boazEmail() || 'your Gmail'}${smtpLive() ? '' : ' (Google Apps Script)'}` : 'Not set up. Emails are simulated and logged below.',
    },
    {
      channel: 'ntfy',
      label: 'Phone push (ntfy)',
      live: ntfyLive(),
      detail: ntfyLive() ? `Pushing to your ntfy topic` : 'Not set up. Phone alerts are simulated and logged below.',
    },
    {
      channel: 'sms',
      label: 'Text message (Twilio)',
      live: smsLive(),
      detail: smsLive() ? `Texting ${boazPhone()}` : 'Optional. Add Twilio keys to also send real texts.',
    },
    {
      channel: 'alert-email',
      label: 'Alert email or carrier text gateway',
      live: Boolean(alertEmail()) && emailLive(),
      detail: alertEmail() ? (emailLive() ? `Alerts also go to ${alertEmail()}` : 'Needs the email keys above.') : 'Optional. Any address, including a carrier email-to-text address.',
    },
  ];
}
