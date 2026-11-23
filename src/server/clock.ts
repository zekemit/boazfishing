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
