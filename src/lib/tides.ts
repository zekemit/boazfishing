// Shared tide types and helpers (safe for client and server). Times are local "YYYY-MM-DD HH:mm" strings
// in the station's time zone, which for Charleston harbor is the same as the business time zone.

export interface TideExtreme {
  t: string;
  type: 'H' | 'L';
  h: number; // feet above MLLW
}
export interface TidePoint {
  t: string;
  h: number;
}
export interface BiteWindow {
  start: string;
  end: string;
  leg: 'incoming' | 'outgoing';
}
export interface TideSnapshot {
  station: { id: string; name: string };
  source: 'noaa' | 'simulated';
  note?: string;
  now: { t: string; h: number; trend: 'rising' | 'falling'; observed: boolean };
  curve: TidePoint[]; // about 24 hours, 6 minute steps (thinned)
  extremes: TideExtreme[];
  windows: BiteWindow[];
  nextHigh: TideExtreme | null;
  nextLow: TideExtreme | null;
  generatedAt: string;
}
export interface TideRange {
  station: { id: string; name: string };
  source: 'noaa' | 'simulated';
  days: Record<string, TideExtreme[]>;
}

/** Minutes since an arbitrary epoch, treating the local string as if it were UTC (only differences matter). */
export function tideMinutes(t: string): number {
  const [d, hm] = t.split(' ');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, m] = hm.split(':').map(Number);
  return Date.UTC(y, mo - 1, da, h, m) / 60000;
}

export function fromTideMinutes(min: number): string {
  const dt = new Date(min * 60000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())} ${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}`;
}

/** "2026-11-23 06:09" -> "6:09 AM" */
export function tideClock(t: string): string {
  const [h, m] = t.split(' ')[1].split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** "6:09a" style, for tight spaces */
export function tideClockShort(t: string): string {
  const [h, m] = t.split(' ')[1].split(':').map(Number);
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${m ? ':' + String(m).padStart(2, '0') : ''}${h >= 12 ? 'p' : 'a'}`;
}

export const tideDay = (t: string) => t.split(' ')[0];

/**
 * "Marsh bite windows": for bait fishing the fish feed when water is moving, and the current is
 * strongest in the middle of each tide leg. This marks the middle half of every rising and falling
 * leg. It is a rule of thumb, not a forecast.
 */
export function biteWindows(extremes: TideExtreme[]): BiteWindow[] {
  const out: BiteWindow[] = [];
  for (let i = 0; i < extremes.length - 1; i++) {
    const a = extremes[i];
    const b = extremes[i + 1];
    const s = tideMinutes(a.t);
    const dur = tideMinutes(b.t) - s;
    if (dur <= 0) continue;
    out.push({
      start: fromTideMinutes(Math.round(s + dur * 0.25)),
      end: fromTideMinutes(Math.round(s + dur * 0.75)),
      leg: a.type === 'L' ? 'incoming' : 'outgoing',
    });
  }
  return out;
}
