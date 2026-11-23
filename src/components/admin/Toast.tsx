'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

type Kind = 'success' | 'error' | 'info';
interface Item {
  id: number;
  kind: Kind;
  text: string;
}
interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);
let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);

  const push = useCallback((kind: Kind, text: string) => {
    const id = ++counter;
    setItems((list) => [...list.slice(-3), { id, kind, text }]);
    window.setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), kind === 'error' ? 7000 : 4500);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (t) => push('success', t),
      error: (t) => push('error', t),
      info: (t) => push('info', t),
    }),
    [push],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] grid justify-items-end gap-2 sm:left-auto sm:right-4">
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18 }}
                role={t.kind === 'error' ? 'alert' : 'status'}
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-[15px] font-medium shadow-lift sm:w-auto',
                  t.kind === 'success' && 'bg-river text-white',
                  t.kind === 'error' && 'bg-red-700 text-white',
                  t.kind === 'info' && 'bg-white text-ink ring-1 ring-sand-300',
                )}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span>{t.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used inside <ToastProvider>');
  return v;
}
