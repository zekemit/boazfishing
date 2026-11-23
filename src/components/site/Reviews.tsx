import { Star } from 'lucide-react';
import { REVIEWS } from '@/content/site';

export function Reviews() {
  return (
    <section id="reviews" className="section-y">
      <div className="container-x">
        <div className="max-w-2xl">
          <h2 className="display-md text-4xl sm:text-5xl">What past students say</h2>
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {REVIEWS.map((r) => (
            <figure key={r.name} className="border-l-4 border-sunset pl-5 sm:pl-6">
              <div className="flex gap-0.5" role="img" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-sunset text-sunset" aria-hidden />
                ))}
              </div>
              <blockquote className="prose-serif mt-4 text-[1.2rem] leading-[1.6] text-ink">“{r.quote}”</blockquote>
              <figcaption className="mt-5">
                <span className="block font-semibold">{r.name}</span>
                <span className="block text-sm text-ink-mute">{r.context}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
