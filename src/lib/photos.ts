import { PHOTO_SLOT_IDS, type PhotoMap, type PhotoSettings, type PhotoSlotId } from './types';

export interface PhotoSlotDef {
  id: PhotoSlotId;
  label: string;
  hint: string;
  fileName: string;
  defaultPath: string; // public URL path
  filePath: string; // path on disk, relative to the project root
  aspect: string; // tailwind aspect class for the admin preview
}

const DIR = '/images/boaz';

export const PHOTO_SLOTS: PhotoSlotDef[] = [
  {
    id: 'hero',
    label: 'Hero background',
    hint: 'The big photo behind the headline. The headline sits on the left, so keep the action on the right side. Use the focus sliders to reframe.',
    fileName: 'hero.jpg',
    defaultPath: `${DIR}/hero.jpg`,
    filePath: 'public/images/boaz/hero.jpg',
    aspect: 'aspect-[4/3]',
  },
  {
    id: 'bio',
    label: 'Meet Boaz portrait',
    hint: 'A portrait-orientation photo of Boaz works best (4:5).',
    fileName: 'bio.jpg',
    defaultPath: `${DIR}/bio.jpg`,
    filePath: 'public/images/boaz/bio.jpg',
    aspect: 'aspect-[4/5]',
  },
  ...([1, 2, 3, 4, 5, 6] as const).map(
    (n): PhotoSlotDef => ({
      id: `gallery-${n}` as PhotoSlotId,
      label: `Catch gallery photo ${n}`,
      hint: 'Shows in the Summer Catch Gallery. Leave a slot empty (or hide it) and it disappears from the site.',
      fileName: `gallery-${n}.jpg`,
      defaultPath: `${DIR}/gallery-${n}.jpg`,
      filePath: `public/images/boaz/gallery-${n}.jpg`,
      aspect: 'aspect-[4/5]',
    }),
  ),
];

export function slotDef(id: PhotoSlotId): PhotoSlotDef {
  const def = PHOTO_SLOTS.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown photo slot: ${id}`);
  return def;
}

const base = (alt: string, caption: string, focusX = 50, focusY = 40): PhotoSettings => ({
  src: null,
  alt,
  caption,
  focusX,
  focusY,
  hidden: false,
});

const hide = (p: PhotoSettings): PhotoSettings => ({ ...p, hidden: true });

/** Starting copy and framing for each slot. The images themselves come from the default file paths. */
export function defaultPhotos(): PhotoMap {
  return {
    hero: base('A smiling young angler kneeling on a sunny dock holding up a long, silver gar', '', 50, 35),
    bio: base('A smiling young angler holding a catfish with fish grips', '', 50, 35),
    'gallery-1': base('Two young anglers sharing a rod on a wooden boardwalk over the marsh', 'Learning on the boardwalk', 45, 45),
    'gallery-2': base('A young angler throwing a cast net in the shallows at low tide', 'Cast net practice at low tide', 55, 55),
    'gallery-3': base('A laughing young angler holding a big redfish', 'Redfish!', 50, 50),
    'gallery-4': base('A smiling young angler holding a big redfish on a wooden dock over the water', 'Redfish off the dock', 40, 30),
    'gallery-5': base('A smiling young angler holding up a big redfish on the water at golden hour', 'Golden-hour redfish', 55, 45),
    'gallery-6': hide(base('', '', 50, 40)),
  };
}

export const ALL_SLOT_IDS = PHOTO_SLOT_IDS;
