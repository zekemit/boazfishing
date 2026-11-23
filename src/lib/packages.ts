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
    durationMin: 120,
    durationLabel: '2 hours',
    tagline: 'Your first fish starts with one good cast.',
    basePrice: 120,
    includedAnglers: 2,
    extraAnglerPrice: 40,
    maxAnglers: 4,
    includes: [
      'Casting fundamentals, step by step',
      'Knot tying: the two knots you will actually use',
      'Reading the water: where fish hold and why',
      'Landing, handling and releasing your first fish',
    ],
  },
  {
    id: 'summer-angler',
    name: 'Summer Angler',
    level: 'Half-day',
    durationMin: 240,
    durationLabel: '4 hours',
    tagline: 'Leave with a system, not just a story.',
    basePrice: 240,
    includedAnglers: 2,
    extraAnglerPrice: 60,
    maxAnglers: 4,
    highlight: 'Best for trophy fish',
    includes: [
      'Advanced lure selection and color choices',
      'Structure fishing: points, drop-offs, docks and weed edges',
      'Dialing in retrieves and presentations for bigger fish',
      'Boat-side handling, photos and clean releases',
    ],
  },
  {
    id: 'sunset-session',
    name: 'Sunset Session',
    level: 'Evening',
    durationMin: 150,
    durationLabel: '2.5 hours',
    tagline: 'Golden hour, glassy water, topwater strikes.',
    basePrice: 160,
    includedAnglers: 2,
    extraAnglerPrice: 45,
    maxAnglers: 4,
    earliestStart: '16:00',
    includes: [
      'Prime golden-hour topwater action',
      'Walking baits, poppers and surface lure technique',
      'Reading evening feeding windows',
      'Relaxed pace, great for families and date nights',
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
