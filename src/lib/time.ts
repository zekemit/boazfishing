// Pure date/time helpers. Dates are "YYYY-MM-DD" strings and times are "HH:mm" in the
// business's local time, so nothing here depends on the browser or server time zone.

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function isValidDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function toDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fromDate(dt: Date): string {
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function addDays(s: string, n: number): string {
  const dt = toDate(s);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromDate(dt);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / 86_400_000);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(s: string): number {
  return toDate(s).getUTCDay();
}

export const monthOf = (s: string) => s.slice(0, 7);

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${pad2((idx % 12) + 1)}`;
}

export function compareMonths(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function startOfMonth(month: string): string {
  return `${month}-01`;
}

export function endOfMonth(month: string): string {
  return `${month}-${pad2(daysInMonth(month))}`;
}

export function startOfWeek(s: string): string {
  return addDays(s, -weekday(s));
}

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Calendar cells for a month: leading nulls for the weekday offset, then each date. */
export function monthCells(month: string): (string | null)[] {
  const first = startOfMonth(month);
  const cells: (string | null)[] = Array(weekday(first)).fill(null);
  for (let d = 1; d <= daysInMonth(month); d++) cells.push(`${month}-${pad2(d)}`);
  return cells;
}

export const toMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const fromMin = (n: number): string => `${pad2(Math.floor(n / 60))}:${pad2(n % 60)}`;

/** "07:00" -> "7:00 AM" */
export function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${pad2(m)} ${suffix}`;
}

/** "07:00","11:00" -> "7:00 – 11:00 AM"; crossing noon keeps both suffixes */
export function fmtRange(start: string, end: string): string {
  const a = fmt12(start);
  const b = fmt12(end);
  const aSuffix = a.slice(-2);
  const bSuffix = b.slice(-2);
  return aSuffix === bSuffix ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
}

const dateFmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts });
const longFmt = dateFmt({ weekday: 'long', month: 'long', day: 'numeric' });
const shortFmt = dateFmt({ weekday: 'short', month: 'short', day: 'numeric' });
const monthFmt = dateFmt({ month: 'long', year: 'numeric' });
const monthShortFmt = dateFmt({ month: 'short' });
const dayNumFmt = dateFmt({ day: 'numeric' });

/** "Saturday, June 14" */
export const fmtDateLong = (s: string) => longFmt.format(toDate(s));
/** "Sat, Jun 14" */
export const fmtDateShort = (s: string) => shortFmt.format(toDate(s));
/** "June 2027" */
export const fmtMonth = (month: string) => monthFmt.format(toDate(`${month}-01`));
export const fmtMonthShort = (month: string) => monthShortFmt.format(toDate(`${month}-01`));
export const fmtDayNum = (s: string) => dayNumFmt.format(toDate(s));

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Time options on a 30 minute grid for selects, e.g. 05:00 ... 23:30 */
export function timeOptions(from = '05:00', to = '23:30'): string[] {
  const out: string[] = [];
  for (let m = toMin(from); m <= toMin(to); m += 30) out.push(fromMin(m));
  return out;
}
