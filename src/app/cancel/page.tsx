import type { Metadata } from 'next';
import Link from 'next/link';
import { getPackage } from '@/lib/packages';
import { fmtDateLong, fmtRange } from '@/lib/time';
import { CANCEL_NOTICE_HOURS, findForCancel, hoursUntilStart } from '@/server/cancel';
import { boazPhone, prettyPhone } from '@/server/notify/config';
import { CancelLesson } from '@/components/site/CancelLesson';
import { LogoMark } from '@/components/site/Logo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cancel your lesson', robots: { index: false, follow: false } };

export default async function CancelPage({ searchParams }: { searchParams: Promise<{ code?: string; t?: string }> }) {
  const { code, t } = await searchParams;
  const b = code && t ? await findForCancel(code, t) : null;
  const phone = boazPhone();
  const pkg = b ? getPackage(b.packageId) : undefined;
  const late = b ? hoursUntilStart(b) < CANCEL_NOTICE_HOURS : false;

  let body: React.ReactNode;
  if (!b) {
    body = (
      <>
        <h1 className="display-md text-3xl">This link isn’t valid</h1>
        <p className="prose-serif mt-3 text-lg text-ink-soft">Please use the cancel link from your most recent email{phone ? `, or text Boaz at ${prettyPhone(phone)}` : ''}.</p>
      </>
    );
  } else if (b.status === 'cancelled') {
    body = (
      <>
        <h1 className="display-md text-3xl">This lesson is already cancelled</h1>
        <p className="prose-serif mt-3 text-lg text-ink-soft">Nothing more to do. You have not been charged.</p>
        <Link href="/#book" className="btn-primary mt-5">Pick a new time</Link>
      </>
    );
  } else if (b.status === 'completed') {
    body = <h1 className="display-md text-3xl">This lesson has already taken place</h1>;
  } else {
    body = (
      <>
        <h1 className="display-md text-3xl">Cancel your lesson</h1>
        <dl className="mt-5 divide-y divide-sand-300 rounded-xl border border-sand-300 bg-white">
          {[
            ['Lesson', `${pkg?.name ?? ''} (${pkg?.durationLabel ?? ''})`],
            ['When', `${fmtDateLong(b.date)}, ${fmtRange(b.start, b.end)}`],
            ['Booked for', b.name],
            ['Anglers', String(b.anglers)],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-x-6 px-4 py-3">
              <dt className="text-ink-mute">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6">
          {late ? (
            <p role="status" className="rounded-xl bg-sunset-50 p-4 font-medium text-sunset-700">
              {`This lesson starts in less than ${CANCEL_NOTICE_HOURS} hours, so it can’t be cancelled online.`} Please text Boaz{phone ? ` at ${prettyPhone(phone)}` : ''} and he will sort it out.
            </p>
          ) : (
            <CancelLesson code={b.code} token={t!} />
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
