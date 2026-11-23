'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api, errorMessage } from '@/lib/api';
import { onChange } from '@/lib/sync';

/** Stop background polling after this long without any interaction; it resumes the moment the person is back. */
const IDLE_AFTER_MS = 5 * 60_000;

/**
 * Fetch JSON from `url` and keep it fresh: refetches on an interval while the tab is visible and in use,
 * when the tab regains focus, and instantly when another tab of this site reports a change.
 * Pass null to pause. Changing `url` clears stale data.
 */
export function useRemote<T>(url: string | null, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(url !== null);
  const urlRef = useRef(url);
  urlRef.current = url;
  const lastActive = useRef(Date.now());

  const refresh = useCallback(async () => {
    const u = urlRef.current;
    if (!u) return;
    try {
      const json = await api<T>(u);
      if (urlRef.current === u) {
        setData(json);
        setError(null);
        setStatus(null);
      }
    } catch (e) {
      if (urlRef.current === u) {
        setError(errorMessage(e));
        setStatus(e instanceof ApiError ? e.status : 0);
      }
    } finally {
      if (urlRef.current === u) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setData(null);
    setError(null);
    setLoading(url !== null);
    void refresh();
  }, [url, refresh]);

  useEffect(() => {
    if (!url) return;
    const visible = () => document.visibilityState === 'visible';

    // Track activity (throttled) so an abandoned tab stops polling instead of running all day.
    let lastMark = 0;
    const mark = () => {
      const now = Date.now();
      if (now - lastMark > 1000) {
        lastMark = now;
        lastActive.current = now;
      }
    };
    const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll'] as const;
    activityEvents.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const poll = () => {
      if (visible() && Date.now() - lastActive.current < IDLE_AFTER_MS) void refresh();
    };
    const wake = () => {
      if (!visible()) return;
      lastActive.current = Date.now();
      void refresh();
    };

    const id = intervalMs > 0 ? window.setInterval(poll, intervalMs) : undefined;
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    const off = onChange(() => void refresh());
    return () => {
      if (id) window.clearInterval(id);
      activityEvents.forEach((e) => window.removeEventListener(e, mark));
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
      off();
    };
  }, [url, intervalMs, refresh]);

  return { data, error, status, loading, refresh, setData };
}

export type Remote<T> = ReturnType<typeof useRemote<T>>;
