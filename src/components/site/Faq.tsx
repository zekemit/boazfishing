'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { FAQS } from '@/content/site';
import { cn } from '@/lib/cn';

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="section-y bg-sand-100">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <h2 className="display-md text-4xl sm:text-5xl">Good questions</h2>
          <p className="prose-serif mt-4 text-lg text-ink-soft">
            Still wondering about something? Put it in the notes when you book and Boaz will answer before your lesson.
          </p>
        </div>
        <div className="lg:col-span-8">
          <ul className="divide-y divide-sand-300 border-y border-sand-300">
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={item.q}>
                  <h3>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-6 py-5 text-left"
                      aria-expanded={isOpen}
                      aria-controls={`faq-${i}`}
                      id={`faq-btn-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      <span className="display-md text-xl sm:text-2xl">{item.q}</span>
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                          isOpen ? 'border-sunset bg-sunset text-river-950' : 'border-river/30 text-river',
                        )}
                      >
                        <Plus className={cn('h-5 w-5 transition-transform duration-200', isOpen && 'rotate-45')} aria-hidden />
                      </span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-${i}`}
                        role="region"
                        aria-labelledby={`faq-btn-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <p className="prose-serif max-w-2xl pb-6 text-lg text-ink-soft">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
