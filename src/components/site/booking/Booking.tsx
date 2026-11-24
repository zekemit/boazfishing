'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Check, Waves } from 'lucide-react';
import { ApiError, api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { PACKAGES, PROGRAM, formatPrice } from '@/lib/packages';
import { notifyChange } from '@/lib/sync';
import { addMonths, fmt12, fmtDateLong, fmtDateShort, fmtMonth, fromMin, monthOf, toMin } from '@/lib/time';
import type { Booking as BookingType, PublicAvailability } from '@/lib/types';
import type { MeetingInfo } from '@/content/site';
import { useRemote } from '@/hooks/useRemote';
import { useBooking } from '../BookingContext';
import { Calendar } from './Calendar';
import { Confirmation } from './Confirmation';
import { DetailsForm, EMPTY_FORM, validateForm, type FormState } from './DetailsForm';
import { Summary, SummaryBar, type Pick } from './Summary';

type Step = 1 | 2 | 3 | 4;
const STEPS: Array<{ n: Step; label: string }> = [
  { n: 1, label: 'The program' },
  { n: 2, label: 'Dates and times' },
  { n: 3, label: 'Your details' },
  { n: 4, label: 'Confirmed' },
];
const EMPTY_PICKS: Pick[] = [
  { date: null, start: null },
  { date: null, start: null },
  { date: null, start: null },
];
const isDone = (p: Pick) => !!(p.date && p.start);

export function Booking() {
  const reduce = useReducedMotion();
  const { preferredDate, signal } = useBooking();

  const [step, setStep] = useState<Step>(1);
  const [active, setActive] = useState(0);
  const [picks, setPicks] = useState<Pick[]>(EMPTY_PICKS);
  const [months, setMonths] = useState<(string | null)[]>([null, null, null]);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<BookingType[] | null>(null);
  const [cancelUrl, setCancelUrl] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<MeetingInfo[] | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const pendingDate = useRef<string | null>(null);
  const lastSignal = useRef(0);
  const prevStep = useRef<Step>(1);

  // Availability for each of the three sessions (they have different rules: sessions 2 and 3 follow the tide).
  const on = step === 2 || step === 3;
  const r0 = useRemote<PublicAvailability>(on ? '/api/availability?package=session-1' : null, 30_000);
  const r1 = useRemote<PublicAvailability>(on ? '/api/availability?package=session-2' : null, 30_000);
  const r2 = useRemote<PublicAvailability>(on ? '/api/availability?package=session-3' : null, 30_000);
  const remotes = [r0, r1, r2];
  const avail = remotes.map((r, i) => (r.data && r.data.packageId === PACKAGES[i].id ? r.data : null));

  // A "book" button (or the hero's "Grab it") was used: jump to the first session's calendar.
  useEffect(() => {
    if (signal === lastSignal.current) return;
    lastSignal.current = signal;
    setPicks(EMPTY_PICKS);
    setMonths([null, null, null]);
    setActive(0);
    setNotice(null);
    pendingDate.current = preferredDate;
    setStep(2);
  }, [signal, preferredDate]);

  // Apply a pre-selected date to session 1 once its availability arrives.
  useEffect(() => {
    const a = avail[0];
    if (!a || !pendingDate.current) return;
    const d = pendingDate.current;
    pendingDate.current = null;
    if (a.days[d]) setPicks((p) => p.map((x, i) => (i === 0 ? { date: d, start: null } : x)));
  }, [avail[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live lock: if someone else takes a date or time while this family is choosing, say so and step back to that session.
  useEffect(() => {
    if (step === 4) return;
    for (let i = 0; i < 3; i++) {
      const a = avail[i];
      const p = picks[i];
      if (!a || !p.date) continue;
      const gone = !a.days[p.date] ? 'date' : p.start && !a.days[p.date].includes(p.start) ? 'time' : null;
      if (!gone) continue;
      setNotice(gone === 'date' ? `That date just filled up for session ${i + 1}. Pick another day.` : `That time was just taken for session ${i + 1}. Pick another start time.`);
      setPicks((all) => all.map((x, j) => (j === i ? { date: gone === 'date' ? null : x.date, start: null } : x)));
      setActive(i);
      if (step === 3) setStep(2);
      break;
    }
  }, [avail[0], avail[1], avail[2], picks, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the panel in view as the person moves through the steps (matters on phones).
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    panelRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [step, reduce]);

  const pkg = PACKAGES[active];
  const a = avail[active];
  const prevPick = active > 0 ? picks[active - 1] : null;

  // Each session has to be on a later day than the one before it.
  const days = useMemo(() => {
    if (!a) return {} as Record<string, string[]>;
    if (!prevPick?.date) return a.days;
    const min = prevPick.date;
    return Object.fromEntries(Object.entries(a.days).filter(([d]) => d > min));
  }, [a, prevPick?.date]);
  const sortedDates = useMemo(() => Object.keys(days).sort(), [days]);
  const pick = picks[active];
  const wantMonth = months[active] ?? monthOf(preferredDate && days[preferredDate] ? preferredDate : (sortedDates[0] ?? a?.today ?? ''));
  const viewMonth = wantMonth || null;
  const minMonth = a ? monthOf(a.today) : null;
  const maxMonth = minMonth ? addMonths(minMonth, 14) : null;
  const monthHasDays = !!viewMonth && sortedDates.some((d) => d.startsWith(viewMonth));
  const nextOpenAfter = viewMonth ? sortedDates.find((d) => monthOf(d) > viewMonth) : undefined;
  const times = pick.date ? (days[pick.date] ?? []) : [];
  const allDone = picks.every(isDone);
  const remote = remotes[active];

  function setPick(i: number, patch: Partial<Pick>) {
    setPicks((all) => {
      const next = all.map((x, j) => (j === i ? { ...x, ...patch } : x));
      // Changing an earlier session can invalidate the later ones (they must come after it).
      for (let j = i + 1; j < 3; j++) {
        const prevDate = next[j - 1].date;
        if (next[j].date && (!prevDate || next[j].date! <= prevDate)) next[j] = { date: null, start: null };
      }
      return next;
    });
  }

  async function submit() {
    if (!allDone) return;
    const found = validateForm(form);
    setErrors(found);
    setFormError(null);
    const firstBad = Object.keys(found)[0];
    if (firstBad) {
      document.getElementById(`field-${firstBad}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ bookings: BookingType[]; cancelUrl?: string; meetings: MeetingInfo[] }>('/api/bookings', {
        method: 'POST',
        json: {
          sessions: picks.map((p) => ({ date: p.date, start: p.start })),
          name: form.name,
          email: form.email,
          phone: form.phone,
          experience: form.experience,
          notes: form.notes,
          company: form.company,
        },
      });
      setBooked(res.bookings);
      setCancelUrl(res.cancelUrl ?? null);
      setMeetings(res.meetings);
      setStep(4);
      notifyChange();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const n = Number(/session (\d)/i.exec(e.message)?.[1] ?? 1) - 1;
        setPick(Math.min(Math.max(n, 0), 2), { start: null });
        setActive(Math.min(Math.max(n, 0), 2));
        setNotice(e.message);
        setStep(2);
        remotes.forEach((r) => void r.refresh());
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
    setBooked(null);
    setPicks(EMPTY_PICKS);
    setMonths([null, null, null]);
    setActive(0);
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
          <h2 className="display-md text-4xl sm:text-5xl">Book your sessions</h2>
          <p className="prose-serif mt-4 text-lg text-white/80">
            Choose a time for each of the {PROGRAM.sessionCount} sessions from the dates Boaz has open. Your times lock in the moment you book.
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
                    <div>
                      <h3 className="display-md text-2xl sm:text-3xl">{PROGRAM.name}</h3>
                      <p className="mt-2 text-ink-soft">
                        {PROGRAM.format}. {PROGRAM.ages}. {formatPrice(PROGRAM.price)} for all {PROGRAM.sessionCount} sessions, paid in person. {PROGRAM.jig}.
                      </p>
                      <ol className="mt-5 grid gap-3">
                        {PACKAGES.map((p) => (
                          <li key={p.id} className="flex gap-4 rounded-xl border-2 border-sand-300 bg-white p-4">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-river text-lg font-extrabold text-white" aria-hidden>
                              {p.number}
                            </span>
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-baseline gap-x-3">
                                <span className="display-md text-xl">{p.title}</span>
                                <span className="text-sm text-ink-mute">{p.durationLabel}</span>
                              </span>
                              <span className="mt-0.5 block text-ink-soft">{p.tagline}</span>
                              {p.tideGate && (
                                <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-river">
                                  <Waves className="h-4 w-4" aria-hidden />
                                  {p.tideGate.label}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-4 text-sm text-ink-soft">
                        Bring: {PROGRAM.bring.toLowerCase()}. {PROGRAM.bringNote}
                      </p>
                      <button type="button" onClick={() => setStep(2)} className="btn-dark mt-6 w-full sm:w-auto">
                        Choose my {PROGRAM.sessionCount} times
                      </button>
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <h3 className="display-md text-2xl sm:text-3xl">Choose a date and time for each session</h3>

                      {/* One tab per session: you can only open one once the one before it is picked. */}
                      <div role="tablist" aria-label="Sessions" className="mt-5 grid grid-cols-3 gap-2">
                        {PACKAGES.map((p, i) => {
                          const open = i === 0 || isDone(picks[i - 1]);
                          const done = isDone(picks[i]);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              role="tab"
                              aria-selected={active === i}
                              disabled={!open}
                              onClick={() => {
                                setActive(i);
                                setNotice(null);
                              }}
                              className={cn(
                                'rounded-xl border-2 p-2.5 text-left transition-colors sm:p-3',
                                active === i ? 'border-river bg-river-50' : 'border-sand-300 bg-white hover:border-river/40',
                                !open && 'opacity-45',
                              )}
                            >
                              <span className="flex items-center gap-1.5 text-sm font-bold">
                                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-xs', done ? 'bg-river text-white' : 'bg-sand-300 text-ink-soft')}>
                                  {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : p.number}
                                </span>
                                Session {p.number}
                              </span>
                              <span className="mt-1 block truncate text-xs text-ink-mute">{done ? `${fmtDateShort(picks[i].date!)}, ${fmt12(picks[i].start!)}` : 'Pick a time'}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="display-md text-xl sm:text-2xl">
                          Session {pkg.number}: {pkg.title}
                        </h4>
                        <span className="text-sm text-ink-mute">{pkg.durationLabel}</span>
                      </div>
                      {prevPick?.date && <p className="mt-1 text-sm text-ink-soft">Pick a day after session {active} ({fmtDateShort(prevPick.date)}).</p>}

                      {notice && (
                        <p role="status" className="mt-4 flex gap-2.5 rounded-lg border border-sunset-200 bg-sunset-50 px-4 py-3 text-sunset-700">
                          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                          <span className="font-medium">{notice}</span>
                        </p>
                      )}

                      {remote.loading && !a && (
                        <div className="mt-6 grid gap-2" aria-busy="true" aria-label="Loading open dates">
                          <div className="h-11 animate-pulse rounded-lg bg-sand-200" />
                          <div className="h-64 animate-pulse rounded-lg bg-sand-100" />
                        </div>
                      )}

                      {remote.error && !a && (
                        <div role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                          <p className="font-semibold">We couldn’t load open dates.</p>
                          <p className="mt-1 text-sm">{remote.error}</p>
                          <button type="button" onClick={() => void remote.refresh()} className="btn-outline btn-sm mt-3">
                            Try again
                          </button>
                        </div>
                      )}

                      {a?.tideUnavailable && (
                        <p role="alert" className="mt-6 rounded-lg border border-sunset-300 bg-sunset-50 p-4 text-sm text-sunset-700">
                          Tide times are loading slowly right now, so start times for session {pkg.number} can&apos;t be shown. Please try again in a minute.
                        </p>
                      )}

                      {a && !a.tideUnavailable && sortedDates.length === 0 && (
                        <p className="mt-6 rounded-lg bg-sand-100 p-5 text-ink-soft">
                          {prevPick?.date ? `Boaz has no open dates for session ${pkg.number} after ${fmtDateShort(prevPick.date)} yet. Try an earlier date for session ${active}, or check back soon.` : `Boaz has no open dates for session ${pkg.number} right now. New dates are added often, so check back soon.`}
                        </p>
                      )}

                      {a && viewMonth && minMonth && maxMonth && sortedDates.length > 0 && (
                        <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,22rem)_1fr] md:items-start">
                          <div>
                            <Calendar
                              month={viewMonth}
                              days={days}
                              selected={pick.date}
                              today={a.today}
                              canPrev={viewMonth > minMonth}
                              canNext={viewMonth < maxMonth}
                              onMonth={(d) => setMonths((m) => m.map((x, i) => (i === active ? addMonths(viewMonth, d) : x)))}
                              onSelect={(d) => {
                                setPick(active, { date: d, start: null });
                                setNotice(null);
                              }}
                            />
                            {pkg.tideGate && (
                              <p className="mt-4 flex items-start gap-2 rounded-lg bg-river-50 p-3 text-sm text-river">
                                <Waves className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                Session {pkg.number} is on the incoming tide, so start times follow the tide each day.
                              </p>
                            )}
                            {!monthHasDays && (
                              <p className="mt-4 rounded-lg bg-sand-100 p-4 text-sm text-ink-soft">
                                No open dates in {fmtMonth(viewMonth)}.{' '}
                                {nextOpenAfter && (
                                  <button
                                    type="button"
                                    className="font-semibold text-river underline underline-offset-4"
                                    onClick={() => setMonths((m) => m.map((x, i) => (i === active ? monthOf(nextOpenAfter) : x)))}
                                  >
                                    Jump to {fmtDateShort(nextOpenAfter)}
                                  </button>
                                )}
                              </p>
                            )}
                          </div>

                          <div aria-live="polite">
                            {!pick.date ? (
                              <p className="rounded-lg border border-dashed border-sand-400 p-5 text-ink-soft">Pick a highlighted date to see start times.</p>
                            ) : (
                              <>
                                <h4 className="display-md text-xl">{fmtDateLong(pick.date)}</h4>
                                <p className="mt-1 text-sm text-ink-soft">
                                  {pick.start ? `Session ${pkg.number} runs ${fmt12(pick.start)} to ${fmt12(fromMin(toMin(pick.start) + pkg.durationMin))}.` : `Choose a start time. The session runs ${pkg.durationLabel}.`}
                                </p>
                                {pkg.tideGate && (
                                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-river-50 px-3 py-2 text-sm text-river">
                                    <Waves className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                    <span>
                                      {pkg.tideGate.label}.
                                      {a.highTides?.[pick.date]?.length ? ` High tide that day: ${a.highTides[pick.date].map(fmt12).join(' and ')}.` : ''}
                                    </span>
                                  </p>
                                )}
                                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Start times">
                                  {times.map((t) => {
                                    const sel = pick.start === t;
                                    return (
                                      <button
                                        key={t}
                                        type="button"
                                        aria-pressed={sel}
                                        onClick={() => {
                                          setPick(active, { start: t });
                                          setNotice(null);
                                        }}
                                        className={cn(
                                          'min-h-[52px] rounded-lg border-2 px-2 py-2 text-center transition-colors',
                                          sel ? 'border-river bg-river text-white' : 'border-sand-300 bg-white hover:border-river/50',
                                        )}
                                      >
                                        <span className="block font-bold">{fmt12(t)}</span>
                                        <span className={cn('block text-xs', sel ? 'text-white/75' : 'text-ink-mute')}>to {fmt12(fromMin(toMin(t) + pkg.durationMin))}</span>
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
                        {active < 2 ? (
                          <button type="button" disabled={!isDone(pick)} onClick={() => setActive(active + 1)} className="btn-dark w-full sm:w-auto" data-testid="next-session">
                            Continue to session {active + 2}
                          </button>
                        ) : (
                          <button type="button" disabled={!allDone} onClick={() => setStep(3)} className="btn-dark w-full sm:w-auto" data-testid="to-details">
                            Continue to your details
                          </button>
                        )}
                        {active < 2 && allDone && (
                          <button type="button" onClick={() => setStep(3)} className="btn-outline w-full sm:w-auto">
                            Skip ahead to your details
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {step === 3 && allDone && (
                    <DetailsForm
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

                  {step === 4 && booked && <Confirmation sessions={booked} meetings={meetings} cancelUrl={cancelUrl} onAnother={bookAnother} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Phones get a one-line summary above the step; large screens get the full sidebar. */}
            {step !== 4 && step !== 1 && (
              <div className="order-first border-b border-sand-300 bg-sand-100/70 px-4 py-3 sm:px-6 lg:hidden">
                <SummaryBar picks={picks} active={step === 2 ? active : -1} />
              </div>
            )}
            {step !== 4 && (
              <div className="hidden border-l border-sand-300 bg-sand-100/60 p-6 lg:block">
                <Summary picks={picks} active={step === 2 ? active : -1} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
