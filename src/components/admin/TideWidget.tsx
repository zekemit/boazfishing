'use client';

import { ArrowDown, ArrowUp, Info, Waves } from 'lucide-react';
import { useRemote } from '@/hooks/useRemote';
import { cn } from '@/lib/cn';
import { fromTideMinutes, tideClock, tideClockShort, tideMinutes, type TideSnapshot } from '@/lib/tides';

const untilLabel = (min: number) => {
  const m = Math.max(0, Math.round(min));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

function TideChart({ snap }: { snap: TideSnapshot }) {
  const W = 720;
  const H = 256;
  const L = 36;
  const R = 14;
  const T = 26;
  const B = 46;
  const pts = snap.curve.map((p) => ({ m: tideMinutes(p.t), h: p.h }));
  const m0 = pts[0].m;
  const m1 = pts[pts.length - 1].m;
  const hs = pts.map((p) => p.h);
  const lo = Math.floor(Math.min(...hs) - 0.3);
  const hi = Math.ceil(Math.max(...hs) + 0.3);
  const x = (m: number) => L + ((m - m0) / (m1 - m0)) * (W - L - R);
  const y = (h: number) => T + (1 - (h - lo) / (hi - lo)) * (H - T - B);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.m).toFixed(1)},${y(p.h).toFixed(1)}`).join('');
  const area = `${line}L${x(m1).toFixed(1)},${H - B}L${x(m0).toFixed(1)},${H - B}Z`;
  const nowM = tideMinutes(snap.now.t);
  const ticks: number[] = [];
  for (let m = Math.ceil(m0 / 180) * 180; m <= m1; m += 180) ticks.push(m);
  const grid: number[] = [];
  for (let h = lo; h <= hi; h += hi - lo > 6 ? 2 : 1) grid.push(h);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="24 hour tide curve">
      <defs>
        <linearGradient id="tideFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3F7A5B" stopOpacity="0.75" />
          <stop offset="1" stopColor="#12281D" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {grid.map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#fff" strokeOpacity="0.1" />
          <text x={L - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#BFD2C6">
            {g}
          </text>
        </g>
      ))}
      <text x={4} y={12} fontSize="11" fill="#BFD2C6">
        ft
      </text>
      {snap.windows.map((w, i) => {
        const a = Math.max(tideMinutes(w.start), m0);
        const b = Math.min(tideMinutes(w.end), m1);
        return b > a ? <rect key={i} x={x(a)} y={T - 6} width={x(b) - x(a)} height={H - T - B + 6} fill="#D97706" fillOpacity="0.2" rx="4" /> : null;
      })}
      <path d={area} fill="url(#tideFill)" />
      <path d={line} fill="none" stroke="#F29A2E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {snap.extremes
        .filter((e) => tideMinutes(e.t) > m0 + 20 && tideMinutes(e.t) < m1 - 20)
        .map((e) => (
          <g key={e.t}>
            <circle cx={x(tideMinutes(e.t))} cy={y(e.h)} r="4" fill="#12281D" stroke="#fff" strokeWidth="2" />
            <text x={x(tideMinutes(e.t))} y={e.type === 'H' ? y(e.h) - 10 : y(e.h) + 19} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
              {e.type === 'H' ? 'High' : 'Low'} {tideClockShort(e.t)}
            </text>
          </g>
        ))}
      {ticks.map((m) => (
        <text key={m} x={x(m)} y={H - 8} textAnchor="middle" fontSize="11" fill="#BFD2C6">
          {tideClockShort(fromTideMinutes(m))}
        </text>
      ))}
      <line x1={x(nowM)} x2={x(nowM)} y1={T - 8} y2={H - B} stroke="#fff" strokeWidth="1.5" strokeDasharray="4 4" />
      <circle cx={x(nowM)} cy={y(snap.now.h)} r="6" fill="#fff" stroke="#D97706" strokeWidth="3" />
    </svg>
  );
}

export function TideWidget() {
  const { data: snap, error, loading } = useRemote<TideSnapshot>('/api/tides', 5 * 60_000);

  if (!snap) {
    return (
      <section className="rounded-2xl bg-river-950 p-5 text-white sm:p-6" aria-busy={loading}>
        <p className="display-md text-xl">Marsh tide</p>
        {error ? <p className="mt-3 text-white/80">Couldn’t load the tide: {error}</p> : <div className="mt-4 h-56 animate-pulse rounded-xl bg-white/10" />}
      </section>
    );
  }

  const nowM = tideMinutes(snap.now.t);
  const current = snap.windows.find((w) => tideMinutes(w.start) <= nowM && nowM < tideMinutes(w.end));
  const next = snap.windows.filter((w) => tideMinutes(w.start) > nowM).sort((a, b) => tideMinutes(a.start) - tideMinutes(b.start))[0];
  const rising = snap.now.trend === 'rising';

  return (
    <section className="rounded-2xl bg-river-950 p-4 text-white shadow-lift sm:p-6" aria-label="Oyster Point marsh tide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm text-river-200">
            <Waves className="h-4 w-4" aria-hidden /> Oyster Point marsh, Mount Pleasant
          </p>
          <p className="display-md mt-0.5 text-2xl">Tide right now</p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-bold', snap.source === 'noaa' ? 'bg-river-500/40 text-white' : 'bg-sunset/90 text-river-950')}>
          {snap.source === 'noaa' ? (snap.now.observed ? 'Live from NOAA' : 'NOAA predictions') : 'Simulated'}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,17rem)_1fr]">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className="col-span-2 flex items-center gap-4 rounded-xl bg-white/8 p-4 lg:col-span-1">
            <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-full', rising ? 'bg-sunset text-river-950' : 'bg-white/15 text-white')}>
              {rising ? <ArrowUp className="h-8 w-8" strokeWidth={3} aria-hidden /> : <ArrowDown className="h-8 w-8" strokeWidth={3} aria-hidden />}
            </span>
            <div>
              <p className="display text-4xl" data-testid="tide-status">
                {rising ? 'Rising' : 'Falling'}
              </p>
              <p className="text-river-200">
                <strong className="text-white tabular-nums">{snap.now.h.toFixed(1)} ft</strong> above low-water mark
              </p>
            </div>
          </div>
          {[
            { label: 'Next high tide', e: snap.nextHigh },
            { label: 'Next low tide', e: snap.nextLow },
          ].map(({ label, e }) => (
            <div key={label} className="rounded-xl bg-white/8 p-4">
              <p className="text-sm text-river-200">{label}</p>
              {e ? (
                <>
                  <p className="display-md text-2xl tabular-nums">{tideClock(e.t)}</p>
                  <p className="text-sm text-river-200">
                    {e.h.toFixed(1)} ft, in {untilLabel(tideMinutes(e.t) - nowM)}
                  </p>
                </>
              ) : (
                <p className="mt-1">Not available</p>
              )}
            </div>
          ))}
        </div>

        <div className="min-w-0">
          <div
            className={cn('mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3', current ? 'bg-sunset text-river-950' : 'bg-white/8')}
            data-testid="bite-badge"
          >
            <span className="flex items-center gap-2 font-bold">
              <span className={cn('h-2.5 w-2.5 rounded-full', current ? 'animate-pulse bg-river-950' : 'bg-sunset')} aria-hidden />
              Marsh Bite Window{current ? ': ON' : ''}
            </span>
            <span className={cn('text-sm', current ? 'text-river-900' : 'text-river-200')}>
              {current
                ? `Strong ${current.leg} current until ${tideClock(current.end)}`
                : next
                  ? `Next: ${tideClock(next.start)} to ${tideClock(next.end)}, ${next.leg} current, in ${untilLabel(tideMinutes(next.start) - nowM)}`
                  : 'No window in the next day'}
            </span>
          </div>
          <TideChart snap={snap} />
          <p className="mt-1 flex items-start gap-1.5 text-xs text-river-200">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Amber bands mark the middle of each rising or falling tide, when the current is strongest and bait fish move. A rule of thumb, not a forecast.
              {snap.note ? ` ${snap.note}` : ` Station: ${snap.station.name} (NOAA ${snap.station.id}), the nearest live gauge.`}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
