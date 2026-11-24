'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { MEETING, NAV } from '@/content/site';
import { AdminLoginForm } from '../AdminLoginForm';
import { LogoMark } from './Logo';

function InstructorLoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-river-950/70 p-4 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="relative w-full max-w-sm rounded-2xl bg-sand p-6 text-ink shadow-lift sm:p-7"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-200"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 id="login-title" className="display-md text-3xl">
          Instructor login
        </h2>
        <p className="prose-serif mt-1 mb-5 text-ink-soft">Manage availability, bookings and photos.</p>
        <AdminLoginForm autoFocus onSuccess={() => router.push('/admin')} />
      </motion.div>
    </motion.div>
  );
}

export function Footer() {
  const [login, setLogin] = useState(false);
  return (
    <footer className="bg-river-950 pb-24 pt-14 text-white/80 md:pb-14">
      <div className="container-x grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <a href="#top" className="inline-flex items-center gap-2.5 text-white">
            <LogoMark className="h-10 w-10" />
            <span className="display-md text-2xl">Boaz Fishing Co.</span>
          </a>
          <p className="prose-serif mt-4 max-w-sm text-white/70">
            Summer fishing lessons for every skill level. All gear provided. Patient coaching, honest fish stories.
          </p>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            <span className="font-semibold text-white/90">Meet:</span> {MEETING.spot.toLowerCase()}, {MEETING.area}
            {MEETING.address ? `, ${MEETING.address}` : ''}.
          </p>
        </div>
        <nav aria-label="Footer" className="md:col-span-4">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="hover:text-white hover:underline">
                  {n.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#book" className="font-semibold text-sunset-400 hover:underline">
                Book a lesson
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="container-x mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/55">
        <p>© {new Date().getFullYear()} Boaz Fishing Co. Fish responsibly. Release gently.</p>
        <button type="button" onClick={() => setLogin(true)} className="underline-offset-4 hover:text-white hover:underline">
          Instructor login
        </button>
      </div>
      <AnimatePresence>{login && <InstructorLoginModal onClose={() => setLogin(false)} />}</AnimatePresence>
    </footer>
  );
}
