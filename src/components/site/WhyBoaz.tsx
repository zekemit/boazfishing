import { Backpack, Check, Compass, Fish, Users } from 'lucide-react';
import { VALUE_PROPS } from '@/content/site';

export function WhyBoaz() {
  const v = VALUE_PROPS;
  return (
    <section id="why" className="section-y">
      <div className="container-x">
        <div className="max-w-2xl">
          <h2 className="display-md text-4xl sm:text-5xl">Why fish with Boaz</h2>
          <p className="prose-serif mt-4 text-lg text-ink-soft">
            Fishing looks simple until you are standing on a boat with a tangled line and no idea where the fish went. Boaz fixes
            that, one small step at a time.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-12 lg:gap-5">
          {/* The anchor: everything is included */}
          <article className="rounded-3xl bg-river p-7 text-white sm:p-9 lg:col-span-4 lg:row-span-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sunset text-river-950">
              <Backpack className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="display-md mt-6 text-3xl">{v.gear.title}</h3>
            <p className="prose-serif mt-3 text-white/85">{v.gear.body}</p>
            <ul className="mt-6 grid gap-2.5 border-t border-white/15 pt-6">
              {v.gear.items.map((item) => (
                <li key={item} className="flex items-center gap-2.5 font-medium">
                  <Check className="h-4 w-4 text-sunset-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="flex flex-col gap-5 rounded-2xl border border-sand-300 bg-sand-100 p-7 sm:flex-row sm:items-center sm:p-8 lg:col-span-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-river text-white">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h3 className="display-md text-2xl sm:text-3xl">{v.coaching.title}</h3>
              <p className="prose-serif mt-2 max-w-2xl text-ink-soft">{v.coaching.body}</p>
            </div>
          </article>

          <article className="rounded-2xl border border-sand-300 bg-white p-7 sm:p-8 lg:col-span-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sunset-100 text-sunset-700">
              <Compass className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="display-md mt-5 text-2xl">{v.spots.title}</h3>
            <p className="prose-serif mt-2 text-ink-soft">{v.spots.body}</p>
          </article>

          <article className="rounded-2xl border border-sand-300 bg-white p-7 sm:p-8 lg:col-span-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-river-100 text-river">
              <Fish className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="display-md mt-5 text-2xl">{v.ethics.title}</h3>
            <p className="prose-serif mt-2 text-ink-soft">{v.ethics.body}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
