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
  includes: string[];
  highlight?: string;
}

export const PACKAGES: LessonPackage[] = [
  {
    id: 'first-cast',
    name: 'First Cast',
    level: 'Beginner',
    durationMin: 45,
    durationLabel: '45 minutes',
    tagline: 'Your first fish starts with one good cast.',
    basePrice: 100,
    includedAnglers: 2,
    extraAnglerPrice: 0,
    maxAnglers: 2,
    includes: [
      'Casting fundamentals, step by step',
      'Knot tying: the two knots you will actually use',
      'Baiting your own hook with cut bait',
      'Setting the hook and reeling in with confidence',
    ],
  },
  {
    id: 'summer-angler',
    name: 'Summer Angler',
    level: 'Extended',
    durationMin: 120,
    durationLabel: '2 hours',
    tagline: 'Leave with a system, not just a story.',
    basePrice: 120,
    includedAnglers: 2,
    extraAnglerPrice: 0,
    maxAnglers: 2,
    highlight: 'Best for bigger fish',
    includes: [
      'Choosing between cut and live bait for the fish you want',
      'Structure fishing: points, drop-offs, docks and weed edges',
      'Rigging for bigger fish: bobber, bottom and live-bait setups',
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
