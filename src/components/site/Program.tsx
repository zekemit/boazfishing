'use client';

import { Backpack, Check, Hand, Sparkles, Waves } from 'lucide-react';
import { PACKAGES, PROGRAM, formatPrice, type LessonPackage } from '@/lib/packages';
import { useBooking } from './BookingContext';

function SessionCard({ pkg }: { pkg: LessonPackage }) {
  return (
    <article className="flex flex-col rounded-2xl border border-sand-300 bg-white p-6 sm:p-7" data-testid={`session-card-${pkg.number}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-river text-xl font-extrabold text-white" aria-hidden>
          {pkg.number}
        </span>
        <span className="rounded-full bg-river-50 px-3 py-1 text-sm font-semibold text-river">{pkg.durationLabel}</span>
      </div>
      <h3 className="display mt-4 text-3xl">Session {pkg.number}</h3>
      <p className="display-md mt-1 text-xl text-river">{pkg.title}</p>
      {pkg.tideGate && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-river-50 px-3 py-2 text-sm font-semibold text-river">
          <Waves className="h-4 w-4 shrink-0" aria-hidden /> {pkg.tideGate.label}
        </p>
      )}
      <ul className="mt-5 grid gap-3 border-t border-sand-300 pt-5">
        {pkg.outline.map((item) => (
          <li key={item.text}>
            <p className="flex items-start gap-2.5 font-semibold">
              <Check className="mt-1 h-4 w-4 shrink-0 text-sunset-600" aria-hidden />
              <span>
                {item.text}
                {item.handsOn && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-sunset px-2 py-0.5 align-middle text-xs font-bold text-river-950">
                    <Hand className="h-3 w-3" aria-hidden /> Hands on
                  </span>
                )}
              </span>
            </p>
            {item.sub && (
              <ul className="mt-1.5 grid gap-1 pl-[1.65rem] text-ink-soft">
                {item.sub.map((s) => (
                  <li key={s} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-river/40" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

/** The one program Boaz teaches: three 45 minute one-on-one sessions for $100. */
export function Program() {
  const { startBooking } = useBooking();
  return (
    <section id="program" className="section-y bg-sand-100">
      <div className="container-x">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sunset-700">The program</p>
            <h2 className="display-md mt-1 text-4xl sm:text-5xl">{PROGRAM.name}</h2>
            <p className="prose-serif mt-4 text-lg text-ink-soft">
              {PROGRAM.format}. {PROGRAM.ages}. Three {PROGRAM.sessionMinutes} minute sessions that build on each other, from your first knot to fishing with real bait.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-sunset px-6 py-5 text-river-950 md:text-right">
            <p className="display text-6xl leading-none">{formatPrice(PROGRAM.price)}</p>
            <p className="mt-1 font-bold">for all {PROGRAM.sessionCount} sessions</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold md:justify-end">
              <Sparkles className="h-4 w-4" aria-hidden /> {PROGRAM.jig}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PACKAGES.map((p) => (
            <SessionCard key={p.id} pkg={p} />
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex gap-4 rounded-2xl bg-river p-6 text-white">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sunset text-river-950">
              <Backpack className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="display-md text-2xl">What to bring</p>
              <p className="mt-1 font-semibold text-white">{PROGRAM.bring}.</p>
              <p className="text-white/85">{PROGRAM.bringNote}</p>
              <p className="mt-3 border-t border-white/15 pt-3 text-sm text-white/80">{PROGRAM.flexNote}</p>
            </div>
          </div>
          <button type="button" onClick={() => startBooking()} className="btn-primary px-8 text-lg">
            Book all {PROGRAM.sessionCount} sessions
          </button>
        </div>
      </div>
    </section>
  );
}
