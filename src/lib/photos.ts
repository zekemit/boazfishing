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

/** Starting copy and framing for each slot. The images themselves come from the default file paths. */
export function defaultPhotos(): PhotoMap {
  return {
    hero: base('Two young anglers working a deeply bent rod on calm, glassy water under a clear blue sky', '', 70, 20),
    bio: base('Boaz smiling and holding a freshly caught striped bass', '', 50, 35),
    'gallery-1': base('A hooked striped bass dangling at the edge of the water while the angler holds the rod high', 'Striper on the line', 55, 35),
    'gallery-2': base('A grinning angler holding up a silver catfish next to the cooler', 'First-fish grin', 50, 30),
    'gallery-3': base('A hands-on lesson in handling a big catfish on the deck', 'Hands-on handling lesson', 50, 50),
    'gallery-4': base('Two young anglers fighting a fish with the rod bent over calm water', 'Fish on! Rod doubled over', 60, 35),
    'gallery-5': base('A smiling angler holding a striped bass across their chest', 'A summer striper to remember', 50, 35),
    'gallery-6': base('A fresh catch from a summer lesson', 'Fresh from the water', 50, 40),
  };
}

export const ALL_SLOT_IDS = PHOTO_SLOT_IDS;
