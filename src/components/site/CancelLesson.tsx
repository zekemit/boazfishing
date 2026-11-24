'use client';

import { useState } from 'react';
import { CalendarX, Check, Loader2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';

/** Two-step cancel: nothing happens until the student presses the button (so email scanners can't cancel by opening the link). */
export function CancelLesson({ code, token, count }: { code: string; token: string; count: number }) {
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
          <Check className="h-6 w-6" aria-hidden /> {count === 1 ? 'Your session is cancelled.' : 'Your sessions are cancelled.'}
        </p>
        <p className="prose-serif mt-2 text-ink-soft">Those times are open again and you have not been charged. We sent you a confirmation email, and Boaz has been notified.</p>
        <a href="/#book" className="btn-primary mt-5">
          Pick new times
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
          <CalendarX className="h-5 w-5" aria-hidden /> {count === 1 ? 'Cancel my session' : `Cancel my ${count} sessions`}
        </button>
      ) : (
        <div className="rounded-xl bg-red-50 p-4">
          <p className="font-bold text-red-800">Cancel {count === 1 ? 'this session' : `all ${count} sessions`}? This can’t be undone, but you can always book new times.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void cancel()} disabled={busy} className="btn bg-red-700 text-white hover:bg-red-800">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Yes, cancel
            </button>
            <button type="button" onClick={() => setStep('ask')} disabled={busy} className="btn-outline">
              Keep my sessions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
