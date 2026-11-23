'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface PhotoProps {
  src: string | null;
  alt: string;
  focusX?: number;
  focusY?: number;
  className?: string;
  priority?: boolean;
  /** Rendered when there is no image or it fails to load. */
  fallback?: React.ReactNode;
}

/** An <img> that fills its parent, honors the focal point, and degrades to a fallback if the file is missing. */
export function Photo({ src, alt, focusX = 50, focusY = 50, className, priority, fallback = null }: PhotoProps) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  // Catch images that errored before React attached its handler.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
      style={{ objectPosition: `${focusX}% ${focusY}%` }}
    />
  );
}
