'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';

/** Shared by the footer's "Instructor login" modal and the /admin sign-in screen. */
export function AdminLoginForm({ onSuccess, autoFocus }: { onSuccess: () => void; autoFocus?: boolean }) {
  const [code, setCode] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Set NEXT_PUBLIC_HIDE_PASSCODE_HINT=true before building to hide the testing hint.
  const showHint = process.env.NEXT_PUBLIC_HIDE_PASSCODE_HINT !== 'true';

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth', { method: 'POST', json: { passcode: code } });
      onSuccess();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
      input.current?.select();
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="passcode" className="label">
        Instructor passcode
      </label>
      <div className="relative">
        <input
          ref={input}
          id="passcode"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'passcode-error' : undefined}
          className="field pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-mute hover:text-ink"
          aria-label={show ? 'Hide passcode' : 'Show passcode'}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {error && (
        <p id="passcode-error" role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {showHint && (
        <p className="mt-3 rounded-lg bg-sunset-50 px-3 py-2 text-sm text-sunset-700">
          Testing hint: the passcode is <code className="font-bold">boaz2026</code>
        </p>
      )}
      <button type="submit" disabled={busy || !code} className="btn-dark mt-5 w-full">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
        Sign in
      </button>
    </form>
  );
}
