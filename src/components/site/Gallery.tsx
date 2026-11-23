'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { PublicPhoto } from '@/lib/types';
import { Photo } from './Photo';

// Varied tile shapes give the grid a masonry rhythm without layout shift while images load.
const SHAPES = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-[1/1]', 'aspect-[4/5]', 'aspect-[3/4]', 'aspect-[5/6]'];

export function Gallery({ photos }: { photos: PublicPhoto[] }) {
  const [active, setActive] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setActive(null);
    opener.current?.focus();
  }, []);
  const step = useCallback(
    (dir: 1 | -1) => setActive((i) => (i === null ? i : (i + dir + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [active, close, step]);

  if (photos.length === 0) return null;
  const current = active !== null ? photos[active] : null;

  return (
    <section id="gallery" className="section-y bg-river-900 text-white">
      <div className="container-x">
        <div className="max-w-2xl">
          <h2 className="display-md text-4xl sm:text-5xl">The summer catch</h2>
          <p className="prose-serif mt-4 text-lg text-white/80">
            Fresh from the boat. Tap any photo to see it full size.
          </p>
        </div>

        <ul className="mt-10 columns-2 gap-3 sm:gap-4 lg:columns-3">
          {photos.map((p, i) => (
            <li key={`${p.src}-${i}`} className="mb-3 break-inside-avoid sm:mb-4">
              <button
                type="button"
                onClick={(e) => {
                  opener.current = e.currentTarget;
                  setActive(i);
                }}
                className={cn('group relative block w-full overflow-hidden rounded-sm bg-river-800', SHAPES[i % SHAPES.length])}
                aria-label={`Open photo: ${p.caption || p.alt}`}
              >
                <Photo
                  src={p.src}
                  alt={p.alt}
                  focusX={p.focusX}
                  focusY={p.focusY}
                  className="transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {p.caption && (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-river-950/85 to-transparent px-3 pb-3 pt-10 text-left text-sm font-medium opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                    {p.caption}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <AnimatePresence>
        {current && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            className="fixed inset-0 z-50 flex items-center justify-center bg-river-950/96 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
          >
            <button
              ref={closeBtn}
              type="button"
              onClick={close}
              className="absolute right-3 top-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="Close photo viewer"
            >
              <X className="h-6 w-6" />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:left-5"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:right-5"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}
            <figure className="flex max-h-full max-w-5xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.src ?? ''} alt={current.alt} className="max-h-[82vh] w-auto max-w-full rounded-sm object-contain" />
              {current.caption && <figcaption className="mt-3 text-center text-white/85">{current.caption}</figcaption>}
            </figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
