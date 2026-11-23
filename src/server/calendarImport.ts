import ICAL from 'ical.js';
import type { BusyEvent, CalendarImport } from '@/lib/types';
import { pad2 } from '@/lib/time';
import { localToUtc } from './clock';

const DAY = 86_400_000;
const HORIZON_DAYS = 200;
const MAX_EVENTS = 3000;
const MAX_ITER = 20_000;
export const MAX_ICS_BYTES = 8 * 1024 * 1024;

type Time = InstanceType<typeof ICAL.Time>;

/** Floating times (no zone) mean "the wall clock where Boaz is", so read them in the business time zone. */
function toMs(t: Time): number {
  const floating = !t.zone || t.zone === ICAL.Timezone.localTimezone || t.zone.tzid === 'floating';
  if (t.isDate || floating) return localToUtc(`${t.year}-${pad2(t.month)}-${pad2(t.day)}`, t.isDate ? '00:00' : `${pad2(t.hour)}:${pad2(t.minute)}`).getTime();
  return t.toUnixTime() * 1000;
}

/** Turn an .ics file into the busy blocks from now until about 200 days ahead. Recurring events are expanded. */
export function parseIcs(text: string, nowMs: number = Date.now()): BusyEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const vtz of root.getAllSubcomponents('vtimezone')) {
    try {
      ICAL.TimezoneService.register(vtz);
    } catch {
      /* a broken zone definition: its events fall back to the business time zone */
    }
  }
  const events = root.getAllSubcomponents('vevent').map((v) => new ICAL.Event(v));
  const masters = new Map<string, InstanceType<typeof ICAL.Event>>();
  for (const e of events) if (!e.recurrenceId) masters.set(e.uid, e);
  for (const e of events) if (e.recurrenceId) masters.get(e.uid)?.relateException(e);

  const from = nowMs - DAY;
  const until = nowMs + HORIZON_DAYS * DAY;
  const out: BusyEvent[] = [];

  const push = (title: string, st: Time, en: Time) => {
    const allDay = st.isDate;
    const s = toMs(st);
    let e = en ? toMs(en) : s;
    if (e <= s) e = s + (allDay ? DAY : 3_600_000);
    if (e < from || s > until) return;
    out.push({ s, e, title: (title || 'Busy').slice(0, 80), allDay });
  };

  for (const m of masters.values()) {
    try {
      const status = String(m.component.getFirstPropertyValue('status') ?? '').toUpperCase();
      const transp = String(m.component.getFirstPropertyValue('transp') ?? '').toUpperCase();
      if (status === 'CANCELLED' || transp === 'TRANSPARENT') continue;
      // Events that came from this site's own calendar feed are lessons already on the books, not outside commitments.
      if (/^b_[a-f0-9]+@/.test(m.uid)) continue;
      if (m.isRecurring()) {
        const it = m.iterator();
        for (let n = 0, next = it.next(); next && n < MAX_ITER; n++, next = it.next()) {
          const d = m.getOccurrenceDetails(next);
          if (toMs(d.startDate) > until) break;
          const dStatus = String(d.item.component.getFirstPropertyValue('status') ?? '').toUpperCase();
          if (dStatus === 'CANCELLED') continue;
          push(d.item.summary, d.startDate, d.endDate);
        }
      } else {
        push(m.summary, m.startDate, m.endDate);
      }
    } catch {
      /* skip one unreadable event rather than failing the whole import */
    }
    if (out.length >= MAX_EVENTS) break;
  }
  return out.sort((a, b) => a.s - b.s).slice(0, MAX_EVENTS);
}

/* ------------------------------------------------------------------ fetching */

function privateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return true;
  return h === '::1' || /^f[cd]/.test(h) || h.startsWith('fe80');
}

export function cleanCalendarUrl(raw: string): string {
  const url = new URL(raw.trim().replace(/^webcal:\/\//i, 'https://'));
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Use an https:// or webcal:// calendar link.');
  if (process.env.NODE_ENV === 'production' && privateHost(url.hostname)) throw new Error('That address is not a public calendar link.');
  return url.toString();
}

export async function fetchIcs(raw: string): Promise<string> {
  const url = cleanCalendarUrl(raw);
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000), cache: 'no-store', headers: { Accept: 'text/calendar, text/plain, */*' } });
  if (!res.ok) throw new Error(`The calendar link answered ${res.status}. Check that it is the secret iCal address.`);
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > MAX_ICS_BYTES) throw new Error('That calendar file is too large.');
  const text = await res.text();
  if (text.length > MAX_ICS_BYTES) throw new Error('That calendar file is too large.');
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('That link did not return a calendar. Use the "secret address in iCal format".');
  return text;
}

export async function buildImport(source: { url: string } | { ics: string; name?: string }): Promise<CalendarImport> {
  const isUrl = 'url' in source;
  const text = isUrl ? await fetchIcs(source.url) : source.ics;
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('That file is not a calendar (.ics).');
  let events: BusyEvent[];
  try {
    events = parseIcs(text);
  } catch {
    throw new Error('Could not read that calendar file.');
  }
  return {
    source: isUrl ? 'url' : 'file',
    ...(isUrl ? { url: cleanCalendarUrl(source.url) } : {}),
    label: isUrl ? new URL(cleanCalendarUrl(source.url)).hostname : (source.name || 'Uploaded calendar').slice(0, 80),
    syncedAt: new Date().toISOString(),
    events,
  };
}
