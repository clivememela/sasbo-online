import { apiUrl } from './api';
import { requestJson, requestJsonWrite } from './parseApiError';

/**
 * 🔴 A24's QUIETER HALF, first of three: `handleResponse` rejected with the raw response TEXT, so
 * a caller's ordinary `catch (e) { e.message }` was `undefined` and the server's own sentence was
 * lost. Every method is on the one error path now (conventions §16).
 *
 * 🔑 AND THE `console.error(...)` WRAPPERS ARE GONE FROM FOUR METHODS. They logged and rethrew,
 * which means the SAME failure was reported twice — once here where no consumer can act on it, and
 * again at the caller which is the only place that can render a state. EH-D10 gives this
 * application one sink; a service is not it. Nothing is swallowed: every one of these still
 * rejects, and now with a message worth showing.
 */
export const recruiterService = {
  getAll: () =>
    requestJson((signal) => fetch(apiUrl('/api/representatives'), {
      credentials: 'include',
      signal,
    })),

  create: (data) =>
    requestJsonWrite((signal) => fetch(apiUrl('/api/representatives'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
      signal,
    })),

  update: (id, data) =>
    requestJsonWrite((signal) => fetch(apiUrl(`/api/representatives/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
      signal,
    })),

  // `parseBody: false`: a DELETE answers 204 with no body.
  remove: (id) =>
    requestJsonWrite((signal) => fetch(apiUrl(`/api/representatives/${id}`), {
      method: 'DELETE',
      credentials: 'include',
      signal,
    }), { parseBody: false }),

  getStructures: () =>
    requestJson((signal) => fetch(apiUrl('/api/members/structures/tree'), {
      credentials: 'include',
      signal,
    })),

  getRoles: () =>
    requestJson((signal) => fetch(apiUrl('/api/members/userRoles'), {
      credentials: 'include',
      signal,
    })),
};
