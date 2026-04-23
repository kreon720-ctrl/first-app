import { BACKEND_URL, getJwt } from './config.js';

/**
 * Call the TEAM WORKS backend REST API on behalf of the authenticated user.
 * Throws on non-2xx with { status, body } attached so the caller can surface
 * the error to the LLM as a tool result.
 */
export async function callBackend(pathname, { method = 'GET', query, body } = {}) {
  const url = new URL(pathname, BACKEND_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${getJwt()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    const err = new Error(
      `Backend ${method} ${pathname} failed (${res.status}): ${
        typeof payload === 'string' ? payload : payload?.error || ''
      }`.trim()
    );
    err.status = res.status;
    err.body = payload;
    throw err;
  }

  return payload;
}
