// Cross-tab sync: when something changes in one browser tab (a booking, an availability edit),
// other open tabs of the site refetch immediately instead of waiting for the next poll.

const NAME = 'boaz-sync';
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  if (!channel) channel = new BroadcastChannel(NAME);
  return channel;
}

export function notifyChange(): void {
  try {
    getChannel()?.postMessage('changed');
  } catch {
    /* ignore */
  }
}

export function onChange(cb: () => void): () => void {
  const c = getChannel();
  if (!c) return () => {};
  const handler = () => cb();
  c.addEventListener('message', handler);
  return () => c.removeEventListener('message', handler);
}
