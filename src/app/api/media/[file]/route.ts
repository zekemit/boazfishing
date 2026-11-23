import path from 'node:path';
import type { NextRequest } from 'next/server';
import { contentTypeFor, mediaBackend } from '@/server/storage';

export const dynamic = 'force-dynamic';

/** Serves photos uploaded through Admin > Photos. Works in dev and production with no rebuild. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const safe = path.basename(file);
  if (!/^[a-z0-9][a-z0-9._-]{0,100}$/i.test(safe) || !contentTypeFor(safe)) return new Response('Not found', { status: 404 });
  try {
    const found = await mediaBackend().get(safe);
    if (!found) return new Response('Not found', { status: 404 });
    return new Response(new Uint8Array(found.data), {
      headers: {
        'Content-Type': found.contentType,
        // File names are unique per upload, so these can be cached forever, by browsers and by the CDN.
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    console.error(e);
    return new Response('Unavailable', { status: 503 });
  }
}
