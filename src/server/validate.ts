import { z } from 'zod';
import { BOOKING_STATUSES, EXPERIENCE_LEVELS, PACKAGE_IDS, PHOTO_SLOT_IDS } from '@/lib/types';
import { isValidDate, toMin } from '@/lib/time';

export const dateStr = z.string().refine(isValidDate, 'Use a valid date.');
export const timeStr = z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, 'Times must be on the hour or half hour.');
export const weekdays = z.array(z.number().int().min(0).max(6)).min(1, 'Pick at least one day of the week.');

export const blockSchema = z
  .object({ start: timeStr, end: timeStr })
  .refine((b) => toMin(b.end) > toMin(b.start), { message: 'End time must be after the start time.', path: ['end'] });

export const availabilityAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), date: dateStr, blocks: z.array(blockSchema).min(1).max(8) }),
  z.object({
    action: z.literal('bulk-add'),
    startDate: dateStr,
    endDate: dateStr,
    weekdays,
    blocks: z.array(blockSchema).min(1).max(8),
  }),
  z.object({
    action: z.literal('bulk-set'),
    startDate: dateStr,
    endDate: dateStr,
    weekdays,
    status: z.enum(['open', 'blocked']),
  }),
  z.object({ action: z.literal('bulk-remove'), startDate: dateStr, endDate: dateStr, weekdays }),
]);

export const windowPatch = z
  .object({
    id: z.string().min(1),
    status: z.enum(['open', 'blocked']).optional(),
    start: timeStr.optional(),
    end: timeStr.optional(),
  })
  .refine((v) => v.status !== undefined || v.start !== undefined || v.end !== undefined, 'Nothing to change.');

export const bookingInput = z.object({
  packageId: z.enum(PACKAGE_IDS, { errorMap: () => ({ message: 'Choose a lesson.' }) }),
  date: dateStr,
  start: timeStr,
  name: z.string().trim().min(2, 'Enter your full name.').max(80, 'That name is too long.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(120),
  phone: z
    .string()
    .trim()
    .refine((v) => /^[+()\-.\s\d]{7,25}$/.test(v) && v.replace(/\D/g, '').length >= 7, 'Enter a phone number Boaz can text or call.'),
  experience: z.enum(EXPERIENCE_LEVELS, { errorMap: () => ({ message: 'Pick an experience level.' }) }),
  anglers: z.coerce.number().int().min(1, 'At least one angler.').max(10),
  notes: z.string().trim().max(800, 'Keep notes under 800 characters.').default(''),
  company: z.string().max(0).optional(), // honeypot: real people never fill it in
});

const label = z.string().trim().min(1).max(40);
export const bookingPatch = z
  .object({
    id: z.string().min(1),
    status: z.enum(BOOKING_STATUSES).optional(),
    /** Set false to change the status without emailing the student. Defaults to true. */
    notify: z.boolean().optional(),
    tags: z.array(label).max(12).optional(),
    practiced: z.array(label).max(12).optional(),
    lessonNotes: z.string().trim().max(2000, 'Keep lesson notes under 2000 characters.').optional(),
  })
  .refine((v) => v.status !== undefined || v.tags !== undefined || v.practiced !== undefined || v.lessonNotes !== undefined, 'Nothing to change.');

const photoSrc = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => {
    if (v === '') return true;
    if (v.startsWith('/') && !v.startsWith('//')) return true;
    try {
      const u = new URL(v);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Use a web address that starts with https:// or a site path that starts with /.');

export const photoPatch = z.object({
  slot: z.enum(PHOTO_SLOT_IDS),
  src: z.union([photoSrc, z.null()]).optional(),
  alt: z.string().trim().max(240).optional(),
  caption: z.string().trim().max(120).optional(),
  focusX: z.number().min(0).max(100).optional(),
  focusY: z.number().min(0).max(100).optional(),
  hidden: z.boolean().optional(),
});
