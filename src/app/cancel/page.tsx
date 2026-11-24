import type { Metadata } from 'next';
import Link from 'next/link';
import { sessionLabel } from '@/lib/packages';
import { fmtDateLong, fmtRange } from '@/lib/time';
import { CANCEL_NOTICE_HOURS, cancellable, findForCancel, hoursUntilStart, startMs } from '@/server/cancel';
import { boazPhone, prettyPhone } from '@/server/notify/config';
import { CancelLesson } from '@/components/site/CancelLesson';
import { LogoMark } from '@/components/site/Logo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cancel your sessions', robots: { index: false, follow: false } };

export default async function CancelPage({ searchParams }: { searchParams: Promise<{ code?: string; t?: string }> }) {
  const { code, t } = await searchParams;
  const sessions = code && t ? await findForCancel(code, t) : [];
  const phone = boazPhone();
  const active = cancellable(sessions).sort((a, b) => startMs(a) - startMs(b));
  const late = active.length > 0 && hoursUntilStart(active[0]) < CANCEL_NOTICE_HOURS;

  let body: React.ReactNode;
  if (!sessions.length) {
    body = (
      <>
        <h1 className="display-md text-3xl">This link isn’t valid</h1>
        <p className="prose-serif mt-3 text-lg text-ink-soft">Please use the cancel link from your most recent email{phone ? `, or text Boaz at ${prettyPhone(phone)}` : ''}.</p>
      </>
    );
  } else if (sessions.every((b) => b.status === 'cancelled')) {
    body = (
      <>
        <h1 className="display-md text-3xl">These sessions are already cancelled</h1>
        <p className="prose-serif mt-3 text-lg text-ink-soft">Nothing more to do. You have not been charged.</p>
        <Link href="/#book" className="btn-primary mt-5">Pick new times</Link>
      </>
    );
  } else if (!active.length) {
    body = <h1 className="display-md text-3xl">These sessions have already taken place</h1>;
  } else {
    body = (
      <>
        <h1 className="display-md text-3xl">Cancel your sessions</h1>
        <p className="prose-serif mt-2 text-ink-soft">Booked by {sessions[0].name}. This cancels every session below that hasn’t happened yet.</p>
        <ul className="mt-5 divide-y divide-sand-300 rounded-xl border border-sand-300 bg-white">
          {sessions.map((b) => {
            const done = !active.includes(b);
            return (
              <li key={b.id} className="px-4 py-3">
                <p className="font-semibold">{sessionLabel(b.packageId, false)}{done ? <span className="ml-2 text-sm font-normal text-ink-mute">({b.status === 'cancelled' ? 'already cancelled' : 'done'})</span> : null}</p>
                <p className="text-ink-soft">{fmtDateLong(b.date)}, {fmtRange(b.start, b.end)}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-6">
          {late ? (
            <p role="status" className="rounded-xl bg-sunset-50 p-4 font-medium text-sunset-700">
              {`Your next session starts in less than ${CANCEL_NOTICE_HOURS} hours, so it can’t be cancelled online.`} Please text Boaz{phone ? ` at ${prettyPhone(phone)}` : ''} and he will sort it out.
            </p>
          ) : (
            <CancelLesson code={sessions[0].code} token={t!} count={active.length} />
          )}
        </div>
      </>
    );
  }

  return (
    <main className="min-h-[100svh] bg-sand">
      <header className="bg-river-900 text-white">
        <div className="container-x flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Boaz Fishing Co. home">
            <LogoMark className="h-9 w-9" />
            <span className="display-md text-[1.35rem]">Boaz Fishing Co.</span>
          </Link>
        </div>
      </header>
      <div className="container-x py-10 sm:py-14">
        <div className="mx-auto max-w-lg">{body}</div>
      </div>
    </main>
  );
}
