import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ADMIN_COOKIE, SESSION_MS, checkPasscode, isAdmin, sessionSecret, signSession } from '@/server/auth';
import { clientIp, fail, guarded, isHttps, json, readJson, zodFail } from '@/server/http';
import { allow } from '@/server/rateLimit';

export const dynamic = 'force-dynamic';

const body = z.object({ passcode: z.string().min(1, 'Enter the passcode.').max(200) });

/** Who am I? */
export async function GET() {
  return json({ authenticated: await isAdmin() });
}

/** Sign in with the instructor passcode. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    if (!allow(`login:${clientIp(req)}`, 8, 10 * 60_000)) {
      return fail(429, 'Too many attempts. Wait a few minutes and try again.');
    }
    const parsed = body.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    if (!checkPasscode(parsed.data.passcode)) return fail(401, "That passcode doesn't match. Try again.");

    const res = json({ authenticated: true });
    res.cookies.set(ADMIN_COOKIE, signSession(await sessionSecret(true)), {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps(req),
      path: '/',
      maxAge: SESSION_MS / 1000,
    });
    return res;
  });
}

/** Sign out. */
export async function DELETE() {
  const res = json({ authenticated: false });
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
