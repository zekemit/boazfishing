import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import { isAdmin } from './auth';
import { BusyError } from './transact';

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function fail(status: number, error: string, fields?: Record<string, string>): NextResponse {
  return json(fields ? { error, fields } : { error }, status);
}

/** Returns a 401 response when the caller is not the signed-in instructor, otherwise null. */
export async function guardAdmin(): Promise<NextResponse | null> {
  return (await isAdmin()) ? null : fail(401, 'Please sign in as the instructor.');
}

/** Throw from inside a route (or a `mutate` transaction) to answer with a specific status. */
export class HttpError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/** Wraps a handler body: HttpErrors become clean JSON errors, anything else becomes a 500. */
export async function guarded(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return fail(e.status, e.message, e.fields);
    if (e instanceof BusyError) return fail(503, 'Lots of people are booking right now. Please try again in a moment.');
    console.error(e);
    return fail(500, 'Something went wrong on our side. Please try again.');
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function zodFail(err: ZodError): NextResponse {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = Object.values(fields)[0] ?? 'Invalid request.';
  return fail(400, first, fields);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'local';
}

export function isHttps(req: Request): boolean {
  return req.headers.get('x-forwarded-proto') === 'https' || new URL(req.url).protocol === 'https:';
}
