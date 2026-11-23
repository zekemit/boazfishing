import { ArrowDown, ArrowRight, Check, Fish, ShieldCheck, Target } from 'lucide-react';
import { BEGINNER_PATH } from '@/content/site';
import { BookButton } from './BookButton';

/** The First Cast progression: calm backyard practice first, then the pond. A real sequence, so it is numbered. */
export function BeginnerPath() {
  const [backyard, pond] = BEGINNER_PATH.steps;
  return (
    <section id="first-cast" className="section-y bg-sand-100">
      <div className="container-x">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-river-100 px-3 py-1 text-sm font-semibold text-river">
            <ShieldCheck className="h-4 w-4" aria-hidden /> For first-timers and their parents
          </p>
          <h2 className="display-md mt-4 text-4xl sm:text-5xl">{BEGINNER_PATH.heading}</h2>
          <p className="prose-serif mt-4 text-lg text-ink-soft">{BEGINNER_PATH.intro}</p>
        </div>

        <div className="mt-10 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr] lg:gap-0">
          <article className="rounded-2xl border border-river/20 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-river text-white">
                <Target className="h-6 w-6" aria-hidden />
              </span>
              <p className="text-sm font-bold text-river">Step 1</p>
            </div>
            <h3 className="display-md mt-4 text-3xl">{backyard.title}</h3>
            <p className="prose-serif mt-2 text-ink-soft">{backyard.body}</p>
            <ul className="mt-5 grid gap-2.5 border-t border-sand-300 pt-5">
              {backyard.points.map((p) => (
                <li key={p} className="flex items-center gap-2.5 font-medium">
                  <Check className="h-4 w-4 shrink-0 text-sunset-600" aria-hidden /> {p}
                </li>
              ))}
            </ul>
          </article>

          {/* the hand-off: the cast has to be ready */}
          <div className="flex items-center justify-center gap-2 py-1 lg:w-44 lg:flex-col lg:px-3 lg:py-0" aria-hidden>
            <ArrowDown className="h-7 w-7 text-sunset-600 lg:hidden" />
            <span className="rounded-full bg-sunset px-3.5 py-1.5 text-center text-sm font-bold text-river-950">Once your cast is sharp</span>
            <ArrowRight className="hidden h-8 w-8 text-sunset-600 lg:block" />
          </div>

          <article className="rounded-2xl bg-river p-6 text-white sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sunset text-river-950">
                <Fish className="h-6 w-6" aria-hidden />
              </span>
              <p className="text-sm font-bold text-sunset-400">Step 2</p>
            </div>
            <h3 className="display-md mt-4 text-3xl">{pond.title}</h3>
            <p className="prose-serif mt-2 text-white/85">{pond.body}</p>
            <ul className="mt-5 grid gap-2.5 border-t border-white/15 pt-5">
              {pond.points.map((p) => (
                <li key={p} className="flex items-center gap-2.5 font-medium">
                  <Check className="h-4 w-4 shrink-0 text-sunset-400" aria-hidden /> {p}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <p className="prose-serif mt-6 max-w-3xl text-lg text-ink">{BEGINNER_PATH.gate}</p>

        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {BEGINNER_PATH.reassurance.map((r) => (
              <li key={r} className="flex items-center gap-2 text-ink-soft">
                <Check className="h-4 w-4 shrink-0 text-river" aria-hidden /> {r}
              </li>
            ))}
          </ul>
          <BookButton packageId="first-cast" className="btn-primary shrink-0 px-8">
            Book First Cast
          </BookButton>
        </div>
      </div>
    </section>
  );
}
