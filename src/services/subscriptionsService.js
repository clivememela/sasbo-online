import { apiUrl } from './api';
import { requestJson, requestJsonWrite } from './parseApiError';

/**
 * 🔴 A24's QUIETER HALF, third of three: this file rejected with the raw response TEXT, so a
 * caller's `catch (e) { e.message }` was `undefined`. Every method is on the one error path now
 * (conventions §16) and rejects with an `Error` carrying `kind`, `status`, `validationErrors` and
 * `retryable`, under A14's request ceiling.
 *
 * ⚠️ `create` STILL POSTS TO `/api/recruitment-channels`, AND THAT IS DELIBERATE HERE. It is
 * A23 — a subscription created against the wrong resource — and it is PINNED in
 * `services.errorContract.test.js`, which asserts the wrong endpoint on purpose so the day it is
 * fixed the pin reddens and names the row. Correcting it inside an error-handling change would
 * flip a pinned defect silently, which is exactly what contract ④ forbids. The path is untouched.
 */
export const subscriptionsService = {
    getAll: () =>
        requestJson((signal) => fetch(apiUrl('/api/subscriptions'), {
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
        requestJsonWrite((signal) => fetch(apiUrl(`/api/subscriptions/${id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
            signal,
        })),

    // `parseBody: false`: a DELETE answers 204 with no body, and rejecting because that body was
    // not JSON would be the defect rather than the fix.
    remove: (id) =>
        requestJsonWrite((signal) => fetch(apiUrl(`/api/subscriptions/${id}`), {
            method: 'DELETE',
            credentials: 'include',
            signal,
        }), { parseBody: false }),
};
