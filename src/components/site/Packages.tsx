'use client';

import { ArrowRight, Check, Waves } from 'lucide-react';
import { PACKAGES, formatPrice, type LessonPackage } from '@/lib/packages';
import { cn } from '@/lib/cn';
import { useBooking } from './BookingContext';

const SCALE_MIN = 120; // the ruler runs 0 to 2 hours

/** A tape measure showing how long the lesson is. The amber run is the lesson; ticks every 30 minutes. */
export function DurationRuler({ minutes, label, inverse }: { minutes: number; label: string; inverse?: boolean }) {
  const ticks = Array.from({ length: SCALE_MIN / 15 + 1 }, (_, i) => i * 15);
  return (
    <div role="img" aria-label={`Lesson length: ${label}`} className="mt-6">
      <p className="mb-2 flex items-baseline justify-between text-sm">
        <span className={inverse ? 'text-white/70' : 'text-ink-mute'}>Lesson length</span>
        <span className="font-semibold">{label}</span>
      </p>
      <div className="relative h-7">
        <div className={cn('absolute inset-x-0 top-0 h-3 rounded-sm', inverse ? 'bg-white/15' : 'bg-river/10')} />
        <div className="absolute left-0 top-0 h-3 rounded-sm bg-sunset" style={{ width: `${(minutes / SCALE_MIN) * 100}%` }} />
        {ticks.map((t) => (
          <span
            key={t}
            className={cn(
              'absolute top-3 w-px',
              t % 30 === 0 ? 'h-3.5' : 'h-2',
              inverse ? 'bg-white/45' : 'bg-river/40',
              t === SCALE_MIN && '-translate-x-px',
            )}
            style={{ left: `${(t / SCALE_MIN) * 100}%` }}
          />
        ))}
      </div>
      <div className={cn('mt-1 flex justify-between text-xs font-medium tabular-nums', inverse ? 'text-white/60' : 'text-ink-mute')}>
        {['0', '30 min', '1 hr', '90 min', '2 hr'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function PackageCard({ pkg, featured }: { pkg: LessonPackage; featured: boolean }) {
  const { selectPackage } = useBooking();
  return (
    <article
      className={cn(
        'flex flex-col rounded-2xl p-7 sm:p-8',
        featured ? 'bg-river text-white shadow-lift lg:-my-3 lg:py-11' : 'border border-sand-300 bg-white',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full px-3 py-1 text-sm font-semibold',
            featured ? 'bg-white/12 text-white' : 'bg-river-50 text-river',
          )}
        >
          {pkg.level}
        </span>
        {pkg.highlight && (
          <span className="rounded-full bg-sunset px-3 py-1 text-sm font-semibold text-river-950">{pkg.highlight}</span>
        )}
      </div>

      <h3 className="display mt-5 text-5xl">{pkg.name}</h3>
      <p className={cn('prose-serif mt-2 text-lg', featured ? 'text-white/85' : 'text-ink-soft')}>{pkg.tagline}</p>

      {pkg.path && (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-river-50 px-3.5 py-3 text-sm font-semibold text-river" aria-label={`Lesson path: ${pkg.path.join(' then ')}`}>
          {pkg.path.map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-4 w-4 text-sunset-600" aria-hidden />}
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-river/15">{step}</span>
            </span>
          ))}
        </div>
      )}

      <DurationRuler minutes={pkg.durationMin} label={pkg.durationLabel} inverse={featured} />

      {pkg.tideGate && (
        <p className={cn('mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold', featured ? 'bg-white/12 text-white' : 'bg-river-50 text-river')}>
          <Waves className="h-4 w-4 shrink-0" aria-hidden />
          {pkg.tideGate.label}, when the fish move in to feed
        </p>
      )}

      <p className="mt-6 flex items-baseline gap-2">
        <span className="display text-5xl">{formatPrice(pkg.basePrice)}</span>
        <span className={cn('text-sm', featured ? 'text-white/70' : 'text-ink-mute')}>
          for up to {pkg.includedAnglers} anglers
        </span>
      </p>
      <p className={cn('mt-1 text-sm', featured ? 'text-white/70' : 'text-ink-mute')}>
        {pkg.maxAnglers > pkg.includedAnglers
          ? `+${formatPrice(pkg.extraAnglerPrice)} per extra angler, up to ${pkg.maxAnglers}. Pay in person.`
          : 'One or two anglers, same price. Pay in person.'}
      </p>

      <ul className={cn('mt-6 grid gap-3 border-t pt-6', featured ? 'border-white/15' : 'border-sand-300')}>
        {pkg.includes.map((item) => (
          <li key={item} className="flex gap-3">
            <Check className={cn('mt-1 h-4 w-4 shrink-0', featured ? 'text-sunset-400' : 'text-sunset-600')} aria-hidden />
            <span className={featured ? 'text-white/92' : 'text-ink-soft'}>{item}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => selectPackage(pkg.id)}
        className={cn('mt-8 w-full', featured ? 'btn-primary' : 'btn-dark')}
      >
        Book {pkg.name}
      </button>
    </article>
  );
}

export function Packages() {
  return (
    <section id="lessons" className="section-y bg-sand-100">
      <div className="container-x">
        <div className="max-w-2xl">
          <h2 className="display-md text-4xl sm:text-5xl">Pick your lesson</h2>
          <p className="prose-serif mt-4 text-lg text-ink-soft">
            Three ways to spend a summer morning or evening on the water. Choose one and the scheduler below opens with it
            selected.
          </p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-start lg:gap-6">
          {PACKAGES.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} featured={pkg.id === 'summer-angler'} />
          ))}
        </div>
      </div>
    </section>
  );
}
