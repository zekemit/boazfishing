import { Check, Fish } from 'lucide-react';
import { MEET } from '@/content/site';
import type { PublicPhoto } from '@/lib/types';
import { BookButton } from './BookButton';
import { Photo } from './Photo';

export function MeetBoaz({ photo }: { photo: PublicPhoto }) {
  return (
    <section id="meet" className="section-y">
      <div className="container-x grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <div className="absolute -bottom-3 -right-3 h-full w-full rounded-sm border-2 border-sunset" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-river-100">
              <Photo
                src={photo.src}
                alt={photo.alt}
                focusX={photo.focusX}
                focusY={photo.focusY}
                fallback={
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-river-100 text-river">
                    <Fish className="h-14 w-14" aria-hidden />
                    <span className="font-semibold">Boaz’s portrait goes here</span>
                  </div>
                }
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <h2 className="display-md text-4xl sm:text-5xl">{MEET.heading}</h2>
          <div className="prose-serif mt-6 max-w-2xl space-y-4 text-lg text-ink-soft">
            {MEET.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className="mt-8 max-w-2xl border-t border-sand-300 pt-6">
            <p className="font-semibold">You will walk away with</p>
            <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {MEET.takeaways.map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-sunset-600" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <BookButton className="btn-dark mt-8">Book a lesson with Boaz</BookButton>
        </div>
      </div>
    </section>
  );
}
