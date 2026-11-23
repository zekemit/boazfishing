'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { NAV } from '@/content/site';
import { cn } from '@/lib/cn';
import { LogoMark } from './Logo';
import { useBooking } from './BookingContext';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollToBook } = useBooking();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-200',
        solid ? 'bg-sand/95 text-ink shadow-[0_1px_0_rgba(31,42,38,.1)] backdrop-blur' : 'text-white',
      )}
    >
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <a href="#top" className="flex items-center gap-2.5" aria-label="Boaz Fishing Co. home">
          <LogoMark className="h-9 w-9" />
          <span className="display-md text-[1.35rem]">Boaz Fishing Co.</span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[15px] font-medium underline-offset-8 decoration-sunset decoration-2 hover:underline"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button type="button" onClick={scrollToBook} className="btn-primary btn-sm hidden sm:inline-flex">
            Book a lesson
          </button>
          <button
            type="button"
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-16 h-[calc(100dvh-4rem)] overflow-y-auto border-t border-sand-300 bg-sand text-ink lg:hidden"
          >
            <div className="container-x flex flex-col py-4">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="display-md border-b border-sand-300 py-4 text-3xl"
                >
                  {item.label}
                </a>
              ))}
              <button
                type="button"
                className="btn-primary mt-6"
                onClick={() => {
                  setOpen(false);
                  scrollToBook();
                }}
              >
                Book a lesson
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
