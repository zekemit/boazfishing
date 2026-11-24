import { MapPin, Navigation } from 'lucide-react';
import { MEETING, meetingMapUrl } from '@/content/site';

/** Tells anyone who finds the site (not just neighbors) exactly where to show up. */
export function WhereWeMeet() {
  const map = meetingMapUrl();
  return (
    <section id="where" aria-labelledby="where-h" className="section-y bg-sand">
      <div className="container-x">
        <div className="grid items-center gap-6 rounded-2xl bg-river-900 p-6 text-white sm:p-10 md:grid-cols-[auto_1fr_auto]">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sunset text-river-950">
            <MapPin className="h-9 w-9" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sunset-400">Where we meet</p>
            <h2 id="where-h" className="display mt-1 text-4xl sm:text-5xl">
              {MEETING.spot}
            </h2>
            <p className="prose-serif mt-2 text-lg text-white/85">
              {MEETING.area}
              {MEETING.address ? `, ${MEETING.address}` : ''}. Come to the pavilion and look for Boaz. He confirms by text or email the day before, with a weather check.
            </p>
          </div>
          {map && (
            <a href={map} target="_blank" rel="noopener noreferrer" className="btn-primary justify-self-start md:justify-self-end">
              <Navigation className="h-5 w-5" aria-hidden /> Open in Maps
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
