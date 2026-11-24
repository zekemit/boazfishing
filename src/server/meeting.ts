import 'server-only';
import { meetingFull, meetingMapUrl, type MeetingInfo } from '@/content/site';

/**
 * Session 1 is backyard practice, so it meets somewhere else than the dock. This address is private:
 * it lives only in server code and is sent to a guest after they book (confirmation screen, emails, calendar
 * invite). It is never part of the public pages or the browser bundle.
 */
const BEGINNER = {
  spot: 'Out front of 1707 Fort Palmetto Circle',
  mapQuery: '1707 Fort Palmetto Circle',
  short: '1707 Fort Palmetto Circle (out front)',
};
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Where a given session meets. Session 1 meets out front of the backyard address; sessions 2 and 3 meet at the pavilion by the dock. */
export function meetingFor(packageId?: string | null): MeetingInfo {
  if (packageId === 'session-1') {
    return {
      full: BEGINNER.spot,
      lower: lowerFirst(BEGINNER.spot),
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BEGINNER.mapQuery)}`,
      note: 'Session 1 is hands-on practice here: knots, your spinning rod and your first casts.',
      short: BEGINNER.short,
    };
  }
  const full = meetingFull();
  return { full, lower: lowerFirst(full), mapUrl: meetingMapUrl(), note: null, short: 'the pavilion near the dock' };
}
