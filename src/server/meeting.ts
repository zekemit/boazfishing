import 'server-only';
import { meetingFull, meetingMapUrl, type MeetingInfo } from '@/content/site';

/**
 * First Cast starts with backyard training, so beginners meet somewhere else. This address is private:
 * it lives only in server code and is sent to a guest after they book (confirmation screen, emails, calendar
 * invite). It is never part of the public pages or the browser bundle.
 */
const BEGINNER = {
  spot: 'Out front of 1707 Fort Palmetto Circle',
  mapQuery: '1707 Fort Palmetto Circle',
  short: '1707 Fort Palmetto Circle (out front)',
};
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Where a given lesson meets. First Cast meets out front of the backyard address; the others meet at the pavilion. */
export function meetingFor(packageId?: string | null): MeetingInfo {
  if (packageId === 'first-cast') {
    return {
      full: BEGINNER.spot,
      lower: lowerFirst(BEGINNER.spot),
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BEGINNER.mapQuery)}`,
      note: 'Your First Cast lesson starts here with backyard training, then moves on to the pond.',
      short: BEGINNER.short,
    };
  }
  const full = meetingFull();
  return { full, lower: lowerFirst(full), mapUrl: meetingMapUrl(), note: null, short: 'the pavilion near the dock' };
}
