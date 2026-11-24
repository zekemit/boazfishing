'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, CalendarCheck, ChevronDown, Link2, Loader2, Plus, RefreshCw, Sparkles, Trash2, Undo2, Upload, Waves } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { WEEKDAY_SHORT, fmt12, fmtDateLong, fmtRange, timeOptions } from '@/lib/time';
import type { SuggestPrefs } from '@/lib/types';
import { useRemote } from '@/hooks/useRemote';
import { useToast } from './Toast';

interface Item {
  id: string;
  date: string;
  start: string;
  end: string;
  kind: 'tide' | 'flex';
  high: string | null;
  fits: { packageId: string; name: string; starts: string[] }[];
  score: number;
  tags: string[];
  trimmedBy: { title: string; start: string; end: string }[];
}
type CalendarState =
  | { connected: false }
  | { connected: true; source: 'url' | 'file'; label: string; syncedAt: string; count: number; error: string | null; canRefresh: boolean };
interface Payload {
  prefs: SuggestPrefs;
  calendar: CalendarState;
  tideUnavailable: boolean;
  items: Item[];
  alreadyOpen: number;
  noFit: number;
}
interface AddResult {
  added: number;
  skipped: number;
  days: number;
  ids: string[];
}

const TIMES = timeOptions('05:00', '23:30');
const AHEAD = [
  { days: 14, label: '2 weeks' },
  { days: 28, label: '4 weeks' },
  { days: 56, label: '8 weeks' },
  { days: 84, label: '12 weeks' },
];
const BUFFERS = [0, 15, 30, 60, 90];
const SHORT_NAME: Record<string, string> = { 'session-1': 'Session 1', 'session-2': 'Session 2', 'session-3': 'Session 3' };

function ago(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} hr ago` : `${Math.round(h / 24)} days ago`;
}

function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} onClick={onClick} className={cn('min-h-[40px] min-w-[44px] rounded-lg border-2 px-3 text-sm font-bold transition-colors', on ? 'border-river bg-river text-white' : 'border-sand-300 bg-white text-ink-soft hover:border-river/50')}>
      {children}
    </button>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string | number; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-ink-soft">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="min-h-[44px] rounded-lg border-2 border-sand-300 bg-white px-2 font-medium text-ink">
        {children}
      </select>
    </label>
  );
}

/** Ranked, one-tap availability suggestions built from tides, Boaz's own calendar and what is already open. */
export function SuggestedAvailability({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const { data, error, loading, refresh } = useRemote<Payload>('/api/suggestions', 60_000);
  const [open, setOpen] = useState(true);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [calUrl, setCalUrl] = useState('');
  const [undo, setUndo] = useState<{ ids: string[]; label: string } | null>(null);
  const [prefs, setPrefs] = useState<SuggestPrefs | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (data && !saveTimer.current) setPrefs(data.prefs);
  }, [data]);

  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 12_000);
    return () => window.clearTimeout(t);
  }, [undo]);

  const items = data?.items ?? [];
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of items) m.set(i.date, [...(m.get(i.date) ?? []), i]);
    return [...m.entries()];
  }, [items]);

  async function changed() {
    await refresh();
    onChanged();
  }

  async function savePrefs(next: SuggestPrefs) {
    setPrefs(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await api('/api/suggestions', { method: 'PUT', json: next });
        saveTimer.current = undefined;
        await refresh();
      } catch (e) {
        saveTimer.current = undefined;
        toast.error(errorMessage(e));
      }
    }, 450);
  }

  async function add(list: Item[], label: string) {
    setBusy(label);
    try {
      const r = await api<AddResult>('/api/availability', { method: 'POST', json: { action: 'add-many', items: list.map((i) => ({ date: i.date, start: i.start, end: i.end })) } });
      if (r.added === 0) toast.error('Those times were already taken. The list is refreshing.');
      else {
        toast.success(`Added ${r.added} time block${r.added === 1 ? '' : 's'} across ${r.days} day${r.days === 1 ? '' : 's'}. ${r.skipped ? `Skipped ${r.skipped} that no longer fit. ` : ''}Live on the booking calendar.`);
        setUndo({ ids: r.ids, label: r.added === 1 && list[0] ? `${fmtRange(list[0].start, list[0].end)}` : `${r.added} blocks` });
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
      await changed();
    }
  }

  async function undoLast() {
    if (!undo) return;
    const ids = undo.ids;
    setUndo(null);
    try {
      await Promise.all(ids.map((id) => api(`/api/availability?id=${encodeURIComponent(id)}`, { method: 'DELETE' })));
      toast.info('Removed. Those times are suggested again.');
    } catch (e) {
      toast.error(errorMessage(e));
    }
    await changed();
  }

  async function connect(body: Record<string, unknown>, label: string) {
    setBusy('cal');
    try {
      const r = await api<{ label: string; count: number }>('/api/calendar/import', { method: 'POST', json: body });
      toast.success(`${label}: ${r.count} upcoming busy block${r.count === 1 ? '' : 's'} found. Suggestions now avoid them.`);
      setCalUrl('');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
      await changed();
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast.error('That file is over 8 MB.');
    await connect({ ics: await file.text(), name: file.name }, 'Calendar file imported');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function disconnect() {
    setBusy('cal');
    try {
      await api('/api/calendar/import', { method: 'DELETE' });
      toast.info('Calendar disconnected.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
      await changed();
    }
  }

  const cal = data?.calendar;
  const p = prefs ?? data?.prefs;

  return (
    <section aria-labelledby="suggest-h" data-testid="suggestions" className="overflow-hidden rounded-2xl border-2 border-sunset/40 bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 bg-sunset-50 px-4 py-4 text-left sm:px-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sunset text-river-950">
          <Sparkles className="h-6 w-6" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span id="suggest-h" className="display-md block text-xl sm:text-2xl">Suggested availability</span>
          <span className="block text-sm text-ink-soft">
            {loading && !data ? 'Checking tides and your calendar…' : items.length ? `${items.length} ready-to-add time block${items.length === 1 ? '' : 's'} built from the tides${cal?.connected ? ' and your calendar' : ''}.` : 'Built from the tides, your calendar and what is already open.'}
          </span>
        </span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div className="grid gap-5 p-4 sm:p-6">
          {error && !data && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 font-medium text-red-800">{error}</p>}

          {/* what the suggestions are based on */}
          <ul className="flex flex-wrap gap-2 text-sm font-semibold">
            <li className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5', data?.tideUnavailable ? 'bg-red-50 text-red-800' : 'bg-river-50 text-river')}>
              <Waves className="h-4 w-4" aria-hidden /> {data?.tideUnavailable ? 'NOAA tides unreachable' : 'NOAA tides'}
            </li>
            <li className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5', cal?.connected ? 'bg-river-50 text-river' : 'bg-sand-100 text-ink-soft')}>
              <CalendarCheck className="h-4 w-4" aria-hidden /> {cal?.connected ? `Calendar: ${cal.count} busy block${cal.count === 1 ? '' : 's'}` : 'Calendar not connected'}
            </li>
            <li className="flex items-center gap-1.5 rounded-full bg-river-50 px-3 py-1.5 text-river">Open times and bookings</li>
          </ul>

          {data?.tideUnavailable && (
            <p role="alert" className="rounded-lg border border-sunset-300 bg-sunset-50 p-3 text-sm text-sunset-700">Tide times couldn&apos;t be loaded just now, so tide-timed suggestions are paused. Try again in a minute.</p>
          )}

          {/* calendar import */}
          <div className="rounded-xl border border-sand-300 p-4">
            {cal?.connected ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-0 flex-1 text-sm text-ink-soft">
                  <span className="font-semibold text-ink">Calendar connected</span> ({cal.source === 'url' ? cal.label : `file: ${cal.label}`}). Synced {ago(cal.syncedAt)}. Only busy times are used. Customers never see them.
                  {cal.error && <span className="mt-1 block font-medium text-red-700">Last refresh failed: {cal.error}</span>}
                </p>
                {cal.canRefresh && (
                  <button type="button" disabled={busy === 'cal'} onClick={() => void connect({ refresh: true }, 'Calendar refreshed')} className="btn-outline btn-sm">
                    {busy === 'cal' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />} Refresh
                  </button>
                )}
                <button type="button" disabled={busy === 'cal'} onClick={() => void disconnect()} className="btn-outline btn-sm">
                  <Trash2 className="h-4 w-4" aria-hidden /> Disconnect
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                <p className="text-sm text-ink-soft">
                  <span className="font-semibold text-ink">Connect your calendar</span> so suggestions skip school pickups, appointments and anything else you have going on. Read-only.
                </p>
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (calUrl.trim()) void connect({ url: calUrl.trim() }, 'Calendar connected');
                  }}
                >
                  <label className="sr-only" htmlFor="cal-url">Secret iCal address</label>
                  <input id="cal-url" value={calUrl} onChange={(e) => setCalUrl(e.target.value)} inputMode="url" autoComplete="off" spellCheck={false} placeholder="Paste your calendar's secret iCal address" className="min-h-[48px] min-w-0 flex-1 rounded-lg border-2 border-sand-300 px-3 text-base" />
                  <button type="submit" disabled={busy === 'cal' || !calUrl.trim()} className="btn-primary">
                    {busy === 'cal' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />} Connect
                  </button>
                  <button type="button" disabled={busy === 'cal'} onClick={() => fileRef.current?.click()} className="btn-outline">
                    <Upload className="h-4 w-4" aria-hidden /> Upload .ics
                  </button>
                  <input ref={fileRef} type="file" accept=".ics,text/calendar" className="sr-only" aria-label="Upload a calendar file" onChange={(e) => void onFile(e.target.files?.[0])} />
                </form>
                <details className="text-sm text-ink-soft">
                  <summary className="cursor-pointer font-semibold text-river">Where do I find that address?</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li><strong>Google Calendar</strong> (computer): Settings → click your calendar → <em>Integrate calendar</em> → copy <em>Secret address in iCal format</em>. It stays in sync and refreshes itself.</li>
                    <li><strong>Apple Calendar / iCloud</strong>: right-click the calendar → <em>Share Calendar</em> → turn on <em>Public Calendar</em> → copy the link.</li>
                    <li><strong>Outlook</strong>: Settings → Calendar → Shared calendars → <em>Publish a calendar</em> → copy the ICS link.</li>
                    <li>No link? Export the calendar as an <strong>.ics</strong> file and use <em>Upload .ics</em>. A file is a snapshot, so re-upload it when things change.</li>
                  </ul>
                </details>
              </div>
            )}
          </div>

          {/* preferences */}
          {p && (
            <div className="rounded-xl border border-sand-300">
              <button type="button" onClick={() => setPrefsOpen((v) => !v)} aria-expanded={prefsOpen} className="flex min-h-[48px] w-full items-center justify-between gap-2 px-4 text-left text-sm font-semibold">
                <span>
                  What I want <span className="font-normal text-ink-soft">· {p.days.length ? [...p.days].sort((a, b) => a - b).map((d) => WEEKDAY_SHORT[d]).join(', ') : 'no days'} · {fmt12(p.earliest)} to {fmt12(p.latest)} · {p.bufferMin} min buffer</span>
                </span>
                <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', prefsOpen && 'rotate-180')} aria-hidden />
              </button>
              {prefsOpen && (
                <div className="grid gap-4 border-t border-sand-300 p-4">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-ink-soft">Days I want lessons</p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Days of the week">
                      {WEEKDAY_SHORT.map((d, i) => (
                        <Chip key={d} on={p.days.includes(i)} label={d} onClick={() => void savePrefs({ ...p, days: p.days.includes(i) ? p.days.filter((x) => x !== i) : [...p.days, i] })}>
                          {d}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Select label="Earliest start" value={p.earliest} onChange={(v) => void savePrefs({ ...p, earliest: v })}>
                      {TIMES.map((t) => <option key={t} value={t}>{fmt12(t)}</option>)}
                    </Select>
                    <Select label="Latest finish" value={p.latest} onChange={(v) => void savePrefs({ ...p, latest: v })}>
                      {TIMES.map((t) => <option key={t} value={t}>{fmt12(t)}</option>)}
                    </Select>
                    <Select label="Keep clear around events" value={p.bufferMin} onChange={(v) => void savePrefs({ ...p, bufferMin: Number(v) })}>
                      {BUFFERS.map((b) => <option key={b} value={b}>{b === 0 ? 'No buffer' : `${b} minutes`}</option>)}
                    </Select>
                    <Select label="Look ahead" value={p.aheadDays} onChange={(v) => void savePrefs({ ...p, aheadDays: Number(v) })}>
                      {AHEAD.map((a) => <option key={a.days} value={a.days}>{a.label}</option>)}
                    </Select>
                  </div>
                  <label className="flex min-h-[44px] items-start gap-3 text-sm">
                    <input type="checkbox" checked={p.flex} onChange={(e) => void savePrefs({ ...p, flex: e.target.checked })} className="mt-1 h-5 w-5 accent-river" />
                    <span><span className="font-semibold">Also suggest Session 1 blocks</span><span className="block text-ink-soft">Morning and late-afternoon blocks in the free time around the tide windows. Session 1 (knots and casting) is not tide-timed, and every family needs one.</span></span>
                  </label>
                  <label className="flex min-h-[44px] items-start gap-3 text-sm">
                    <input type="checkbox" checked={p.allDayBusy} onChange={(e) => void savePrefs({ ...p, allDayBusy: e.target.checked })} className="mt-1 h-5 w-5 accent-river" />
                    <span><span className="font-semibold">Treat all-day calendar events as busy</span><span className="block text-ink-soft">Off by default, so holidays and birthdays do not block whole days.</span></span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* undo */}
          {undo && (
            <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-river px-4 py-3 text-white">
              <span className="text-sm font-medium">Added {undo.label}. It&apos;s live on the booking calendar.</span>
              <button type="button" onClick={() => void undoLast()} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-white/15 px-3 text-sm font-bold hover:bg-white/25">
                <Undo2 className="h-4 w-4" aria-hidden /> Undo
              </button>
            </div>
          )}

          {/* suggestions */}
          {loading && !data && <div className="h-40 animate-pulse rounded-xl bg-sand-100" />}
          {data && !items.length && !data.tideUnavailable && (
            <p className="rounded-xl bg-sand-100 p-5 text-ink-soft" data-testid="suggest-empty">
              {data.alreadyOpen ? 'Everything that fits is already open on your calendar. Nice.' : 'Nothing fits your settings right now. Try more days, a wider time range, or a smaller buffer.'}
            </p>
          )}
          {items.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">
                Each block opens exactly the lesson times shown. Tap <strong>Add</strong> and it&apos;s live.
                {data && data.alreadyOpen > 0 && ` ${data.alreadyOpen} day${data.alreadyOpen === 1 ? ' is' : 's are'} already open.`}
              </p>
              <button type="button" disabled={!!busy} onClick={() => void add(items, 'all')} className="btn-primary btn-sm" data-testid="add-all">
                {busy === 'all' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} Add all {items.length}
              </button>
            </div>
          )}
          <div className="grid gap-4">
            {groups.map(([date, list]) => (
              <div key={date}>
                <h3 className="display-md mb-2 text-lg">{fmtDateLong(date)}</h3>
                <ul className="grid gap-2">
                  {list.map((s) => (
                    <li key={s.id} data-testid="suggestion" data-kind={s.kind} className="flex flex-col gap-3 rounded-xl border-2 border-sand-300 p-3 sm:flex-row sm:items-center sm:p-4">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="display-md text-xl">{fmtRange(s.start, s.end)}</span>
                          {s.high ? (
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-river"><ArrowUp className="h-3.5 w-3.5" aria-hidden /> High tide {fmt12(s.high)}</span>
                          ) : (
                            <span className="text-sm font-semibold text-ink-soft">Session 1 only (not tide-timed)</span>
                          )}
                          {s.tags.map((t) => (
                            <span key={t} className={cn('rounded-full px-2 py-0.5 text-xs font-bold', t === 'Weekend' ? 'bg-river-50 text-river' : 'bg-sunset-50 text-sunset-700')}>{t}</span>
                          ))}
                        </p>
                        <p className="mt-1.5 flex flex-wrap gap-1.5">
                          {s.fits.map((f) => (
                            <span key={f.packageId} title={`Starts: ${f.starts.map(fmt12).join(', ')}`} className="rounded-md bg-sand-100 px-2 py-1 text-sm text-ink-soft">
                              <strong className="text-ink">{SHORT_NAME[f.packageId] ?? f.name}</strong> · {f.starts.length} start{f.starts.length === 1 ? '' : 's'}
                              {f.packageId !== 'session-1' && <span className="text-ink-mute"> ({f.starts.map(fmt12).join(', ')})</span>}
                            </span>
                          ))}
                        </p>
                        {s.trimmedBy.length > 0 && (
                          <p className="mt-1.5 text-sm font-medium text-sunset-700">
                            Trimmed around {s.trimmedBy.map((t) => `${t.title} (${fmtRange(t.start, t.end)})`).join(' and ')}
                          </p>
                        )}
                      </div>
                      <button type="button" disabled={!!busy} onClick={() => void add([s], s.id)} className="btn-primary w-full sm:w-auto" aria-label={`Add ${fmtRange(s.start, s.end)} on ${fmtDateLong(s.date)}`}>
                        {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} Add
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
