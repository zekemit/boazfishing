const g = globalThis as unknown as { __boazHits?: Map<string, number[]> };

/** Small in-memory limiter. Returns true when the call is allowed. */
export function allow(key: string, max: number, windowMs: number): boolean {
  const hits = (g.__boazHits ??= new Map<string, number[]>());
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t: number) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t: number) => now - t >= windowMs)) hits.delete(k);
  }
  return true;
}
