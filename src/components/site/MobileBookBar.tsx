'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PACKAGES, formatPrice } from '@/lib/packages';
import { useBooking } from './BookingContext';

/** On phones, keeps the main action one tap away once the hero scrolls out and until the scheduler is on screen. */
export function MobileBookBar() {
  const { scrollToBook } = useBooking();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('top');
    const book = document.getElementById('book');
    if (!hero || !book || !('IntersectionObserver' in window)) return;
    let pastHero = false;
    let inBook = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) pastHero = !e.isIntersecting;
        if (e.target === book) inBook = e.isIntersecting;
      }
      setShow(pastHero && !inBook);
    });
    io.observe(hero);
    io.observe(book);
    return () => io.disconnect();
  }, []);

  const from = Math.min(...PACKAGES.map((p) => p.basePrice));

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          exit={{ y: 80 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-river-950/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 text-white backdrop-blur md:hidden"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="leading-tight">
              <span className="block font-semibold">Lessons from {formatPrice(from)}</span>
              <span className="text-sm text-white/65">All gear provided</span>
            </p>
            <button type="button" onClick={scrollToBook} className="btn-primary shrink-0 px-6">
              Book a lesson
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
