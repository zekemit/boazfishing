'use client';

import { useState } from 'react';
import { CalendarPlus, Check, CheckCheck, ChevronDown, Download, Mail, MessageSquare, NotebookPen, Phone, RotateCcw, Users, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatPrice, getPackage } from '@/lib/packages';
import { diffDays, fmtDateLong, fmtRange } from '@/lib/time';
import { EXPERIENCE_LABELS, PRACTICE_SKILLS, PROGRESS_TAGS, type Booking, type BookingStatus } from '@/lib/types';
import type { useBookingActions } from './useBookingActions';

export const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'bg-sunset-100 text-sunset-700',
  confirmed: 'bg-river-100 text-river-700',
  completed: 'bg-sand-200 text-ink-soft',
  cancelled: 'bg-red-100 text-red-800',
};
export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Needs approval',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function dayTag(date: string, today: string): string | null {
  const d = diffDays(date, today);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d > 1 && d < 7) return `In ${d} days`;
  return null;
}

function googleUrl(b: Booking, tz: string): string {
  const d = b.date.replace(/-/g, '');
  const t = (x: string) => `${x.replace(':', '')}00`;
  const pkg = getPackage(b.packageId);
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${pkg?.name ?? 'Lesson'}: ${b.name}`,
    dates: `${d}T${t(b.start)}/${d}T${t(b.end)}`,
    ctz: tz,
    details: [`Phone: ${b.phone}`, `Email: ${b.email}`, b.notes && `Notes: ${b.notes}`, `Code ${b.code}`].filter(Boolean).join('\n'),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

interface Props {
  booking: Booking;
  all: Booking[];
  today: string;
  tz: string;
  actions: ReturnType<typeof useBookingActions>;
}

export function BookingCard({ booking, all, today, tz, actions }: Props) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(booking.tags ?? []);
  const [practiced, setPracticed] = useState<string[]>(booking.practiced ?? []);
  const [notes, setNotes] = useState(booking.lessonNotes ?? '');
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);

  const pkg = getPackage(booking.packageId);
  const tag = booking.status === 'cancelled' || booking.status === 'completed' ? null : dayTag(booking.date, today);
  const digits = booking.phone.replace(/[^\d+]/g, '');

  // Returning students: same email across lessons
  const mine = all
    .filter((x) => x.email.toLowerCase() === booking.email.toLowerCase() && x.status !== 'cancelled')
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const idx = mine.findIndex((x) => x.id === booking.id);
  const lessonNo = idx + 1;
  const previous = idx > 0 ? mine[idx - 1] : null;

  const dirty =
    JSON.stringify([...tags].sort()) !== JSON.stringify([...(booking.tags ?? [])].sort()) ||
    JSON.stringify([...practiced].sort()) !== JSON.stringify([...(booking.practiced ?? [])].sort()) ||
    notes !== (booking.lessonNotes ?? '');

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const run = async (s: BookingStatus) => {
    setBusy(true);
    await actions.setStatus(booking, s);
    setBusy(false);
    setConfirmCancel(false);
  };
  const addCustom = () => {
    const v = custom.trim().slice(0, 40);
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setCustom('');
  };
  const chip = (on: boolean) =>
    cn('min-h-[40px] rounded-full border px-3.5 text-sm font-semibold transition-colors', on ? 'border-river bg-river text-white' : 'border-sand-300 bg-white hover:border-river/50');

  return (
    <article
      data-testid="booking-card"
      data-status={booking.status}
      className={cn('rounded-2xl border bg-white p-4 sm:p-6', booking.status === 'pending' ? 'border-sunset/60' : 'border-sand-300', booking.status === 'cancelled' && 'opacity-75')}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', STATUS_STYLE[booking.status])}>{STATUS_LABEL[booking.status]}</span>
            {tag && <span className="rounded-full bg-river px-2.5 py-1 text-xs font-bold text-white">{tag}</span>}
            {lessonNo > 1 && <span className="rounded-full bg-sunset px-2.5 py-1 text-xs font-bold text-river-950">Returning, lesson {lessonNo}</span>}
            {booking.sample && <span className="rounded-full border border-sand-400 px-2.5 py-1 text-xs font-semibold text-ink-mute">Sample</span>}
            <span className="text-xs font-semibold tracking-wide text-ink-mute">{booking.code}</span>
          </div>
          <h3 className="display-md mt-2.5 text-2xl">{fmtDateLong(booking.date)}</h3>
          <p className="font-semibold text-ink-soft">{fmtRange(booking.start, booking.end)}</p>
        </div>
        <div className="sm:text-right">
          <p className="display-md text-xl">{pkg?.name ?? booking.packageId}</p>
          <p className="text-sm text-ink-mute">{pkg?.durationLabel}</p>
          <p className="mt-1 font-bold">{formatPrice(booking.totalPrice)} due in person</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-sand-200 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-lg font-bold">{booking.name}</p>
          <p className="mt-1 flex items-center gap-2 text-ink-soft">
            <Users className="h-4 w-4" aria-hidden /> {booking.anglers} {booking.anglers === 1 ? 'angler' : 'anglers'}, {EXPERIENCE_LABELS[booking.experience].toLowerCase()}
          </p>
          <a href={`mailto:${booking.email}`} className="mt-1 inline-flex items-center gap-2 break-all text-river hover:underline">
            <Mail className="h-4 w-4 shrink-0" aria-hidden /> {booking.email}
          </a>
          <p className="mt-0.5 text-sm text-ink-mute">{booking.phone}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-mute">Notes from the student</p>
          <p className="prose-serif mt-1 text-ink-soft">{booking.notes || <span className="text-ink-mute">No notes.</span>}</p>
        </div>
      </div>

      {/* One tap to reach the student, big enough for a thumb */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={`tel:${digits}`} className="btn-dark min-h-[52px]" data-testid="call-btn">
          <Phone className="h-5 w-5" aria-hidden /> Call
        </a>
        <a href={`sms:${digits}`} className="btn-outline min-h-[52px]" data-testid="text-btn">
          <MessageSquare className="h-5 w-5" aria-hidden /> Text
        </a>
      </div>

      {(booking.tags?.length ?? 0) > 0 && !open && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {booking.tags!.map((t) => (
            <span key={t} className="rounded-full bg-river-100 px-2.5 py-1 text-xs font-bold text-river-700">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {booking.status !== 'cancelled' && (
          <>
            <a href={googleUrl(booking, tz)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">
              <CalendarPlus className="h-4 w-4" aria-hidden /> Add to Google Calendar
            </a>
            <a href={`/api/calendar/booking.ics?id=${encodeURIComponent(booking.id)}`} className="btn-outline btn-sm">
              <Download className="h-4 w-4" aria-hidden /> Download .ics
            </a>
          </>
        )}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="btn-outline btn-sm ml-auto" data-testid="notes-toggle">
          <NotebookPen className="h-4 w-4" aria-hidden /> Notes and progress
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      </div>

      {open && (
        <div className="mt-4 rounded-xl bg-sand-100 p-4" data-testid="notes-drawer">
          {previous && (
            <p className="mb-3 rounded-lg bg-white px-3 py-2 text-sm text-ink-soft">
              <strong className="text-ink">Last lesson ({fmtDateLong(previous.date)}):</strong> {previous.tags?.length ? previous.tags.join(', ') : 'no tags logged'}
              {previous.lessonNotes ? `. ${previous.lessonNotes}` : ''}
            </p>
          )}
          <fieldset>
            <legend className="label">Where they are</legend>
            <div className="flex flex-wrap gap-2">
              {[...PROGRESS_TAGS, ...tags.filter((t) => !(PROGRESS_TAGS as readonly string[]).includes(t))].map((t) => (
                <button key={t} type="button" aria-pressed={tags.includes(t)} onClick={() => toggle(tags, setTags, t)} className={chip(tags.includes(t))}>
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                aria-label="Add your own tag"
                placeholder="Add your own tag"
                value={custom}
                maxLength={40}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                className="field !min-h-[40px] !py-1.5"
              />
              <button type="button" onClick={addCustom} disabled={!custom.trim()} className="btn-outline btn-sm shrink-0">
                Add
              </button>
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="label">Practiced today</legend>
            <div className="flex flex-wrap gap-2">
              {PRACTICE_SKILLS.map((s) => (
                <button key={s} type="button" aria-pressed={practiced.includes(s)} onClick={() => toggle(practiced, setPracticed, s)} className={chip(practiced.includes(s))}>
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="mt-4">
            <label htmlFor={`notes-${booking.id}`} className="label">
              Lesson notes
            </label>
            <textarea
              id={`notes-${booking.id}`}
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What clicked, what to work on next time, gear they liked..."
              className="field"
            />
          </div>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={async () => {
              setSaving(true);
              await actions.saveProgress(booking, { tags, practiced, lessonNotes: notes });
              setSaving(false);
            }}
            className="btn-dark mt-3"
          >
            <Check className="h-4 w-4" aria-hidden /> Save progress
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-sand-200 pt-4">
        {booking.status === 'pending' && (
          <button type="button" disabled={busy} onClick={() => void run('confirmed')} className="btn-primary btn-sm">
            <Check className="h-4 w-4" aria-hidden /> Approve
          </button>
        )}
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <button type="button" disabled={busy} onClick={() => void run('completed')} className="btn-outline btn-sm">
            <CheckCheck className="h-4 w-4" aria-hidden /> Mark completed
          </button>
        )}
        {booking.status === 'completed' && (
          <button type="button" disabled={busy} onClick={() => void run('confirmed')} className="btn-outline btn-sm">
            <RotateCcw className="h-4 w-4" aria-hidden /> Undo completed
          </button>
        )}
        {booking.status === 'cancelled' && (
          <button type="button" disabled={busy} onClick={() => void run('pending')} className="btn-outline btn-sm">
            <RotateCcw className="h-4 w-4" aria-hidden /> Restore booking
          </button>
        )}
        {booking.status !== 'cancelled' &&
          (confirmCancel ? (
            <span className="ml-auto flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5">
              <span className="text-sm font-semibold text-red-800">Cancel and free this time slot?</span>
              <button type="button" disabled={busy} onClick={() => void run('cancelled')} className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-800">
                Yes, cancel
              </button>
              <button type="button" onClick={() => setConfirmCancel(false)} className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-red-100">
                Keep it
              </button>
            </span>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
              <X className="h-4 w-4" aria-hidden /> Cancel lesson
            </button>
          ))}
      </div>
    </article>
  );
}
