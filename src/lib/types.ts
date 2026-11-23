// Shared types: safe to import from both server and client code.

export const PACKAGE_IDS = ['first-cast', 'summer-angler', 'sunset-session'] as const;
export type PackageId = (typeof PACKAGE_IDS)[number];

export type WindowStatus = 'open' | 'blocked';

/** A block of time Boaz has marked as open (or blocked) on a given date. Times are local business time. */
export interface AvailabilityWindow {
  id: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm (30 minute grid)
  end: string; // HH:mm
  status: WindowStatus;
}

export const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const EXPERIENCE_LEVELS = ['first-time', 'some', 'confident'] as const;
export type Experience = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LABELS: Record<Experience, string> = {
  'first-time': 'First time',
  some: 'Some experience',
  confident: 'Confident angler',
};

export interface Booking {
  id: string;
  code: string; // human friendly confirmation code, e.g. BFC-7K3Q9
  packageId: PackageId;
  date: string;
  start: string;
  end: string;
  name: string;
  email: string;
  phone: string;
  experience: Experience;
  anglers: number;
  notes: string;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  sample?: boolean; // seeded demo data
}

export const PHOTO_SLOT_IDS = [
  'hero',
  'bio',
  'gallery-1',
  'gallery-2',
  'gallery-3',
  'gallery-4',
  'gallery-5',
  'gallery-6',
] as const;
export type PhotoSlotId = (typeof PHOTO_SLOT_IDS)[number];

export interface PhotoSettings {
  /** null means "use the file at the slot's default path in /public/images/boaz/" */
  src: string | null;
  alt: string;
  caption: string;
  focusX: number; // 0..100, object-position x
  focusY: number; // 0..100, object-position y
  hidden: boolean;
}
export type PhotoMap = Record<PhotoSlotId, PhotoSettings>;

export interface DB {
  version: 1;
  secret: string;
  windows: AvailabilityWindow[];
  bookings: Booking[];
  photos: PhotoMap;
}

// ---- API payloads ----

export interface PublicAvailability {
  today: string;
  packageId: PackageId;
  /** date -> bookable start times for this package (already excludes booked / blocked / past) */
  days: Record<string, string[]>;
  next: { date: string; start: string } | null;
}

export interface AdminAvailability {
  today: string;
  windows: AvailabilityWindow[];
  bookings: Booking[]; // non-cancelled bookings within the requested range
}

export interface BookingsPayload {
  today: string;
  bookings: Booking[];
}

export interface PublicPhoto {
  src: string | null;
  alt: string;
  caption: string;
  focusX: number;
  focusY: number;
}

export interface AdminPhotosPayload {
  photos: PhotoMap;
  /** What each slot currently displays on the public site (null = nothing / empty slot) */
  resolved: Record<PhotoSlotId, string | null>;
}
