export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

type ApiInit = Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit | null };

/** fetch wrapper: JSON in, JSON out, throws ApiError with the server's message. */
export async function api<T>(url: string, init: ApiInit = {}): Promise<T> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  let body = rest.body;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }
  const res = await fetch(url, { ...rest, headers, body, cache: 'no-store', credentials: 'same-origin' });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; fields?: Record<string, string> };
    throw new ApiError(d.error ?? `Request failed (${res.status})`, res.status, d.fields);
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}
