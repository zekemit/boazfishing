'use client';

import { useState } from 'react';
import { CalendarX, Check, Loader2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';

/** Two-step cancel: nothing happens until the student presses the button (so email scanners can't cancel by opening the link). */
export function CancelLesson({ code, token }: { code: string; token: string }) {
  const [step, setStep] = useState<'ask' | 'sure' | 'done'>('ask');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await api('/api/cancel', { method: 'POST', json: { code, token } });
      setStep('done');
    } catch (e) {
      setError(errorMessage(e));
      setStep('ask');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'done') {
    return (
      <div role="status">
        <p className="flex items-center gap-2 text-xl font-bold text-river">
          <Check className="h-6 w-6" aria-hidden /> Your lesson is cancelled.
        </p>
        <p className="prose-serif mt-2 text-ink-soft">That time is open again and you have not been charged. We sent you a confirmation email, and Boaz has been notified.</p>
        <a href="/#book" className="btn-primary mt-5">
          Pick a new time
        </a>
      </div>
    );
  }
  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 font-medium text-red-800">
          {error}
        </p>
      )}
      {step === 'ask' ? (
        <button type="button" onClick={() => setStep('sure')} className="btn-outline w-full border-red-300 text-red-700 hover:bg-red-50 sm:w-auto">
          <CalendarX className="h-5 w-5" aria-hidden /> Cancel my lesson
        </button>
      ) : (
        <div className="rounded-xl bg-red-50 p-4">
          <p className="font-bold text-red-800">Cancel this lesson? This can’t be undone, but you can always book a new time.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void cancel()} disabled={busy} className="btn bg-red-700 text-white hover:bg-red-800">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Yes, cancel my lesson
            </button>
            <button type="button" onClick={() => setStep('ask')} disabled={busy} className="btn-outline">
              Keep my lesson
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
