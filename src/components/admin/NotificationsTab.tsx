'use client';

import { useState } from 'react';
import { BellRing, CheckCircle2, CircleDashed, Mail, Play, Send, Smartphone, TriangleAlert } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { notifyChange } from '@/lib/sync';
import type { NotificationEntry, NotificationsPayload } from '@/lib/types';
import { useRemote } from '@/hooks/useRemote';
import { useToast } from './Toast';

const KIND: Record<NotificationEntry['kind'], string> = {
  student_confirmation: 'Student confirmation',
  student_approved: 'Student approval',
  student_cancelled: 'Student cancellation',
  boaz_cancelled: 'Student cancelled alert',
  student_reminder: 'Student reminder',
  boaz_alert: 'New booking alert',
  boaz_agenda: 'Morning agenda',
  test: 'Test',
};
const CHANNEL: Record<string, string> = { email: 'Email', ntfy: 'Phone push', sms: 'Text' };
const STATUS: Record<NotificationEntry['status'], { label: string; cls: string }> = {
  sent: { label: 'Sent', cls: 'bg-river-100 text-river-700' },
  simulated: { label: 'Simulated', cls: 'bg-sunset-100 text-sunset-700' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-800' },
};

export function NotificationsTab() {
  const toast = useToast();
  const { data, error, loading, refresh } = useRemote<NotificationsPayload>('/api/notifications', 20_000);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function test(target: 'phone' | 'agenda' | 'email') {
    setBusy(target);
    try {
      const r = await api<{ results: { channel: string; status: string; error?: string }[] }>('/api/notifications', { method: 'POST', json: target === 'email' ? { target, to: email } : { target } });
      await refresh();
      notifyChange();
      const bad = r.results.find((x) => x.status === 'failed');
      if (bad) toast.error(`Test failed: ${bad.error ?? 'unknown error'}`);
      else if (r.results.every((x) => x.status === 'simulated')) toast.info('Simulated: no keys are set yet, so nothing left the server. It is logged below.');
      else toast.success('Test sent. Check your phone or inbox.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function runReminders() {
    setBusy('reminders');
    try {
      const r = await api<{ studentReminders: { sent: number; simulated: number; failed: number }; agenda: string; lessonsToday: number }>('/api/reminders', { method: 'POST' });
      await refresh();
      const n = r.studentReminders.sent + r.studentReminders.simulated;
      toast.success(`Reminders checked: ${n} student reminder${n === 1 ? '' : 's'} sent, morning agenda ${r.agenda.replace('-', ' ')}.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const live = data?.channels.some((c) => c.live);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display-md text-3xl">Alerts</h2>
          <p className="prose-serif text-ink-soft">Every email to a student and every alert to your phone, including the ones that were only simulated.</p>
        </div>
        <button type="button" onClick={() => void runReminders()} disabled={busy !== null} className="btn-outline btn-sm">
          <Play className="h-4 w-4" aria-hidden /> Run reminders now
        </button>
      </div>

      {!live && data && (
        <p className="flex gap-3 rounded-2xl border border-sunset bg-sunset-50 p-4 text-sunset-700" role="status">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span>
            <strong>Running in simulation.</strong> Bookings work normally and every message is logged here, but nothing is actually sent until you add the keys below.
          </span>
        </p>
      )}

      {error && !data && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 font-medium text-red-800">{error}</p>}
      {loading && !data && <div className="h-40 animate-pulse rounded-2xl bg-sand-200" />}

      {data && (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.channels.map((c) => (
              <li key={c.channel} className={cn('flex gap-3 rounded-2xl border bg-white p-4', c.live ? 'border-river-200' : 'border-sand-300')} data-testid={`channel-${c.channel}`}>
                {c.live ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-river-500" aria-hidden /> : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-ink-mute" aria-hidden />}
                <div className="min-w-0">
                  <p className="font-bold">
                    {c.label} <span className={cn('ml-1 rounded-full px-2 py-0.5 text-xs', c.live ? 'bg-river-100 text-river-700' : 'bg-sand-200 text-ink-mute')}>{c.live ? 'Live' : 'Simulated'}</span>
                  </p>
                  <p className="text-sm text-ink-soft">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <section className="rounded-2xl border border-sand-300 bg-white p-4 sm:p-5" aria-label="Send a test">
            <h3 className="display-md text-xl">Send test now</h3>
            <p className="text-sm text-ink-soft">
              Alerts go to {data.boazPhone ? <strong>{data.boazPhone}</strong> : 'the phone you set up'}. A test goes through the same senders as a real booking.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void test('phone')} disabled={busy !== null} className="btn-primary">
                <Smartphone className="h-5 w-5" aria-hidden /> {busy === 'phone' ? 'Sending...' : 'Test phone alert'}
              </button>
              <button type="button" onClick={() => void test('agenda')} disabled={busy !== null} className="btn-outline">
                <BellRing className="h-5 w-5" aria-hidden /> {busy === 'agenda' ? 'Sending...' : 'Test morning agenda'}
              </button>
            </div>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void test('email');
              }}
            >
              <label htmlFor="test-email" className="sr-only">Send a test student email to</label>
              <input id="test-email" type="email" inputMode="email" placeholder="Send a sample student email to..." value={email} onChange={(e) => setEmail(e.target.value)} className="field !min-h-[48px]" />
              <button type="submit" disabled={busy !== null || !email} className="btn-dark shrink-0">
                <Send className="h-4 w-4" aria-hidden /> {busy === 'email' ? 'Sending...' : 'Send test email'}
              </button>
            </form>
          </section>

          <details className="rounded-2xl border border-sand-300 bg-white p-4 sm:p-5">
            <summary className="cursor-pointer font-bold">Turn on live sending (free, about 5 minutes)</summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-soft">
              <li><strong>Phone alerts:</strong> install the free <em>ntfy</em> app, subscribe to a private topic name, then set <code>NTFY_TOPIC</code> to that name.</li>
              <li><strong>Student emails:</strong> create a Gmail app password and set <code>SMTP_USER</code> (the Gmail address) and <code>SMTP_PASS</code>.</li>
              <li><strong>Your contact info in emails:</strong> set <code>BOAZ_PHONE</code> and <code>BOAZ_EMAIL</code>.</li>
              <li><strong>Scheduled reminders:</strong> {data.cronProtected ? 'protected with CRON_SECRET and running daily.' : 'set CRON_SECRET so the daily job can run.'}</li>
            </ol>
            <p className="mt-2 text-sm text-ink-mute">The README has the full checklist, including optional Twilio text messages.</p>
          </details>

          <section aria-label="Notification log">
            <h3 className="display-md text-xl">Log</h3>
            {data.entries.length === 0 ? (
              <p className="mt-2 rounded-2xl border border-dashed border-sand-400 bg-white p-6 text-ink-soft">Nothing yet. The first booking, reminder or test will appear here.</p>
            ) : (
              <ul className="mt-2 grid gap-2" data-testid="notification-log">
                {data.entries.map((n) => (
                  <li key={n.id} className="rounded-xl border border-sand-300 bg-white p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', STATUS[n.status].cls)}>{STATUS[n.status].label}</span>
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        {n.channel === 'email' ? <Mail className="h-4 w-4" aria-hidden /> : <Smartphone className="h-4 w-4" aria-hidden />}
                        {KIND[n.kind]}
                      </span>
                      <span className="text-sm text-ink-mute">{CHANNEL[n.channel] ?? n.channel}, to {n.to}</span>
                      <time className="ml-auto text-xs text-ink-mute" dateTime={n.at}>{new Date(n.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
                    </div>
                    <p className="mt-1.5 font-semibold">{n.subject}</p>
                    {n.error && <p className="mt-1 text-sm font-medium text-red-700">{n.error}</p>}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-sm font-semibold text-river">See the message</summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-sand-100 p-3 font-sans text-sm text-ink-soft">{n.body}</pre>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
