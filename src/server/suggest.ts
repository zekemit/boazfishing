import { PACKAGES, type LessonPackage } from '@/lib/packages';
import { addDays, eachDate, fromMin, toMin, weekday } from '@/lib/time';
import type { AvailabilityWindow, BusyEvent, DB, SuggestPrefs } from '@/lib/types';
import { GRID_MIN, startsFor } from './availability';
import type { Now } from './clock';
import { localToUtc } from './clock';

export const DEFAULT_PREFS: SuggestPrefs = {
  days: [5, 6, 0],
  earliest: '06:00',
  latest: '20:30',
  bufferMin: 30,
  aheadDays: 28,
  allDayBusy: false,
  flex: true,
};

export interface Suggestion {
  id: string;
  date: string;
  start: string;
  end: string;
  kind: 'tide' | 'flex';
  /** High tide the window is built around (HH:mm), for tide windows. */
  high: string | null;
  /** How many start times each lesson would get inside this window. */
  fits: { packageId: string; name: string; starts: string[] }[];
  score: number;
  tags: string[];
  /** Calendar events the window was trimmed around. */
  trimmedBy: { title: string; start: string; end: string }[];
}

export interface SuggestResult {
  items: Suggestion[];
  /** Candidate windows skipped because the time is already open or was blocked on purpose. */
  alreadyOpen: number;
  /** Days skipped entirely because the calendar is too full or no tide fits. */
  noFit: number;
}

type Range = [number, number];

const grid = (m: number, dir: 'up' | 'down') => (dir === 'up' ? Math.ceil(m / GRID_MIN) : Math.floor(m / GRID_MIN)) * GRID_MIN;

/** Remove `cut` ranges from `base`, returning what is left. */
function subtract(base: Range, cuts: Range[]): Range[] {
  let left: Range[] = [base];
  for (const [cs, ce] of cuts) {
    const next: Range[] = [];
    for (const [s, e] of left) {
      if (ce <= s || cs >= e) next.push([s, e]);
      else {
        if (cs > s) next.push([s, cs]);
        if (ce < e) next.push([ce, e]);
      }
    }
    left = next;
  }
  return left;
}

const GATED = PACKAGES.filter((p) => p.tideGate);

export function buildSuggestions(input: {
  db: DB;
  now: Now;
  prefs: SuggestPrefs;
  /** date -> high tide minutes after midnight (null when NOAA could not be reached). */
  highs: Map<string, number[]> | null;
  busy: BusyEvent[];
}): SuggestResult {
  const { db, now, prefs, highs, busy } = input;
  const pkgs: LessonPackage[] = PACKAGES;
  const earliest = toMin(prefs.earliest);
  const latest = toMin(prefs.latest);
  const dates = eachDate(now.date, addDays(now.date, prefs.aheadDays)).filter((d) => prefs.days.includes(weekday(d)));
  const out: Suggestion[] = [];
  let alreadyOpen = 0;
  let noFit = 0;

  for (const date of dates) {
    const midnight = localToUtc(date, '00:00').getTime();
    const dayBusy = busy
      .filter((b) => (prefs.allDayBusy || !b.allDay) && b.e > midnight - 86_400_000 && b.s < midnight + 2 * 86_400_000)
      .map((b) => ({ ...b, a: Math.round((b.s - midnight) / 60_000), z: Math.round((b.e - midnight) / 60_000) }))
      .filter((b) => b.z > -prefs.bufferMin && b.a < 1440 + prefs.bufferMin);
    const busyCuts: Range[] = dayBusy.map((b) => [b.a - prefs.bufferMin, b.z + prefs.bufferMin]);
    // Existing windows (open or blocked on purpose) are never suggested over.
    const existing: AvailabilityWindow[] = db.windows.filter((w) => w.date === date);
    const existingCuts: Range[] = existing.map((w) => [toMin(w.start), toMin(w.end)]);
    const dayHighs = highs?.get(date) ?? [];
    let daySuggested = false;
    let coveredByExisting = false;
    /** Tide windows already suggested for this day, so Session 1-only blocks are never offered on top of them. */
    const taken: Range[] = [];

    /** Best free stretch inside `want`, scored by how many bookable starts it gives. */
    const fit = (want: Range, kind: 'tide' | 'flex', high: number | null): Suggestion | null => {
      const lo = Math.max(grid(want[0], 'up'), earliest);
      const hi = Math.min(grid(want[1], 'down'), latest);
      if (hi - lo < 45) return null;
      const free = subtract([lo, hi], [...busyCuts, ...existingCuts, ...(kind === 'flex' ? taken : [])]);
      if (existing.some((w) => toMin(w.start) <= lo && toMin(w.end) >= hi)) coveredByExisting = true;
      let best: Suggestion | null = null;
      for (const seg of free) {
        const s = grid(seg[0], 'up');
        const e = grid(seg[1], 'down');
        if (e - s < 45) continue;
        const window: AvailabilityWindow = { id: 'x', date, start: fromMin(s), end: fromMin(e), status: 'open' };
        const fits = pkgs
          .map((p) => ({ packageId: p.id, name: p.name, starts: startsFor(p, date, [window], [], now, dayHighs) }))
          .filter((f) => f.starts.length > 0);
        const by = (id: string) => fits.find((f) => f.packageId === id)?.starts.length ?? 0;
        const gated = by('session-2') + by('session-3');
        if (kind === 'tide' ? gated === 0 : by('session-1') < 2) continue;
        const weekend = weekday(date) === 0 || weekday(date) === 6;
        const trimmed = s > lo || e < hi;
        // Name the calendar events that cut into the ideal window (padded by the buffer).
        const trimmedBy = dayBusy
          .filter((b) => b.a - prefs.bufferMin < want[1] && b.z + prefs.bufferMin > want[0])
          .slice(0, 2)
          .map((b) => ({ title: b.title, start: fromMin(Math.max(0, b.a)), end: fromMin(Math.min(1439, b.z)) }));
        const score =
          kind === 'tide'
            ? by('session-2') * 10 + by('session-3') * 10 + Math.min(by('session-1'), 6) + (weekend ? 15 : 0) - (trimmed || trimmedBy.length ? 10 : 0)
            : Math.min(by('session-1'), 6) + (weekend ? 5 : 0);
        const tags: string[] = [];
        if (weekend) tags.push('Weekend');
        if (by('session-2') > 0 && by('session-3') > 0) tags.push('Fits sessions 2 and 3');
        if (kind === 'tide' && by('session-2') >= 3 && !trimmed && !trimmedBy.length) tags.push('Full tide window');
        const cand: Suggestion = {
          id: `${date}_${fromMin(s)}_${fromMin(e)}`,
          date,
          start: fromMin(s),
          end: fromMin(e),
          kind,
          high: high === null ? null : fromMin(high),
          fits,
          score,
          tags,
          trimmedBy,
        };
        if (!best || cand.score > best.score) best = cand;
      }
      return best;
    };

    if (highs) {
      for (const h of dayHighs) {
        if (h < 0 || h >= 1440) continue;
        // Starts for the tide-timed lessons run from 2h to 1h before high tide; a 2 hour lesson started at the last one ends 1h after.
        const first = grid(h - GATED[0].tideGate!.maxAhead, 'up');
        const last = grid(h - GATED[0].tideGate!.minAhead, 'down');
        // The window has to end on the half hour, so round the end of the last lesson up, or a 45 minute lesson loses its last start.
        const s = fit([first, grid(last + Math.max(...GATED.map((p) => p.durationMin)), 'up')], 'tide', h);
        if (s) {
          out.push(s);
          taken.push([toMin(s.start), toMin(s.end)]);
          daySuggested = true;
        }
      }
    }
    if (prefs.flex) {
      for (const want of [[Math.max(earliest, 9 * 60), 12 * 60], [16 * 60, Math.min(latest, 19 * 60)]] as Range[]) {
        const s = fit(want, 'flex', null);
        if (s) {
          out.push(s);
          taken.push([toMin(s.start), toMin(s.end)]);
          daySuggested = true;
        }
      }
    }
    if (!daySuggested) {
      if (coveredByExisting) alreadyOpen++;
      else noFit++;
    }
  }

  out.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  return { items: out.slice(0, 80), alreadyOpen, noFit };
}
