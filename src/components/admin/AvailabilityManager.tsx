'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarClock, ChevronLeft, ChevronRight, Plus, Sun, Sunrise, Sunset, Trash2, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { sessionLabel } from '@/lib/packages';
import { notifyChange } from '@/lib/sync';
import {
  WEEKDAY_SHORT,
  addDays,
  addMonths,
  eachDate,
  endOfMonth,
  fmt12,
  fmtDateLong,
  fmtDateShort,
  fmtDayNum,
  fmtMonth,
  fmtRange,
  monthCells,
  monthOf,
  pad2,
  startOfMonth,
  startOfWeek,
  timeOptions,
  toMin,
  weekday,
} from '@/lib/time';
import type { AdminAvailability, AvailabilityWindow, Booking } from '@/lib/types';
import { biteWindows, tideClock, tideClockShort, tideDay, tideMinutes, type BiteWindow, type TideExtreme, type TideRange } from '@/lib/tides';
import { useRemote } from '@/hooks/useRemote';
import { SuggestedAvailability } from './SuggestedAvailability';
import { useToast } from './Toast';

type Block = { start: string; end: string };
type DayData = { windows: AvailabilityWindow[]; bookings: Booking[] };
type BulkResult = { added: number; skipped: number; days: number; changed: number; removed: number };

const TIMES = timeOptions('05:00', '23:30');
const PRESETS: Array<Block & { label: string; icon: typeof Sun }> = [
  { label: 'Morning', start: '07:00', end: '11:00', icon: Sunrise },
  { label: 'Midday', start: '12:00', end: '16:00', icon: Sun },
  { label: 'Sunset', start: '17:00', end: '19:30', icon: Sunset },
];

function browserToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const compact = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const hr = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hr}:${pad2(m)}` : `${hr}`;
};
function compactRange(s: string, e: string): string {
  const sm = +s.slice(0, 2) >= 12 ? 'p' : 'a';
  const em = +e.slice(0, 2) >= 12 ? 'p' : 'a';
  return sm === em ? `${compact(s)}–${compact(e)}${em}` : `${compact(s)}${sm}–${compact(e)}${em}`;
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-river-500' : 'bg-ink-mute/45')}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="field !min-h-[44px] !py-2">
      {TIMES.map((t) => (
        <option key={t} value={t}>
          {fmt12(t)}
        </option>
      ))}
    </select>
  );
}

function bookedIn(w: AvailabilityWindow, bookings: Booking[]): number {
  return bookings.filter((b) => toMin(b.start) < toMin(w.end) && toMin(w.start) < toMin(b.end)).length;
}

type TideDays = Record<string, TideExtreme[]>;

/** Rising/falling "prime current" bands that touch a given day (legs can cross midnight, so use all days). */
function dayBiteWindows(all: TideExtreme[], date: string): BiteWindow[] {
  return biteWindows(all).filter((w) => tideDay(w.start) === date || tideDay(w.end) === date);
}

/** Minutes of a lesson block (HH:mm on `date`) that overlap a bite window. */
function overlapMin(date: string, w: AvailabilityWindow, bw: BiteWindow): number {
  const s = tideMinutes(`${date} ${w.start}`);
  const e = tideMinutes(`${date} ${w.end}`);
  return Math.max(0, Math.min(e, tideMinutes(bw.end)) - Math.max(s, tideMinutes(bw.start)));
}

const TideLine = ({ list }: { list: TideExtreme[] }) => (
  <>
    {list.map((e) => (
      <span key={e.t} className="inline-flex items-center gap-0.5 whitespace-nowrap">
        {e.type === 'H' ? <ArrowUp className="h-3 w-3" aria-label="High" /> : <ArrowDown className="h-3 w-3" aria-label="Low" />}
        {tideClockShort(e.t)}
      </span>
    ))}
  </>
);

/* ------------------------------------------------------------------ views */

function MonthView({ month, selected, today, byDate, tides, onSelect }: { month: string; selected: string; today: string; byDate: Map<string, DayData>; tides: TideDays; onSelect: (d: string) => void }) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-mute sm:gap-1.5 sm:text-sm">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="py-1.5">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {monthCells(month).map((d, i) => {
          if (!d) return <div key={`b${i}`} />;
          const v = byDate.get(d);
          const windows = v?.windows ?? [];
          const lessons = v?.bookings.length ?? 0;
          const isSel = d === selected;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={isSel}
              aria-label={`${fmtDateLong(d)}: ${windows.length} time blocks, ${lessons} lessons booked`}
              className={cn(
                'flex min-h-[62px] flex-col rounded-lg border bg-white p-1.5 text-left transition-colors sm:min-h-[96px] sm:p-2',
                isSel ? 'border-sunset ring-2 ring-sunset' : 'border-sand-300 hover:border-river/40',
                d < today && 'bg-sand-100/60 opacity-60',
              )}
            >
              <span className="flex items-start justify-between">
                <span className={cn('text-sm font-bold sm:text-base', d === today && 'rounded-full bg-river px-1.5 text-white')}>{fmtDayNum(d)}</span>
                {lessons > 0 && <span className="rounded-full bg-sunset px-1.5 text-[11px] font-bold leading-5 text-river-950">{lessons}</span>}
              </span>
              <span className="mt-1 grid gap-0.5">
                {windows.slice(0, 3).map((w) => (
                  <span
                    key={w.id}
                    className={cn(
                      'block h-1.5 rounded-full sm:h-auto sm:truncate sm:rounded sm:px-1 sm:text-[11px] sm:font-semibold sm:leading-[18px]',
                      w.status === 'open' ? 'bg-river-500 sm:bg-river-100 sm:text-river-700' : 'bg-ink-mute/35 sm:bg-sand-200 sm:text-ink-mute sm:line-through',
                    )}
                  >
                    <span className="hidden sm:inline">{compactRange(w.start, w.end)}</span>
                  </span>
                ))}
                {windows.length > 3 && <span className="hidden text-[11px] font-semibold text-ink-mute sm:block">+{windows.length - 3} more</span>}
              </span>
              {tides[d] && (
                <span className="mt-auto hidden flex-wrap gap-x-1.5 pt-1 text-[10px] font-semibold leading-tight text-ink-mute sm:flex" title="High and low tides">
                  <TideLine list={tides[d]} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ anchor, today, byDate, tides, onSelect, onToggle }: { anchor: string; today: string; byDate: Map<string, DayData>; tides: TideDays; onSelect: (d: string) => void; onToggle: (w: AvailabilityWindow) => void }) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((d) => {
        const v = byDate.get(d);
        const isSel = d === anchor;
        return (
          <div key={d} className={cn('rounded-xl border bg-white p-2.5', isSel ? 'border-sunset ring-1 ring-sunset' : 'border-sand-300', d < today && 'opacity-60')}>
            <button type="button" onClick={() => onSelect(d)} className="flex w-full items-baseline justify-between text-left" aria-label={`Select ${fmtDateLong(d)}`}>
              <span className="font-bold">{WEEKDAY_SHORT[weekday(d)]}</span>
              <span className={cn('display-md text-xl', d === today && 'rounded-full bg-river px-2 text-white')}>{fmtDayNum(d)}</span>
            </button>
            {tides[d] && (
              <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] font-semibold text-ink-mute" title="High and low tides">
                <TideLine list={tides[d]} />
              </p>
            )}
            <ul className="mt-2 grid gap-1.5">
              {v?.windows.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(w)}
                    aria-pressed={w.status === 'open'}
                    title={w.status === 'open' ? 'Open. Click to block.' : 'Blocked. Click to open.'}
                    className={cn(
                      'flex min-h-[44px] w-full items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors',
                      w.status === 'open' ? 'bg-river-100 text-river-800 hover:bg-river-200' : 'bg-sand-200 text-ink-mute hover:bg-sand-300',
                    )}
                  >
                    <span className={w.status === 'blocked' ? 'line-through' : ''}>{compactRange(w.start, w.end)}</span>
                    <span className="text-[11px] font-bold">{w.status === 'open' ? 'Open' : 'Off'}</span>
                  </button>
                </li>
              ))}
              {v?.bookings.map((b) => (
                <li key={b.id} className="rounded-lg bg-sunset-100 px-2.5 py-1.5 text-xs font-semibold text-sunset-700">
                  {fmt12(b.start)} {b.name.split(' ')[0]}
                </li>
              ))}
              {!v?.windows.length && <li className="px-1 text-xs text-ink-mute">Nothing set</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- day panel */

function DayPanel({
  date,
  today,
  day,
  onToggle,
  onRemove,
  onAdd,
  onSetDay,
  allTides,
}: {
  date: string;
  today: string;
  day: DayData;
  allTides: TideExtreme[];
  onToggle: (w: AvailabilityWindow) => void;
  onRemove: (w: AvailabilityWindow) => void;
  onAdd: (blocks: Block[]) => Promise<void>;
  onSetDay: (status: 'open' | 'blocked') => void;
}) {
  const [start, setStart] = useState('07:00');
  const [end, setEnd] = useState('11:00');
  const past = date < today;
  const valid = toMin(end) > toMin(start);
  const anyOpen = day.windows.some((w) => w.status === 'open');
  const anyBlocked = day.windows.some((w) => w.status === 'blocked');
  const dayTides = allTides.filter((e) => tideDay(e.t) === date);
  const bites = dayBiteWindows(allTides, date);
  const tideNote = (w: AvailabilityWindow): string | null => {
    if (!dayTides.length) return null;
    const hit = bites.map((b) => ({ b, m: overlapMin(date, w, b) })).filter((x) => x.m >= 20).sort((a, c) => c.m - a.m)[0];
    return hit ? `Moving water ${tideClock(hit.b.start)} to ${tideClock(hit.b.end)} (${hit.b.leg})` : 'Mostly slack water';
  };

  return (
    <section aria-labelledby="day-title" className="rounded-2xl border border-sand-300 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="day-title" className="display-md text-2xl">
          {fmtDateLong(date)}
        </h3>
        {date === today && <span className="rounded-full bg-river px-2.5 py-1 text-xs font-bold text-white">Today</span>}
        {past && <span className="rounded-full bg-sand-200 px-2.5 py-1 text-xs font-bold text-ink-mute">Past</span>}
      </div>

      {dayTides.length > 0 && (
        <div className="mt-3 rounded-xl bg-river-950 p-3.5 text-white" data-testid="day-tides">
          <p className="text-sm font-bold">Tides this day</p>
          <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {dayTides.map((e) => (
              <li key={e.t} className="flex items-center gap-1.5">
                {e.type === 'H' ? <ArrowUp className="h-4 w-4 text-sunset-400" aria-hidden /> : <ArrowDown className="h-4 w-4 text-river-200" aria-hidden />}
                <span className="font-semibold">{e.type === 'H' ? 'High' : 'Low'}</span> {tideClock(e.t)}
                <span className="text-river-200">{e.h.toFixed(1)} ft</span>
              </li>
            ))}
          </ul>
          {bites.length > 0 && (
            <p className="mt-2 text-xs text-river-200">
              Best current: {bites.map((b) => `${tideClock(b.start)} to ${tideClock(b.end)} (${b.leg})`).join(', ')}
            </p>
          )}
        </div>
      )}

      <ul className="mt-4 grid gap-2.5" data-testid="day-windows">
        {day.windows.length === 0 && <li className="rounded-lg border border-dashed border-sand-400 p-4 text-ink-soft">No time blocks on this day yet. Add one below.</li>}
        {day.windows.map((w) => {
          const n = bookedIn(w, day.bookings);
          const open = w.status === 'open';
          return (
            <li key={w.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-3', open ? 'border-river-200 bg-river-50' : 'border-sand-300 bg-sand-100')}>
              <div className="min-w-0 flex-1">
                <p className={cn('font-bold', !open && 'text-ink-mute line-through')}>{fmtRange(w.start, w.end)}</p>
                <p className="text-sm text-ink-soft">{n > 0 ? `${n} ${n === 1 ? 'lesson' : 'lessons'} booked in this block` : open ? 'Open for booking' : 'Blocked, hidden from guests'}</p>
                {tideNote(w) && <p className="text-xs font-semibold text-river-600">{tideNote(w)}</p>}
              </div>
              <label className="flex items-center gap-2.5 text-sm font-semibold">
                <Switch checked={open} onChange={() => onToggle(w)} label={`${fmtRange(w.start, w.end)} available`} />
                <span className="w-[4.5rem]">{open ? 'Available' : 'Blocked'}</span>
              </label>
              <button
                type="button"
                onClick={() => onRemove(w)}
                aria-label={`Delete ${fmtRange(w.start, w.end)}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-mute hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            </li>
          );
        })}
      </ul>

      {day.windows.length > 0 && !past && (
        <div className="mt-3 flex flex-wrap gap-2">
          {anyOpen && (
            <button type="button" onClick={() => onSetDay('blocked')} className="btn-outline btn-sm">
              Block the whole day
            </button>
          )}
          {anyBlocked && (
            <button type="button" onClick={() => onSetDay('open')} className="btn-outline btn-sm">
              Open the whole day
            </button>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-sand-200 pt-5">
        <p className="font-bold">Add open time</p>
        <p className="mt-0.5 text-sm text-ink-soft">One click for a usual block, or set exact times.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map(({ label, start: s, end: e, icon: Icon }) => (
            <button key={label} type="button" disabled={past} onClick={() => void onAdd([{ start: s, end: e }])} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-sand-300 bg-white px-4 text-sm font-semibold hover:border-river hover:bg-river-50 disabled:opacity-40">
              <Icon className="h-4 w-4 text-sunset-600" aria-hidden />
              {label} {compactRange(s, e)}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-[1fr_1fr] gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <span className="label">From</span>
            <TimeSelect value={start} onChange={setStart} label="Block start time" />
          </div>
          <div>
            <span className="label">Until</span>
            <TimeSelect value={end} onChange={setEnd} label="Block end time" />
          </div>
          <button type="button" disabled={past || !valid} onClick={() => void onAdd([{ start, end }])} className="btn-dark col-span-2 sm:col-span-1">
            <Plus className="h-4 w-4" aria-hidden /> Add block
          </button>
        </div>
        {!valid && <p className="mt-2 text-sm font-medium text-red-700">End time must be after the start time.</p>}
      </div>

      <div className="mt-6 border-t border-sand-200 pt-5">
        <p className="font-bold">Lessons booked this day</p>
        {day.bookings.length === 0 ? (
          <p className="mt-1 text-sm text-ink-soft">None yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {day.bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-sunset-50 px-3.5 py-2.5">
                <span className="font-semibold">
                  {fmtRange(b.start, b.end)}, {b.name}
                </span>
                <span className="text-sm text-sunset-700">
                  {sessionLabel(b.packageId, false)}, {b.status === 'pending' ? 'needs approval' : b.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- bulk apply */

type BulkMode = 'add' | 'block' | 'open' | 'remove';
const MODES: Array<{ id: BulkMode; label: string; cta: string }> = [
  { id: 'add', label: 'Add open blocks', cta: 'Add availability' },
  { id: 'block', label: 'Block days off', cta: 'Block those days' },
  { id: 'open', label: 'Reopen blocked', cta: 'Reopen those days' },
  { id: 'remove', label: 'Remove blocks', cta: 'Remove blocks' },
];
const WEEKDAY_SETS: Array<{ label: string; days: number[] }> = [
  { label: 'Weekends', days: [0, 6] },
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
];

function BulkPanel({ today, anchor, onApply }: { today: string; anchor: string; onApply: (payload: Record<string, unknown>, mode: BulkMode) => Promise<void> }) {
  const [mode, setMode] = useState<BulkMode>('add');
  const [from, setFrom] = useState(anchor < today ? today : anchor);
  const [to, setTo] = useState(addDays(anchor < today ? today : anchor, 30));
  const [days, setDays] = useState<number[]>([6, 0]);
  const [blocks, setBlocks] = useState<Block[]>([{ start: '07:00', end: '11:00' }]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const matched = useMemo(() => {
    if (!from || !to || to < from) return 0;
    return eachDate(from, to).filter((d) => days.includes(weekday(d)) && d >= today).length;
  }, [from, to, days, today]);
  const blocksValid = blocks.length > 0 && blocks.every((b) => toMin(b.end) > toMin(b.start));
  const ready = !!from && !!to && to >= from && days.length > 0 && matched > 0 && (mode !== 'add' || blocksValid);
  const current = MODES.find((m) => m.id === mode)!;

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  const sameDays = (a: number[]) => a.length === days.length && a.every((d) => days.includes(d));

  async function apply() {
    if (mode === 'remove' && !confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    const base = { startDate: from, endDate: to, weekdays: days };
    const payload =
      mode === 'add'
        ? { action: 'bulk-add', ...base, blocks }
        : mode === 'remove'
          ? { action: 'bulk-remove', ...base }
          : { action: 'bulk-set', ...base, status: mode === 'block' ? 'blocked' : 'open' };
    await onApply(payload, mode);
    setBusy(false);
    setConfirm(false);
  }

  return (
    <section aria-labelledby="bulk-title" className="rounded-2xl border border-sand-300 bg-white p-5 sm:p-6">
      <h3 id="bulk-title" className="display-md text-2xl">
        Recurring availability
      </h3>
      <p className="mt-1 text-sm text-ink-soft">Set a whole stretch of the summer at once. Example: every Saturday and Sunday morning in July.</p>

      <div role="radiogroup" aria-label="What to do" className="mt-4 grid grid-cols-2 gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => {
              setMode(m.id);
              setConfirm(false);
            }}
            className={cn('min-h-[44px] rounded-lg border px-2 text-sm font-semibold transition-colors', mode === m.id ? 'border-river bg-river text-white' : 'border-sand-300 hover:border-river/40')}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="bulk-from" className="label">
            From
          </label>
          <input id="bulk-from" type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} className="field !min-h-[44px] !py-2" />
        </div>
        <div>
          <label htmlFor="bulk-to" className="label">
            Through
          </label>
          <input id="bulk-to" type="date" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} className="field !min-h-[44px] !py-2" />
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="label">On these days</legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_SHORT.map((label, d) => (
            <button
              key={label}
              type="button"
              aria-pressed={days.includes(d)}
              onClick={() => toggleDay(d)}
              className={cn('h-11 min-w-[3rem] rounded-lg border px-2 text-sm font-semibold transition-colors', days.includes(d) ? 'border-sunset bg-sunset text-river-950' : 'border-sand-300 hover:border-river/40')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {WEEKDAY_SETS.map((s) => (
            <button key={s.label} type="button" onClick={() => setDays(s.days)} className={cn('text-sm font-semibold underline underline-offset-4', sameDays(s.days) ? 'text-sunset-700' : 'text-river')}>
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      {mode === 'add' && (
        <fieldset className="mt-4">
          <legend className="label">Time blocks</legend>
          <ul className="grid gap-2">
            {blocks.map((b, i) => (
              <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                <TimeSelect value={b.start} label={`Block ${i + 1} start`} onChange={(v) => setBlocks((cur) => cur.map((x, j) => (j === i ? { ...x, start: v } : x)))} />
                <TimeSelect value={b.end} label={`Block ${i + 1} end`} onChange={(v) => setBlocks((cur) => cur.map((x, j) => (j === i ? { ...x, end: v } : x)))} />
                <button type="button" disabled={blocks.length === 1} onClick={() => setBlocks((cur) => cur.filter((_, j) => j !== i))} aria-label={`Remove block ${i + 1}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-mute hover:bg-red-50 hover:text-red-700 disabled:opacity-30">
                  <X className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => setBlocks((cur) => (cur.some((b) => b.start === p.start && b.end === p.end) || cur.length >= 8 ? cur : [...cur, { start: p.start, end: p.end }]))} className="text-sm font-semibold text-river underline underline-offset-4">
                + {p.label} {compactRange(p.start, p.end)}
              </button>
            ))}
          </div>
          {!blocksValid && <p className="mt-2 text-sm font-medium text-red-700">Each block needs an end time after its start.</p>}
        </fieldset>
      )}

      <p className="mt-5 rounded-lg bg-sand-100 px-3.5 py-2.5 text-sm text-ink-soft" aria-live="polite">
        {matched === 0 ? 'No upcoming days match yet. Check the dates and weekdays.' : `Applies to ${matched} ${matched === 1 ? 'day' : 'days'}${mode === 'add' ? '. Blocks that overlap existing ones are skipped.' : '.'}`}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!ready || busy} onClick={() => void apply()} className={cn(mode === 'remove' && confirm ? 'btn bg-red-700 text-white hover:bg-red-800' : 'btn-dark')}>
          {mode === 'remove' && confirm ? `Yes, remove blocks on ${matched} days` : current.cta}
        </button>
        {confirm && (
          <button type="button" onClick={() => setConfirm(false)} className="text-sm font-semibold underline underline-offset-4">
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- the manager */

export function AvailabilityManager() {
  const toast = useToast();
  const [view, setView] = useState<'month' | 'week'>('month');
  const [anchor, setAnchor] = useState(browserToday);
  const touched = useRef(false);
  const month = monthOf(anchor);

  const from = addDays(startOfMonth(month), -7);
  const to = addDays(endOfMonth(month), 7);
  const { data, error, refresh, setData } = useRemote<AdminAvailability>(`/api/availability?view=admin&from=${from}&to=${to}`, 15_000);
  const tideRange = useRemote<TideRange>(`/api/tides?from=${from}&to=${to}`);
  const tideDays: TideDays = tideRange.data?.days ?? {};
  const allTides = useMemo(() => Object.values(tideDays).flat().sort((a, b) => a.t.localeCompare(b.t)), [tideDays]);
  const lastData = useRef<AdminAvailability | null>(null);
  if (data) lastData.current = data;
  const shown = data ?? lastData.current;
  const today = shown?.today ?? browserToday();

  useEffect(() => {
    if (shown?.today && !touched.current) setAnchor(shown.today);
  }, [shown?.today]);

  const byDate = useMemo(() => {
    const m = new Map<string, DayData>();
    const slot = (d: string) => {
      let v = m.get(d);
      if (!v) m.set(d, (v = { windows: [], bookings: [] }));
      return v;
    };
    shown?.windows.forEach((w) => slot(w.date).windows.push(w));
    shown?.bookings.forEach((b) => slot(b.date).bookings.push(b));
    return m;
  }, [shown]);
  const day = byDate.get(anchor) ?? { windows: [], bookings: [] };

  const select = (d: string) => {
    touched.current = true;
    setAnchor(d);
  };
  const step = (dir: -1 | 1) => {
    touched.current = true;
    setAnchor((a) => (view === 'week' ? addDays(a, dir * 7) : (addMonths(monthOf(a), dir) === monthOf(today) ? today : `${addMonths(monthOf(a), dir)}-01`)));
  };

  async function run<T>(fn: () => Promise<T>, ok: (r: T) => string): Promise<void> {
    try {
      const r = await fn();
      await refresh();
      notifyChange();
      toast.success(ok(r));
    } catch (e) {
      toast.error(errorMessage(e));
      await refresh();
    }
  }

  const toggle = (w: AvailabilityWindow) => {
    const next = w.status === 'open' ? 'blocked' : 'open';
    // Optimistic: flip it instantly, the server round trip confirms (or the refresh reverts it).
    setData((d) => (d ? { ...d, windows: d.windows.map((x) => (x.id === w.id ? { ...x, status: next } : x)) } : d));
    void run(
      () => api('/api/availability', { method: 'PATCH', json: { id: w.id, status: next } }),
      () => `${fmtRange(w.start, w.end)} on ${fmtDateShort(w.date)} is now ${next === 'open' ? 'available' : 'blocked'}.`,
    );
  };

  const remove = (w: AvailabilityWindow) =>
    run(
      () => api(`/api/availability?id=${encodeURIComponent(w.id)}`, { method: 'DELETE' }),
      () => `Removed ${fmtRange(w.start, w.end)} on ${fmtDateShort(w.date)}.`,
    );

  const addBlocks = (blocks: Block[]) =>
    run(
      () => api('/api/availability', { method: 'POST', json: { action: 'add', date: anchor, blocks } }),
      () => `Added ${blocks.map((b) => fmtRange(b.start, b.end)).join(' and ')} on ${fmtDateShort(anchor)}. It's live on the booking calendar.`,
    );

  const setDay = (status: 'open' | 'blocked') =>
    run(
      () => api('/api/availability', { method: 'POST', json: { action: 'bulk-set', startDate: anchor, endDate: anchor, weekdays: [0, 1, 2, 3, 4, 5, 6], status } }),
      () => (status === 'open' ? `${fmtDateShort(anchor)} is open again.` : `${fmtDateShort(anchor)} is blocked.`),
    );

  const applyBulk = (payload: Record<string, unknown>, mode: BulkMode) =>
    run(
      () => api<BulkResult>('/api/availability', { method: 'POST', json: payload }),
      (r) => {
        const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
        if (mode === 'add') return `Added ${plural(r.added, 'time block')} across ${plural(r.days, 'day')}.${r.skipped ? ` Skipped ${r.skipped} that overlapped or were in the past.` : ''}`;
        if (mode === 'remove') return `Removed ${plural(r.removed, 'time block')} across ${plural(r.days, 'day')}.`;
        if (r.changed === 0) return 'Nothing to change in that range.';
        return `${mode === 'block' ? 'Blocked' : 'Reopened'} ${plural(r.changed, 'time block')} across ${plural(r.days, 'day')}.`;
      },
    );

  const weekStart = startOfWeek(anchor);

  return (
    <div className="grid gap-6">
      <SuggestedAvailability onChanged={() => { void refresh(); notifyChange(); }} />
      <div className="rounded-2xl border border-sand-300 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => step(-1)} aria-label={view === 'week' ? 'Previous week' : 'Previous month'} className="flex h-11 w-11 items-center justify-center rounded-lg border border-sand-300 hover:bg-river-50">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="display-md min-w-[10rem] text-center text-xl sm:min-w-[14rem] sm:text-2xl" aria-live="polite">
              {view === 'month' ? fmtMonth(month) : `${fmtDateShort(weekStart)} to ${fmtDateShort(addDays(weekStart, 6))}`}
            </h2>
            <button type="button" onClick={() => step(1)} aria-label={view === 'week' ? 'Next week' : 'Next month'} className="flex h-11 w-11 items-center justify-center rounded-lg border border-sand-300 hover:bg-river-50">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => select(today)} className="btn-outline btn-sm">
              <CalendarClock className="h-4 w-4" aria-hidden /> Today
            </button>
          </div>
          <div role="group" aria-label="Calendar view" className="inline-flex rounded-lg border border-sand-300 bg-sand-100 p-1">
            {(['month', 'week'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn('min-h-[40px] rounded-md px-4 text-sm font-semibold capitalize', view === v ? 'bg-river text-white' : 'text-ink-soft hover:text-ink')}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {!shown && !error && <div className="h-80 animate-pulse rounded-xl bg-sand-100" />}
          {error && !shown && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 font-medium text-red-800">{error}</p>}
          {shown && (view === 'month' ? <MonthView month={month} selected={anchor} today={today} byDate={byDate} tides={tideDays} onSelect={select} /> : <WeekView anchor={anchor} today={today} byDate={byDate} tides={tideDays} onSelect={select} onToggle={toggle} />)}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft">
          <li className="flex items-center gap-2">
            <span className="h-3 w-5 rounded bg-river-500" aria-hidden /> Open for booking
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-5 rounded bg-ink-mute/35" aria-hidden /> Blocked
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-sunset px-1 text-[10px] font-bold text-river-950" aria-hidden>
              2
            </span>
            Lessons booked
          </li>
          {view === 'week' && <li>Tap a block to switch it between open and blocked.</li>}
          {allTides.length > 0 && (
            <li className="flex items-center gap-1.5">
              <ArrowUp className="h-3.5 w-3.5" aria-hidden /> high <ArrowDown className="ml-1 h-3.5 w-3.5" aria-hidden /> low tide times{tideRange.data?.source === 'simulated' ? ' (simulated, NOAA unreachable)' : ' (NOAA)'}
            </li>
          )}
        </ul>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <DayPanel date={anchor} today={today} day={day} allTides={allTides} onToggle={toggle} onRemove={(w) => void remove(w)} onAdd={addBlocks} onSetDay={(s) => void setDay(s)} />
        <BulkPanel today={today} anchor={anchor} onApply={applyBulk} />
      </div>
    </div>
  );
}
