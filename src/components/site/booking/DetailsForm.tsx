'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EXPERIENCE_LABELS, EXPERIENCE_LEVELS, type Experience } from '@/lib/types';
import { PROGRAM, formatPrice } from '@/lib/packages';

export interface FormState {
  name: string;
  email: string;
  phone: string;
  experience: Experience | '';
  notes: string;
  company: string; // honeypot
}

export const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  experience: '',
  notes: '',
  company: '',
};

export function validateForm(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = 'Enter the parent or guardian name.';
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
  if (f.phone.replace(/\D/g, '').length < 7 || !/^[+()\-.\s\d]+$/.test(f.phone.trim())) {
    e.phone = 'Enter a phone number Boaz can text or call.';
  }
  if (!f.experience) e.experience = 'Pick an experience level.';
  if (f.notes.length > 800) e.notes = 'Keep notes under 800 characters.';
  return e;
}

interface Props {
  form: FormState;
  errors: Record<string, string>;
  formError: string | null;
  submitting: boolean;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: () => void;
  onBack: () => void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-red-700">
      {message}
    </p>
  );
}

export function DetailsForm({ form, errors, formError, submitting, onChange, onSubmit, onBack }: Props) {
  const inputProps = (key: keyof FormState & string) => ({
    id: `field-${key}`,
    'aria-invalid': errors[key] ? (true as const) : undefined,
    'aria-describedby': errors[key] ? `err-${key}` : undefined,
    className: cn('field', errors[key] && 'field-error'),
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="display-md text-2xl sm:text-3xl">Your details</h3>
        <button type="button" onClick={onBack} className="text-sm font-semibold text-river underline underline-offset-4">
          Change dates or times
        </button>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="field-name" className="label">
            Parent or guardian name
          </label>
          <input
            {...inputProps('name')}
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Alex Morgan"
          />
          <FieldError id="err-name" message={errors.name} />
        </div>
        <div>
          <label htmlFor="field-phone" className="label">
            Phone (for day-of texts)
          </label>
          <input
            {...inputProps('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="(555) 123-4567"
          />
          <FieldError id="err-phone" message={errors.phone} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="field-email" className="label">
            Email
          </label>
          <input
            {...inputProps('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="you@example.com"
          />
          <FieldError id="err-email" message={errors.email} />
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="label">The learner&apos;s fishing experience</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {EXPERIENCE_LEVELS.map((level) => {
            const on = form.experience === level;
            return (
              <label
                key={level}
                className={cn(
                  'flex min-h-[48px] cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-2.5 text-center font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-sunset',
                  on ? 'border-river bg-river text-white' : 'border-sand-300 bg-white hover:border-river/40',
                )}
              >
                <input
                  type="radio"
                  name="experience"
                  value={level}
                  checked={on}
                  onChange={() => onChange({ experience: level })}
                  className="sr-only"
                />
                {EXPERIENCE_LABELS[level]}
              </label>
            );
          })}
        </div>
        <FieldError id="err-experience" message={errors.experience} />
      </fieldset>

      <div className="mt-6">
        <label htmlFor="field-notes" className="label">
          Anything Boaz should know? <span className="font-normal text-ink-mute">(optional)</span>
        </label>
        <textarea
          {...inputProps('notes')}
          rows={4}
          maxLength={800}
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="The learner's age, any nerves around water, what they hope to catch, a birthday..."
        />
        <FieldError id="err-notes" message={errors.notes} />
      </div>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Company
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.company}
            onChange={(e) => onChange({ company: e.target.value })}
          />
        </label>
      </div>

      {formError && (
        <p role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 font-medium text-red-800">
          {formError}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={submitting} className="btn-primary w-full px-8 text-lg sm:w-auto">
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Locking in your times...
            </>
          ) : (
            <>Book all {PROGRAM.sessionCount} sessions, {formatPrice(PROGRAM.price)}</>
          )}
        </button>
        <p className="text-sm text-ink-soft">No payment now. {formatPrice(PROGRAM.price)} covers all {PROGRAM.sessionCount} sessions, paid to Boaz in person.</p>
      </div>
    </form>
  );
}
