'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Backpack, CalendarClock, Sunrise, Users } from 'lucide-react';
import { HERO } from '@/content/site';
import { fmt12, fmtDateShort } from '@/lib/time';
import type { PublicPhoto } from '@/lib/types';
import { useBooking } from './BookingContext';
import { Photo } from './Photo';

const BADGE_ICONS = [Backpack, Users, Sunrise];

export function Hero({ photo, next }: { photo: PublicPhoto; next: { date: string; start: string } | null }) {
  const reduce = useReducedMotion();
  const { scrollToBook, selectPackage } = useBooking();

  // One orchestrated entrance: the headline block rises in, in sequence. Nothing else on the page animates on load.
  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 26 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay: 0.1 + i * 0.1, ease: [0.2, 0.7, 0.2, 1] as const },
        };

  return (
    <section id="top" className="relative isolate flex min-h-[100svh] overflow-hidden bg-river-900 text-white">
      {/* Phones: the photo owns the top of the screen and fades into the green, so faces stay clear of the headline.
          Tablet and up: full-bleed photo with the headline over the water on the left. */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[62svh] md:inset-0 md:h-auto">
        <Photo
          src={photo.src}
          alt={photo.alt}
          focusX={photo.focusX}
          focusY={photo.focusY}
          priority
          fallback={<div className="h-full w-full bg-gradient-to-br from-river-600 via-river-800 to-river-950" />}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-river-900 via-river-900/20 to-river-950/30 md:bg-gradient-to-r md:from-river-950/92 md:via-river-950/55 md:to-river-950/0" />
      </div>

      <div className="container-x relative flex flex-col pb-10 pt-[46svh] md:justify-center md:pb-24 md:pt-28">
        <motion.h1
          {...rise(0)}
          className="display max-w-[15ch] text-[clamp(2.7rem,8.4vw,6.4rem)] drop-shadow-[0_2px_24px_rgba(0,0,0,.35)]"
        >
          {HERO.headline}
        </motion.h1>

        <motion.p {...rise(1)} className="prose-serif mt-4 max-w-xl text-base text-white/92 sm:text-lg md:mt-6 md:text-xl">
          {HERO.sub}
        </motion.p>

        <motion.div {...rise(2)} className="mt-6 grid grid-cols-2 gap-3 sm:flex md:mt-7">
          <button type="button" className="btn-primary px-4 sm:px-8 sm:text-lg" onClick={scrollToBook}>
            Book a lesson
          </button>
          <a href="#meet" className="btn-outline-light px-4 sm:px-8 sm:text-lg">
            Meet Boaz
          </a>
        </motion.div>

        <motion.ul {...rise(3)} className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5 text-[15px] font-medium text-white/90">
          {HERO.badges.map((label, i) => {
            const Icon = BADGE_ICONS[i % BADGE_ICONS.length];
            return (
              <li key={label} className="flex items-center gap-2">
                <Icon className="h-[18px] w-[18px] text-sunset-400" aria-hidden />
                {label}
              </li>
            );
          })}
        </motion.ul>

        {next && (
          <motion.div
            {...rise(4)}
            className="mt-6 flex w-full max-w-sm items-center gap-3 rounded-xl border border-white/20 bg-river-950/55 px-4 py-3 shadow-ticket backdrop-blur-md md:absolute md:bottom-10 md:right-8 md:mt-0 md:w-auto md:max-w-none lg:right-10"
          >
            <CalendarClock className="h-7 w-7 shrink-0 text-sunset-400" aria-hidden />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-sm text-white/70">Next open spot</p>
              <p className="font-semibold">
                {fmtDateShort(next.date)} at {fmt12(next.start)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectPackage('first-cast', next.date)}
              className="shrink-0 rounded-lg bg-sunset px-3.5 py-2 text-sm font-semibold text-river-950 hover:bg-sunset-400"
            >
              Grab it
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
