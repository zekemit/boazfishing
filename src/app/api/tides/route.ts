import type { NextRequest } from 'next/server';
import { isValidDate } from '@/lib/time';
import { fail, guardAdmin, guarded, json } from '@/server/http';
import { getTideRange, getTideSnapshot } from '@/server/tides';

export const dynamic = 'force-dynamic';

/**
 * Admin: live tide snapshot (NOAA, with a simulated fallback), or ?from=&to= for daily highs and lows.
 * NOAA answers are cached on the server, so polling this is cheap.
 */
export async function GET(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');
    if (from || to) {
      if (!from || !to || !isValidDate(from) || !isValidDate(to) || to < from) return fail(400, 'Invalid date range.');
      if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 120) return fail(400, 'Pick a range of 120 days or less.');
      return json(await getTideRange(from, to));
    }
    return json(await getTideSnapshot());
  });
}
