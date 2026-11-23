import { businessNow } from './clock';
import {
  biteWindows,
  fromTideMinutes,
  tideDay,
  tideMinutes,
  type TideExtreme,
  type TidePoint,
  type TideRange,
  type TideSnapshot,
} from '@/lib/tides';

/**
 * Tides come from NOAA Tides & Currents (free, no API key). The default station is Charleston, Cooper
 * River Entrance (8665530): the nearest NOAA station to the Oyster Point and Hamlin Creek marsh that
 * measures live water level. Override with TIDE_STATION_ID. If NOAA can't be reached, a typical
 * Charleston-sized tide curve is generated instead and clearly labeled as simulated.
 */
const STATION = {
  id: process.env.TIDE_STATION_ID?.trim() || '8665530',
  name: process.env.TIDE_STATION_NAME?.trim() || 'Charleston Harbor, SC',
};
const API = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

const g = globalThis as unknown as { __boazTides?: Map<string, { at: number; value: unknown }> };
const cache = () => (g.__boazTides ??= new Map());
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache().get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  cache().set(key, { at: Date.now(), value });
  return value;
}

const p2 = (n: number) => String(n).padStart(2, '0');
const yyyymmdd = (date: string) => date.replace(/-/g, '');
const addDaysStr = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${p2(dt.getUTCMonth() + 1)}-${p2(dt.getUTCDate())}`;
};

async function noaa<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(API);
  const q = { application: 'BoazFishingCo', station: STATION.id, datum: 'MLLW', time_zone: 'lst_ldt', units: 'english', format: 'json', ...params };
  for (const [k, v] of Object.entries(q)) url.searchParams.set(k, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(7000), cache: 'no-store' });
  if (!res.ok) throw new Error(`NOAA ${res.status}`);
  const json = (await res.json()) as T & { error?: { message?: string } };
  if ((json as { error?: { message?: string } }).error) throw new Error((json as { error: { message?: string } }).error.message ?? 'NOAA error');
  return json;
}

/* ----------------------------------------------------------- simulation */

const M2_MIN = 12.4206 * 60; // principal lunar semidiurnal period
const T0 = tideMinutes('2026-01-01 03:00');
function simHeight(minutes: number): number {
  const x = minutes - T0;
  return 3.0 + 2.55 * Math.cos((2 * Math.PI * x) / M2_MIN) + 0.35 * Math.cos((2 * Math.PI * x) / (2 * M2_MIN) + 0.8);
}
function simulate(fromMin: number, toMin: number): { points: TidePoint[]; extremes: TideExtreme[] } {
  const points: TidePoint[] = [];
  const extremes: TideExtreme[] = [];
  let prev = simHeight(fromMin - 6);
  let cur = simHeight(fromMin);
  for (let m = fromMin; m <= toMin; m += 6) {
    const next = simHeight(m + 6);
    points.push({ t: fromTideMinutes(m), h: Math.round(cur * 100) / 100 });
    if (cur > prev && cur >= next) extremes.push({ t: fromTideMinutes(m), type: 'H', h: Math.round(cur * 100) / 100 });
    if (cur < prev && cur <= next) extremes.push({ t: fromTideMinutes(m), type: 'L', h: Math.round(cur * 100) / 100 });
    prev = cur;
    cur = next;
  }
  return { points, extremes };
}

/* ------------------------------------------------------------- snapshot */

function localNow(): string {
  const n = businessNow();
  return `${n.date} ${p2(Math.floor(n.minutes / 60))}:${p2(n.minutes % 60)}`;
}

export async function getTideSnapshot(): Promise<TideSnapshot> {
  return cached('snapshot', 5 * 60_000, buildSnapshot);
}

async function buildSnapshot(): Promise<TideSnapshot> {
  const now = localNow();
  const nowMin = tideMinutes(now);
  const day = now.split(' ')[0];
  const begin = yyyymmdd(addDaysStr(day, -1));
  const end = yyyymmdd(addDaysStr(day, 2));

  let source: 'noaa' | 'simulated' = 'noaa';
  let note: string | undefined;
  let all: TidePoint[] = [];
  let extremes: TideExtreme[] = [];
  let observed: { t: string; h: number } | null = null;

  const [pred, hilo, obs] = await Promise.allSettled([
    noaa<{ predictions: { t: string; v: string }[] }>({ product: 'predictions', interval: '6', begin_date: begin, end_date: end }),
    noaa<{ predictions: { t: string; v: string; type: 'H' | 'L' }[] }>({ product: 'predictions', interval: 'hilo', begin_date: begin, end_date: end }),
    noaa<{ data: { t: string; v: string }[] }>({ product: 'water_level', date: 'latest' }),
  ]);

  if (pred.status === 'fulfilled' && hilo.status === 'fulfilled' && pred.value.predictions?.length && hilo.value.predictions?.length) {
    all = pred.value.predictions.map((x) => ({ t: x.t, h: Number(x.v) }));
    extremes = hilo.value.predictions.map((x) => ({ t: x.t, type: x.type, h: Number(x.v) }));
    if (obs.status === 'fulfilled' && obs.value.data?.[0]) {
      const o = obs.value.data[0];
      const age = nowMin - tideMinutes(o.t);
      if (Number.isFinite(Number(o.v)) && age >= -5 && age <= 45) observed = { t: o.t, h: Number(o.v) };
    }
  } else {
    source = 'simulated';
    note = 'NOAA is unreachable right now, so this is a typical tide curve for the area, not live data.';
    const sim = simulate(nowMin - 24 * 60, nowMin + 48 * 60);
    all = sim.points;
    extremes = sim.extremes;
  }

  const startMin = nowMin - 4 * 60;
  const endMin = nowMin + 20 * 60;
  const curve = all.filter((p) => {
    const m = tideMinutes(p.t);
    return m >= startMin && m <= endMin;
  }).filter((_, i) => i % 2 === 0);

  const nearest = all.reduce((best, p) => (Math.abs(tideMinutes(p.t) - nowMin) < Math.abs(tideMinutes(best.t) - nowMin) ? p : best), all[0]);
  const ni = all.indexOf(nearest);
  const slope = (all[Math.min(all.length - 1, ni + 1)]?.h ?? nearest.h) - (all[Math.max(0, ni - 1)]?.h ?? nearest.h);

  const upcoming = extremes.filter((e) => tideMinutes(e.t) > nowMin);
  return {
    station: STATION,
    source,
    note,
    now: { t: now, h: observed ? observed.h : nearest.h, trend: slope >= 0 ? 'rising' : 'falling', observed: !!observed },
    curve,
    extremes: extremes.filter((e) => tideMinutes(e.t) >= startMin - 8 * 60 && tideMinutes(e.t) <= endMin + 8 * 60),
    windows: biteWindows(extremes).filter((w) => tideMinutes(w.end) > startMin && tideMinutes(w.start) < endMin),
    nextHigh: upcoming.find((e) => e.type === 'H') ?? null,
    nextLow: upcoming.find((e) => e.type === 'L') ?? null,
    generatedAt: new Date().toISOString(),
  };
}

/* ---------------------------------------------------------------- range */

/** High and low tides for every day in [from, to] (YYYY-MM-DD), used inside the Availability Manager. */
export async function getTideRange(from: string, to: string): Promise<TideRange> {
  return cached(`range:${from}:${to}`, 6 * 3600_000, async () => {
    let source: 'noaa' | 'simulated' = 'noaa';
    let extremes: TideExtreme[];
    try {
      const res = await noaa<{ predictions: { t: string; v: string; type: 'H' | 'L' }[] }>({
        product: 'predictions',
        interval: 'hilo',
        begin_date: yyyymmdd(from),
        end_date: yyyymmdd(to),
      });
      if (!res.predictions?.length) throw new Error('empty');
      extremes = res.predictions.map((x) => ({ t: x.t, type: x.type, h: Number(x.v) }));
    } catch {
      source = 'simulated';
      extremes = simulate(tideMinutes(`${from} 00:00`) - 12 * 60, tideMinutes(`${to} 23:59`) + 12 * 60).extremes;
    }
    const days: Record<string, TideExtreme[]> = {};
    for (const e of extremes) {
      const d = tideDay(e.t);
      if (d >= from && d <= to) (days[d] ??= []).push(e);
    }
    return { station: STATION, source, days };
  });
}

/* ------------------------------------------------------------ high tides */

const BLOCK_DAYS = 60;
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
const dayString = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
const blockCache = () => ((globalThis as unknown as { __boazHighs?: Map<number, { at: number; highs: string[] }> }).__boazHighs ??= new Map());

/** Every NOAA predicted high tide in one fixed 60 day block, as local "YYYY-MM-DD HH:mm" strings. Stale data beats none. */
async function highsForBlock(block: number): Promise<string[] | null> {
  const hit = blockCache().get(block);
  if (hit && Date.now() - hit.at < 12 * 3600_000) return hit.highs;
  try {
    const start = dayString(block * BLOCK_DAYS - 1);
    const end = dayString((block + 1) * BLOCK_DAYS);
    const res = await noaa<{ predictions: { t: string; type: 'H' | 'L' }[] }>({ product: 'predictions', interval: 'hilo', begin_date: yyyymmdd(start), end_date: yyyymmdd(end) });
    const highs = (res.predictions ?? []).filter((x) => x.type === 'H').map((x) => x.t);
    if (!highs.length) throw new Error('no predictions');
    blockCache().set(block, { at: Date.now(), highs });
    return highs;
  } catch {
    return hit?.highs ?? null;
  }
}

/**
 * High tide times for every date in [from, to] (YYYY-MM-DD), as minutes after that date's midnight, including
 * the highs just before and after so lessons near midnight are handled. Returns null when NOAA can't be reached
 * and nothing is cached, so callers offer nothing instead of guessing.
 */
export async function getHighTides(from: string, to: string): Promise<Map<string, number[]> | null> {
  const blocks: number[] = [];
  for (let b = Math.floor((dayNumber(from) - 1) / BLOCK_DAYS); b <= Math.floor((dayNumber(to) + 1) / BLOCK_DAYS); b++) blocks.push(b);
  const parts = await Promise.all(blocks.map(highsForBlock));
  if (parts.some((p) => p === null)) return null;
  const all = parts.flat() as string[];
  const out = new Map<string, number[]>();
  for (let n = dayNumber(from); n <= dayNumber(to); n++) {
    const date = dayString(n);
    const mid = tideMinutes(`${date} 00:00`);
    out.set(date, all.map((t) => tideMinutes(t) - mid).filter((m) => m > -300 && m < 1440 + 300).sort((a, b) => a - b));
  }
  return out;
}
