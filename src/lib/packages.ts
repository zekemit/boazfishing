import type { PackageId } from './types';

export interface LessonPackage {
  id: PackageId;
  name: string;
  level: string; // short label, e.g. "Beginner"
  durationMin: number;
  durationLabel: string;
  tagline: string;
  basePrice: number;
  includedAnglers: number;
  extraAnglerPrice: number;
  maxAnglers: number;
  /** Earliest start time (HH:mm) this lesson can begin, e.g. sunset sessions only run late afternoon onward */
  earliestStart?: string;
  /** Tide gate: a lesson may only START between minAhead and maxAhead minutes before a high tide. */
  tideGate?: { minAhead: number; maxAhead: number; label: string };
  includes: string[];
  highlight?: string;
  /** The stages of a lesson that moves between places, shown as a progression on the card. */
  path?: string[];
}

/** Boaz fishes these two lessons on the push of the incoming tide: start 1 to 2 hours before high tide. */
const TIDE_GATE = { minAhead: 60, maxAhead: 120, label: 'Starts 1 to 2 hours before high tide' };

export const PACKAGES: LessonPackage[] = [
  {
    id: 'first-cast',
    name: 'First Cast',
    level: 'Beginner',
    durationMin: 45,
    durationLabel: '45 minutes',
    tagline: 'Master the cast in a stress-free backyard, then take it to the pond and catch a real fish.',
    basePrice: 100,
    includedAnglers: 2,
    extraAnglerPrice: 0,
    maxAnglers: 2,
    highlight: 'Best for first-timers',
    path: ['Backyard training', 'Fish the pond'],
    includes: [
      'Relaxed backyard training: casting mechanics and accuracy, with no snags and no stress',
      'Knot tying you can trust, practiced in the backyard first',
      'Baiting your own hook with cut bait',
      'Then to the pond: put your new skills to work and land real fish',
    ],
  },
  {
    id: 'summer-angler',
    name: 'Summer Angler',
    level: 'Extended',
    durationMin: 120,
    durationLabel: '2 hours',
    tagline: 'Leave with a system, not just a story.',
    basePrice: 150,
    includedAnglers: 2,
    extraAnglerPrice: 0,
    maxAnglers: 2,
    highlight: 'Best for bigger fish',
    tideGate: TIDE_GATE,
    includes: [
      'Choosing between cut and live bait for the fish you want',
      'Structure fishing: points, drop-offs, docks and weed edges',
      'Fishing at the right depth, from the surface to the bottom',
      'Reading bites and setting the hook at the right moment',
    ],
  },
  {
    id: 'sunset-session',
    name: 'Sunset Session',
    level: 'Evening',
    durationMin: 45,
    durationLabel: '45 minutes',
    tagline: "Golden hour at the water's edge, when the fish start biting.",
    basePrice: 100,
    includedAnglers: 2,
    extraAnglerPrice: 0,
    maxAnglers: 2,
    earliestStart: '16:00',
    tideGate: TIDE_GATE,
    includes: [
      'Fishing the evening bite, when the fish move in to feed',
      'Live and cut bait setups that work at dusk',
      'Reading evening feeding windows',
      'A relaxed pace, great for a parent and child or a quiet night out',
    ],
  },
];

export function getPackage(id: string | null | undefined): LessonPackage | undefined {
  return PACKAGES.find((p) => p.id === id);
}

export function priceFor(pkg: LessonPackage, anglers: number): number {
  return pkg.basePrice + Math.max(0, anglers - pkg.includedAnglers) * pkg.extraAnglerPrice;
}

export function formatPrice(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}
