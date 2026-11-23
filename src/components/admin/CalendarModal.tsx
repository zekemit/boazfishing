'use client';

import { useEffect, useState } from 'react';
import { Apple, CalendarDays, Check, Copy, ExternalLink, RefreshCw, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useToast } from './Toast';

interface Feed {
  feedUrl: string;
  webcalUrl: string;
}

/** "Integrate Calendar": one private link that puts every booking on the instructor's phone calendar. */
export function CalendarModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    api<Feed>('/api/calendar').then(setFeed).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function copy() {
    if (!feed) return;
    try {
      await navigator.clipboard.writeText(feed.feedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.info('Press and hold the link to copy it.');
    }
  }
  async function reset() {
    try {
      setFeed(await api<Feed>('/api/calendar', { method: 'POST', json: { action: 'rotate' } }));
      setConfirmReset(false);
      toast.success('New link created. Subscribe again with the new link.');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const enc = feed ? encodeURIComponent(feed.webcalUrl) : '';
  const targets = feed
    ? [
        { icon: Apple, label: 'Apple Calendar (iPhone)', hint: 'Tap, then Subscribe', href: feed.webcalUrl, external: false },
        { icon: CalendarDays, label: 'Google Calendar', hint: 'Adds it to your account', href: `https://calendar.google.com/calendar/r?cid=${enc}`, external: true },
        { icon: CalendarDays, label: 'Outlook', hint: 'Opens Outlook on the web', href: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed.feedUrl)}&name=${encodeURIComponent('Boaz Fishing Co. Lessons')}`, external: true },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-river-950/70 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="cal-title" className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-sand p-5 shadow-lift sm:p-7">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-200">
          <X className="h-5 w-5" />
        </button>
        <h2 id="cal-title" className="display-md pr-10 text-3xl">
          Integrate Calendar
        </h2>
        <p className="prose-serif mt-1 text-ink-soft">Subscribe once and every booking appears on your phone’s calendar. New, changed and cancelled lessons update on their own.</p>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 font-medium text-red-800">{error}</p>}
        {!feed && !error && <div className="mt-5 h-40 animate-pulse rounded-xl bg-sand-200" />}

        {feed && (
          <>
            <p className="label mt-5">Your private calendar link</p>
            <div className="flex gap-2">
              <input readOnly value={feed.feedUrl} aria-label="Calendar feed URL" onFocus={(e) => e.currentTarget.select()} className="field !min-h-[48px] min-w-0 font-mono !text-sm" data-testid="feed-url" />
              <button type="button" onClick={() => void copy()} className={cn('btn shrink-0', copied ? 'bg-river text-white' : 'btn-primary')}>
                {copied ? <Check className="h-5 w-5" aria-hidden /> : <Copy className="h-5 w-5" aria-hidden />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-1.5 text-sm text-ink-mute">Anyone with this link can see your lessons, so keep it to yourself.</p>

            <p className="label mt-5">One-tap subscribe</p>
            <ul className="grid gap-2">
              {targets.map((t) => (
                <li key={t.label}>
                  <a href={t.href} {...(t.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="flex min-h-[56px] items-center gap-3 rounded-xl border border-sand-300 bg-white px-4 py-2 hover:border-river">
                    <t.icon className="h-6 w-6 shrink-0 text-river" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{t.label}</span>
                      <span className="text-sm text-ink-mute">{t.hint}</span>
                    </span>
                    {t.external && <ExternalLink className="h-4 w-4 text-ink-mute" aria-hidden />}
                  </a>
                </li>
              ))}
            </ul>
            <details className="mt-4 rounded-xl bg-sand-100 p-4 text-sm text-ink-soft">
              <summary className="cursor-pointer font-semibold text-ink">Add it by hand</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li><strong>iPhone:</strong> Settings, Calendar, Accounts, Add Account, Other, Add Subscribed Calendar, paste the link.</li>
                <li><strong>Google Calendar:</strong> Other calendars, plus, From URL, paste the link.</li>
                <li><strong>Outlook:</strong> Add calendar, Subscribe from web, paste the link.</li>
              </ol>
              <p className="mt-2">Phones refresh subscribed calendars every few hours, so a brand-new booking can take a while to appear. The alerts tab pings you instantly.</p>
            </details>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-sand-300 pt-4">
              <p className="text-sm text-ink-mute">Single bookings: use “Add to Google Calendar” or “Download .ics” on any booking.</p>
              {confirmReset ? (
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => void reset()} className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white">Yes, reset it</button>
                  <button type="button" onClick={() => setConfirmReset(false)} className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-sand-200">Keep</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-river underline underline-offset-4">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Reset link
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
