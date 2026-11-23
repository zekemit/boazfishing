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
  // Instructor tools
  tags?: string[]; // progress tags, e.g. "Graduated to Pond"
  practiced?: string[]; // skills worked on in this lesson
  lessonNotes?: string;
  cancelledBy?: 'student' | 'instructor';
  // Notification bookkeeping (prevents duplicate sends)
  confirmationSentAt?: string;
  reminderSentAt?: string;
}

/** Progress tags offered as one-tap chips (instructors can also add their own). */
export const PROGRESS_TAGS = ['Backyard Casting', 'Knot Tying', 'Baiting & Hooks', 'Graduated to Pond', 'First Fish', 'Marsh Ready'] as const;
export const PRACTICE_SKILLS = [
  'Casting mechanics',
  'Accuracy',
  'Knots',
  'Baiting a hook',
  'Setting the hook',
  'Reeling in',
  'Handling and release',
  'Reading the water',
] as const;

export type NotifyKind = 'student_confirmation' | 'student_approved' | 'student_cancelled' | 'boaz_cancelled' | 'student_reminder' | 'boaz_alert' | 'boaz_agenda' | 'test';
export type NotifyChannel = 'email' | 'ntfy' | 'sms';
export type NotifyStatus = 'sent' | 'simulated' | 'failed';

/** One outgoing email or phone alert, kept so the instructor can see exactly what went out (or would have). */
export interface NotificationEntry {
  id: string;
  at: string; // ISO
  kind: NotifyKind;
  channel: NotifyChannel;
  to: string;
  subject: string;
  body: string;
  status: NotifyStatus;
  error?: string;
  bookingId?: string;
}

export interface ChannelStatus {
  channel: string;
  label: string;
  live: boolean;
  detail: string;
}

export interface NotificationsPayload {
  channels: ChannelStatus[];
  boazPhone: string | null;
  cronProtected: boolean;
  entries: NotificationEntry[];
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
  notifications: NotificationEntry[];
  /** date (YYYY-MM-DD) -> ISO time the day-of agenda was sent to the instructor */
  agendaSent: Record<string, string>;
  /** secret in the private calendar subscription URL */
  calendarToken: string;
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
  tz: string; // business time zone (IANA), used for calendar links
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
