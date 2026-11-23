'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { WEEKDAY_LETTER, WEEKDAY_SHORT, fmtDateLong, fmtDayNum, fmtMonth, monthCells } from '@/lib/time';

interface CalendarProps {
  month: string; // YYYY-MM
  days: Record<string, string[]>; // only dates that are bookable appear here
  selected: string | null;
  today: string;
  canPrev: boolean;
  canNext: boolean;
  onMonth: (delta: -1 | 1) => void;
  onSelect: (date: string) => void;
}

/** Month grid that highlights only the dates Boaz has open. Everything else is disabled. */
export function Calendar({ month, days, selected, today, canPrev, canNext, onMonth, onSelect }: CalendarProps) {
  const cells = monthCells(month);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonth(-1)}
          disabled={!canPrev}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-sand-300 bg-white hover:bg-river-50 disabled:opacity-35 disabled:hover:bg-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="display-md text-2xl" aria-live="polite">
          {fmtMonth(month)}
        </h3>
        <button
          type="button"
          onClick={() => onMonth(1)}
          disabled={!canNext}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-sand-300 bg-white hover:bg-river-50 disabled:opacity-35 disabled:hover:bg-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-ink-mute">
        {WEEKDAY_LETTER.map((l, i) => (
          <abbr key={i} title={WEEKDAY_SHORT[i]} className="py-1.5 no-underline">
            {l}
          </abbr>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const times = days[date];
          const open = !!times?.length;
          const isSelected = selected === date;
          const isToday = date === today;
          return (
            <button
              key={date}
              type="button"
              disabled={!open}
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-label={`${fmtDateLong(date)}, ${open ? `${times.length} start ${times.length === 1 ? 'time' : 'times'} available` : 'not available'}`}
              className={cn(
                'relative flex aspect-square min-h-[44px] flex-col items-center justify-center rounded-lg text-[15px] transition-colors duration-150',
                isSelected
                  ? 'bg-river font-bold text-white ring-2 ring-sunset ring-offset-2 ring-offset-sand'
                  : open
                    ? 'bg-sunset-100 font-bold text-river-900 hover:bg-sunset-200'
                    : 'cursor-not-allowed text-ink/30',
                isToday && !isSelected && 'ring-1 ring-ink/30',
              )}
            >
              {fmtDayNum(date)}
              {open && !isSelected && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-sunset-600" aria-hidden />}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft">
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-sunset-100 ring-1 ring-sunset-200" aria-hidden />
          Boaz is free
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-river" aria-hidden />
          Your pick
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-sand-300" aria-hidden />
          Not available
        </li>
      </ul>
    </div>
  );
}
