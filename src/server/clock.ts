import { pad2 } from '@/lib/time';

export interface Now {
  date: string; // YYYY-MM-DD in business time zone
  minutes: number; // minutes since local midnight
}

const FALLBACK_TZ = 'America/New_York';

function resolveTz(): string {
  const tz = process.env.BUSINESS_TZ?.trim() || FALLBACK_TZ;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return FALLBACK_TZ;
  }
}

/** The current date and time in the business's time zone (set BUSINESS_TZ to change it). */
export function businessNow(): Now {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTz(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    date: `${get('year')}-${pad2(get('month'))}-${pad2(get('day'))}`,
    minutes: get('hour') * 60 + get('minute'),
  };
}

/** Offset (ms) of `tz` from UTC at the given instant: positive east of Greenwich. */
export function tzOffsetMs(at: Date, tz: string = resolveTz()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Turn a local business date and time ("2027-06-05", "07:00") into the real instant it refers to. */
export function localToUtc(date: string, time: string, tz: string = resolveTz()): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wall - tzOffsetMs(new Date(wall), tz);
  guess = wall - tzOffsetMs(new Date(guess), tz); // second pass settles daylight saving edges
  return new Date(guess);
}

export const businessTz = (): string => resolveTz();
