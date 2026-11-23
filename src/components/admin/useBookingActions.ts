'use client';

import { api, errorMessage } from '@/lib/api';
import { notifyChange } from '@/lib/sync';
import type { Booking, BookingStatus } from '@/lib/types';
import { useToast } from './Toast';

/** Approve / cancel / complete a booking, or save progress notes. Shared by the Command Center and the Bookings tab. */
export function useBookingActions(refresh: () => Promise<void>) {
  const toast = useToast();

  async function setStatus(b: Booking, status: BookingStatus, opts: { notify?: boolean } = {}) {
    try {
      await api('/api/bookings', { method: 'PATCH', json: { id: b.id, status, ...(opts.notify === false ? { notify: false } : {}) } });
      await refresh();
      notifyChange();
      const name = b.name.split(' ')[0];
      toast.success(
        status === 'confirmed'
          ? `Approved ${name}'s lesson. A confirmation email is logged in Alerts.`
          : status === 'completed'
            ? `Marked ${name}'s lesson completed.`
            : status === 'cancelled'
              ? `Cancelled. That time is open again${opts.notify === false ? '.' : ', and a cancellation email is logged in Alerts.'}`
              : `Restored ${name}'s booking.`,
      );
    } catch (e) {
      toast.error(errorMessage(e));
      await refresh();
    }
  }

  async function saveProgress(b: Booking, patch: { tags: string[]; practiced: string[]; lessonNotes: string }): Promise<boolean> {
    try {
      await api('/api/bookings', { method: 'PATCH', json: { id: b.id, ...patch } });
      await refresh();
      notifyChange();
      toast.success(`Saved notes for ${b.name.split(' ')[0]}.`);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }

  return { setStatus, saveProgress };
}
