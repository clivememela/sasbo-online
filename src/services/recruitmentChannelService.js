import { apiUrl } from './api';
import { requestJson, requestJsonWrite } from './parseApiError';

/**
 * 🔴 THIS FILE USED TO REJECT WITH A BARE STRING, and that is A24's quieter half.
 *
 * `handleResponse` did `Promise.reject(msg)` with the response TEXT, so a caller's ordinary
 * `catch (e) { e.message }` was `undefined` — the free-text message the server had bothered to
 * send was lost by anyone handling the error the normal way. Three services did this.
 *
 * Every method now goes through `requestJson`, which is the one error path (conventions §16):
 * it rejects with an `Error` carrying `kind`, `status`, `validationErrors` and `retryable`, and
 * it imposes the request ceiling A14 exists for.
 *
 * 🔑 THE `apiUrl(...)` LITERAL STAYS AT ITS CALL SITE. `requestJson` takes a thunk precisely so
 * the static API-contract scan can still see each endpoint; a path-taking helper would hide them
 * and blind that guard.
 */
export const recruitmentChannelService = {
  getAll: () =>
    requestJson((signal) => fetch(apiUrl('/api/recruitment-channels'), {
      credentials: 'include',
      signal,
    })),

  create: (name) =>
    requestJsonWrite((signal) => fetch(apiUrl('/api/recruitment-channels'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
      signal,
    })),

  update: (id, data) =>
    requestJsonWrite((signal) => fetch(apiUrl(`/api/recruitment-channels/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
      signal,
    })),

  // `parseBody: false` because a DELETE answers 204 with no body: a service that rejected
  // because the body was not JSON would be the defect, not the fix.
  remove: (id) =>
    requestJsonWrite((signal) => fetch(apiUrl(`/api/recruitment-channels/${id}`), {
      method: 'DELETE',
      credentials: 'include',
      signal,
    }), { parseBody: false }),
};
