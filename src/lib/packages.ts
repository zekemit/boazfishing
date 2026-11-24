import type { PackageId } from './types';

/**
 * Boaz's real structure: one program, "Learn to Fish With Boaz". Three 45 minute one-on-one sessions for $100 total.
 * Each session is booked as its own time slot, so each is a "package" here (session-1, session-2, session-3).
 */
export const PROGRAM = {
  name: 'Learn to Fish With Boaz',
  price: 100,
  sessionCount: 3,
  sessionMinutes: 45,
  format: '1 on 1 sessions',
  ages: 'Recommended ages 4 to 12',
  jig: 'Includes a practice knot tying jig',
  bring: 'Cast net and spinner rod',
  bringNote: "If you don't have these, Boaz can provide them.",
  flexNote: "Boaz can adjust the schedule based on the learner's needs.",
};

/** One line of a session outline. `handsOn` marks the practice parts; `sub` are the bullets under it. */
export interface OutlineItem {
  text: string;
  handsOn?: boolean;
  sub?: string[];
}

export interface LessonPackage {
  id: PackageId;
  /** "Session 1" */
  name: string;
  /** What the session covers, e.g. "Knots, rod basics and casting" */
  title: string;
  number: 1 | 2 | 3;
  level: string;
  durationMin: number;
  durationLabel: string;
  tagline: string;
  /** The program price is charged once, on session 1. Sessions 2 and 3 are included. */
  basePrice: number;
  includedAnglers: number;
  extraAnglerPrice: number;
  maxAnglers: number;
  /** Tide gate: a session may only START between minAhead and maxAhead minutes before a high tide. */
  tideGate?: { minAhead: number; maxAhead: number; label: string };
  /** Earliest start time (HH:mm), if a session can't begin before a certain hour. */
  earliestStart?: string;
  outline: OutlineItem[];
}

/** Boaz fishes sessions 2 and 3 on the push of the incoming tide: start 1 to 2 hours before high tide. */
const TIDE_GATE = { minAhead: 60, maxAhead: 120, label: 'Starts 1 to 2 hours before high tide' };

const BASE = { durationMin: PROGRAM.sessionMinutes, durationLabel: '45 minutes', includedAnglers: 1, extraAnglerPrice: 0, maxAnglers: 1 } as const;

export const PACKAGES: LessonPackage[] = [
  {
    ...BASE,
    id: 'session-1',
    name: 'Session 1',
    title: 'Knots, rod basics and casting',
    number: 1,
    level: 'Foundations',
    tagline: 'Your first knot, a spinning rod in your hands, and your first casts.',
    basePrice: PROGRAM.price,
    outline: [
      { text: 'Fundamental knot tying', sub: ['Palmer knot'] },
      { text: 'Basics of a spinning rod' },
      { text: 'How to cast', handsOn: true, sub: ['Spinner rod', 'Cast net'] },
    ],
  },
  {
    ...BASE,
    id: 'session-2',
    name: 'Session 2',
    title: 'Rigs and fishing for bait',
    number: 2,
    level: 'On the water',
    tagline: 'Three rigs that work around Charleston, then catching bait and fish.',
    basePrice: 0,
    tideGate: TIDE_GATE,
    outline: [
      { text: 'Learning 3 basic rigs (common around Charleston) and when to use them', sub: ['Carolina rig', 'Double drop (chicken)', 'Popping cork'] },
      {
        text: 'Casting for bait and fish',
        handsOn: true,
        sub: [
          'Includes catching bait with a cast net',
          'Hooking and cutting bait properly, and casting out on a spinner rod for a catch',
          'Intro to removing hooks, handling fish and safe release',
        ],
      },
    ],
  },
  {
    ...BASE,
    id: 'session-3',
    name: 'Session 3',
    title: 'Ready to fish',
    number: 3,
    level: 'Putting it together',
    tagline: 'A better knot, then fishing on your own with Boaz beside you.',
    basePrice: 0,
    tideGate: TIDE_GATE,
    outline: [
      { text: 'Fundamental knot tying', sub: ['Improved clinch knot'] },
      {
        text: 'Ready to fish',
        handsOn: true,
        sub: [
          'Includes catching bait with a cast net',
          'Hooking and cutting bait properly, and casting out on a spinner rod for a catch',
          'Removing hooks, handling fish and safe release',
        ],
      },
    ],
  },
];

export function getPackage(id: string | null | undefined): LessonPackage | undefined {
  return PACKAGES.find((p) => p.id === id);
}

/** "Session 2 of 3: Rigs and fishing for bait" */
export function sessionLabel(id: string | null | undefined, withTitle = true): string {
  const p = getPackage(id);
  if (!p) return 'Session';
  return withTitle ? `Session ${p.number} of ${PROGRAM.sessionCount}: ${p.title}` : `Session ${p.number} of ${PROGRAM.sessionCount}`;
}

export function formatPrice(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}
