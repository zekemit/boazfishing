'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Check, Waves } from 'lucide-react';
import { ApiError, api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { PACKAGES, formatPrice, getPackage } from '@/lib/packages';
import { notifyChange } from '@/lib/sync';
import { addMonths, fmt12, fmtDateLong, fmtDateShort, fmtMonth, fromMin, monthOf, toMin } from '@/lib/time';
import type { Booking as BookingType, PackageId, PublicAvailability } from '@/lib/types';
import { useRemote } from '@/hooks/useRemote';
import { useBooking } from '../BookingContext';
import { Calendar } from './Calendar';
import { Confirmation } from './Confirmation';
import { DetailsForm, EMPTY_FORM, validateForm, type FormState } from './DetailsForm';
import { Summary, SummaryBar } from './Summary';

type Step = 1 | 2 | 3 | 4;
const STEPS: Array<{ n: Step; label: string }> = [
  { n: 1, label: 'Lesson' },
  { n: 2, label: 'Date and time' },
  { n: 3, label: 'Your details' },
  { n: 4, label: 'Confirmed' },
];

export function Booking() {
  const reduce = useReducedMotion();
  const { packageId, setPackageId, preferredDate, signal } = useBooking();

  const [step, setStep] = useState<Step>(1);
  const [month, setMonth] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<BookingType | null>(null);
  const [cancelUrl, setCancelUrl] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const pendingDate = useRef<string | null>(null);
  const lastSignal = useRef(0);
  const prevStep = useRef<Step>(1);

  const pkg = getPackage(packageId);
  const url = packageId && step !== 4 ? `/api/availability?package=${packageId}` : null;
  const { data, error: loadError, loading, refresh } = useRemote<PublicAvailability>(url, 30_000);
  const avail = data && data.packageId === packageId ? data : null;

  // A package card (or the hero's "Grab it") was used: jump to the calendar with that lesson selected.
  useEffect(() => {
    if (signal === lastSignal.current) return;
    lastSignal.current = signal;
    setDate(null);
    setStart(null);
    setMonth(null);
    setNotice(null);
    pendingDate.current = preferredDate;
    setStep(2);
  }, [signal, preferredDate]);

  // Apply a pre-selected date once availability for the chosen lesson arrives.
  useEffect(() => {
    if (!avail || !pendingDate.current) return;
    const d = pendingDate.current;
    pendingDate.current = null;
    if (avail.days[d]) setDate(d);
  }, [avail]);

  // Live lock: if someone else takes the date or time while this person is choosing, say so and step back.
  useEffect(() => {
    if (!avail || step === 4) return;
    if (date && !avail.days[date]) {
      setNotice('That date just filled up. Pick another day.');
      setDate(null);
      setStart(null);
      if (step === 3) setStep(2);
    } else if (date && start && !avail.days[date].includes(start)) {
      setNotice('That time was just taken. Pick another start time.');
      setStart(null);
      if (step === 3) setStep(2);
    }
  }, [avail, date, start, step]);

  // Keep the panel in view as the person moves through the steps (matters on phones).
  // Compares against the previous step so the page never scrolls on first load, even under StrictMode's double effect run.
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    panelRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [step, reduce]);

  const sortedDates = useMemo(() => (avail ? Object.keys(avail.days).sort() : []), [avail]);
  const defaultMonth = avail ? monthOf(preferredDate && avail.days[preferredDate] ? preferredDate : (avail.next?.date ?? avail.today)) : null;
  const viewMonth = month ?? defaultMonth;
  const minMonth = avail ? monthOf(avail.today) : null;
  const maxMonth = minMonth ? addMonths(minMonth, 14) : null;
  const monthHasDays = !!viewMonth && sortedDates.some((d) => d.startsWith(viewMonth));
  const nextOpenAfter = viewMonth ? sortedDates.find((d) => monthOf(d) > viewMonth) : undefined;
  const times = date && avail ? (avail.days[date] ?? []) : [];

  function choosePackage(id: PackageId) {
    if (id !== packageId) {
      setPackageId(id);
      setDate(null);
      setStart(null);
      setMonth(null);
      setNotice(null);
      setForm((f) => ({ ...f, anglers: Math.min(f.anglers, getPackage(id)?.maxAnglers ?? 4) }));
    }
  }

  async function submit() {
    if (!pkg || !date || !start) return;
    const found = validateForm(form, pkg.maxAnglers);
    setErrors(found);
    setFormError(null);
    const firstBad = Object.keys(found)[0];
    if (firstBad) {
      document.getElementById(`field-${firstBad}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ booking: BookingType; cancelUrl?: string }>('/api/bookings', {
        method: 'POST',
        json: {
          packageId: pkg.id,
          date,
          start,
          name: form.name,
          email: form.email,
          phone: form.phone,
          experience: form.experience,
          anglers: form.anglers,
          notes: form.notes,
          company: form.company,
        },
      });
      setBooking(res.booking);
      setCancelUrl(res.cancelUrl ?? null);
      setStep(4);
      notifyChange();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setStart(null);
        setNotice(e.message);
        setStep(2);
        void refresh();
      } else if (e instanceof ApiError && e.fields) {
        setErrors(e.fields);
        setFormError(e.message);
      } else {
        setFormError(errorMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function bookAnother() {
    setBooking(null);
    setDate(null);
    setStart(null);
    setMonth(null);
    setNotice(null);
    setErrors({});
    setFormError(null);
    setForm((f) => ({ ...EMPTY_FORM, name: f.name, email: f.email, phone: f.phone }));
    setStep(1);
  }

  const slide = reduce
    ? {}
    : { initial: { opacity: 0, x: 18 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -18 }, transition: { duration: 0.2 } };

  return (
    <section id="book" className="section-y bg-river-900 text-white">
      <div className="container-x">
        <div className="max-w-2xl">
          <h2 className="display-md text-4xl sm:text-5xl">Book your lesson</h2>
          <p className="prose-serif mt-4 text-lg text-white/80">
            Pick a lesson, then choose from the dates Boaz has open. Your time locks in the moment you book.
          </p>
        </div>

        <div ref={panelRef} className="mt-10 scroll-mt-20 overflow-hidden rounded-2xl bg-sand text-ink shadow-lift">
          {/* Progress */}
          <ol className="flex border-b border-sand-300 bg-white" aria-label="Booking steps">
            {STEPS.map((s) => {
              const done = step > s.n;
              const current = step === s.n;
              const canGo = done && step !== 4;
              return (
                <li key={s.n} className="flex-1" aria-current={current ? 'step' : undefined}>
                  <button
                    type="button"
                    disabled={!canGo}
                    onClick={() => canGo && setStep(s.n)}
                    aria-label={`Step ${s.n}: ${s.label}`}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 border-b-[3px] px-1 py-3.5 text-sm font-semibold sm:px-3',
                      current ? 'border-sunset text-ink' : done ? 'border-river/30 text-river' : 'border-transparent text-ink-mute',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                        done ? 'bg-river text-white' : current ? 'bg-sunset text-river-950' : 'bg-sand-200 text-ink-mute',
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : s.n}
                    </span>
                    <span className="hidden whitespace-nowrap sm:inline">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="grid lg:grid-cols-[1fr_21rem]">
            <div className="min-w-0 p-5 sm:p-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} {...slide}>
                  {step === 1 && (
                    <fieldset>
                      <legend className="display-md text-2xl sm:text-3xl">Choose your lesson</legend>
                      <div className="mt-5 grid gap-3">
                        {PACKAGES.map((p) => {
                          const on = packageId === p.id;
                          return (
                            <label
                              key={p.id}
                              className={cn(
                                'flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-sunset sm:p-5',
                                on ? 'border-river bg-river-50' : 'border-sand-300 bg-white hover:border-river/40',
                              )}
                            >
                              <input
                                type="radio"
                                name="lesson"
                                value={p.id}
                                checked={on}
                                onChange={() => choosePackage(p.id)}
                                className="sr-only"
                              />
                              <span
                                className={cn(
                                  'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                                  on ? 'border-river bg-river' : 'border-ink-mute/50',
                                )}
                                aria-hidden
                              >
                                {on && <span className="h-2 w-2 rounded-full bg-white" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-baseline gap-x-3">
                                  <span className="display-md text-xl">{p.name}</span>
                                  <span className="text-sm text-ink-mute">{p.durationLabel}</span>
                                </span>
                                <span className="mt-0.5 block text-ink-soft">{p.tagline}</span>
                                {p.tideGate && <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-river"><Waves className="h-4 w-4" aria-hidden />{p.tideGate.label}</span>}
                              </span>
                              <span className="shrink-0 text-right">
                                <span className="display-md block text-xl">{formatPrice(p.basePrice)}</span>
                                <span className="text-xs text-ink-mute">up to {p.includedAnglers}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        disabled={!packageId}
                        onClick={() => setStep(2)}
                        className="btn-dark mt-6 w-full sm:w-auto"
                      >
                        Continue to date and time
                      </button>
                    </fieldset>
                  )}

                  {step === 2 && pkg && (
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="display-md text-2xl sm:text-3xl">Choose a date and time</h3>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-sm font-semibold text-river underline underline-offset-4"
                        >
                          Change lesson ({pkg.name})
                        </button>
                      </div>

                      {notice && (
                        <p role="status" className="mt-4 flex gap-2.5 rounded-lg border border-sunset-200 bg-sunset-50 px-4 py-3 text-sunset-700">
                          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                          <span className="font-medium">{notice}</span>
                        </p>
                      )}

                      {loading && !avail && (
                        <div className="mt-6 grid gap-2" aria-busy="true" aria-label="Loading open dates">
                          <div className="h-11 animate-pulse rounded-lg bg-sand-200" />
                          <div className="h-64 animate-pulse rounded-lg bg-sand-100" />
                        </div>
                      )}

                      {loadError && !avail && (
                        <div role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                          <p className="font-semibold">We couldn’t load open dates.</p>
                          <p className="mt-1 text-sm">{loadError}</p>
                          <button type="button" onClick={() => void refresh()} className="btn-outline btn-sm mt-3">
                            Try again
                          </button>
                        </div>
                      )}

                      {avail && sortedDates.length === 0 && (
                        <p className="mt-6 rounded-lg bg-sand-100 p-5 text-ink-soft">
                          Boaz has no open dates for {pkg.name} right now. New dates are added often, so check back soon.
                        </p>
                      )}

                      {avail && viewMonth && minMonth && maxMonth && sortedDates.length > 0 && (
                        <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,22rem)_1fr] md:items-start">
                          <div>
                            <Calendar
                              month={viewMonth}
                              days={avail.days}
                              selected={date}
                              today={avail.today}
                              canPrev={viewMonth > minMonth}
                              canNext={viewMonth < maxMonth}
                              onMonth={(d) => setMonth(addMonths(viewMonth, d))}
                              onSelect={(d) => {
                                setDate(d);
                                setStart(null);
                                setNotice(null);
                              }}
                            />
                            {avail?.tideUnavailable && (
                              <p role="alert" className="mt-4 rounded-lg border border-sunset-300 bg-sunset-50 p-4 text-sm text-sunset-700">
                                Tide times are loading slowly right now, so start times for {pkg?.name} can&apos;t be shown. Please try again in a minute, or pick another lesson.
                              </p>
                            )}
                            {pkg?.tideGate && !avail?.tideUnavailable && (
                              <p className="mt-4 flex items-start gap-2 rounded-lg bg-river-50 p-3 text-sm text-river">
                                <Waves className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                {pkg.name} runs on the incoming tide, so start times follow the tide each day.
                              </p>
                            )}
                            {!monthHasDays && !avail?.tideUnavailable && (
                              <p className="mt-4 rounded-lg bg-sand-100 p-4 text-sm text-ink-soft">
                                No open dates in {fmtMonth(viewMonth)}.{' '}
                                {nextOpenAfter && (
                                  <button
                                    type="button"
                                    className="font-semibold text-river underline underline-offset-4"
                                    onClick={() => setMonth(monthOf(nextOpenAfter))}
                                  >
                                    Jump to {fmtDateShort(nextOpenAfter)}
                                  </button>
                                )}
                              </p>
                            )}
                          </div>

                          <div aria-live="polite">
                            {!date ? (
                              <p className="rounded-lg border border-dashed border-sand-400 p-5 text-ink-soft">
                                Pick a highlighted date to see start times.
                              </p>
                            ) : (
                              <>
                                <h4 className="display-md text-xl">{fmtDateLong(date)}</h4>
                                <p className="mt-1 text-sm text-ink-soft">
                                  {start
                                    ? `Your lesson runs ${fmt12(start)} to ${fmt12(fromMin(toMin(start) + pkg.durationMin))}.`
                                    : `Choose a start time. The lesson runs ${pkg.durationLabel}.`}
                                </p>
                                {pkg.tideGate && (
                                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-river-50 px-3 py-2 text-sm text-river">
                                    <Waves className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                    <span>
                                      {pkg.tideGate.label}.
                                      {avail?.highTides?.[date]?.length ? ` High tide that day: ${avail.highTides[date].map(fmt12).join(' and ')}.` : ''}
                                    </span>
                                  </p>
                                )}
                                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Start times">
                                  {times.map((t) => {
                                    const on = start === t;
                                    return (
                                      <button
                                        key={t}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => {
                                          setStart(t);
                                          setNotice(null);
                                        }}
                                        className={cn(
                                          'min-h-[52px] rounded-lg border-2 px-2 py-2 text-center transition-colors',
                                          on ? 'border-river bg-river text-white' : 'border-sand-300 bg-white hover:border-river/50',
                                        )}
                                      >
                                        <span className="block font-bold">{fmt12(t)}</span>
                                        <span className={cn('block text-xs', on ? 'text-white/75' : 'text-ink-mute')}>
                                          to {fmt12(fromMin(toMin(t) + pkg.durationMin))}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          disabled={!date || !start}
                          onClick={() => setStep(3)}
                          className="btn-dark w-full sm:w-auto"
                        >
                          Continue to your details
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 3 && pkg && date && start && (
                    <DetailsForm
                      pkg={pkg}
                      form={form}
                      errors={errors}
                      formError={formError}
                      submitting={submitting}
                      onChange={(patch) => {
                        setForm((f) => ({ ...f, ...patch }));
                        const keys = Object.keys(patch);
                        if (keys.some((k) => errors[k])) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))));
                      }}
                      onSubmit={() => void submit()}
                      onBack={() => setStep(2)}
                    />
                  )}

                  {step === 4 && booking && <Confirmation booking={booking} cancelUrl={cancelUrl} onAnother={bookAnother} />}
                </motion.div>
              </AnimatePresence>

            </div>

            {/* Phones get a one-line summary above the step; large screens get the full sidebar. */}
            {step !== 4 && pkg && (
              <div className="order-first border-b border-sand-300 bg-sand-100/70 px-4 py-3 sm:px-6 lg:hidden">
                <SummaryBar pkg={pkg} date={date} start={start} anglers={form.anglers} showAnglers={step === 3} />
              </div>
            )}
            {step !== 4 && (
              <div className="hidden border-l border-sand-300 bg-sand-100/60 p-6 lg:block">
                <Summary pkg={pkg} date={date} start={start} anglers={form.anglers} showAnglers={step === 3} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
