import { apiUrl } from './api';
import { requestJson, requestJsonWrite } from './parseApiError';

/**
 * Signing in, out and changing a password -- `/api/auth`, the sign-in contract (`contracts/signin.md`).
 *
 *   `getMode()`              `{ mode: 'open' | 'required' }` -- anyone may ask, in either mode.
 *   `signIn(credentials)`    `{ token, expiresAt, user }`; refused `SIGN_IN_FAILED` (401), `ACCOUNT_LOCKED` (423),
 *                            `ACCOUNT_INACTIVE` (403).
 *   `signOut()`              204 -- revokes the session the request carries.
 *   `getMe()`                `{ user }`; a `401` here is the session ending, which `api.js` acts on by itself.
 *   `changePassword(body)`   204; refused `PASSWORD_RULES` (400) or `SIGN_IN_FAILED` (401, the current password).
 *
 * The token is never handled here: `api.js` adds it to every API request. A password travels only in a request body,
 * never in an address and never in anything logged.
 */
const json = (method, body) => ({
  method,
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const getMode = () =>
  requestJson((signal) => fetch(apiUrl('/api/auth/mode'), { credentials: 'include', signal }));

export const signIn = ({ username, password }) =>
  requestJsonWrite((signal) => fetch(apiUrl('/api/auth/login'), { ...json('POST', { username, password }), signal }));

// 204 by contract; `allowEmpty` still holds a body that is not JSON to be the failure it is.
export const signOut = () =>
  requestJsonWrite((signal) => fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include', signal }),
    { allowEmpty: true });

export const getMe = () =>
  requestJson((signal) => fetch(apiUrl('/api/auth/me'), { credentials: 'include', signal }));

export const changePassword = ({ currentPassword, newPassword }) =>
  requestJsonWrite((signal) => fetch(apiUrl('/api/auth/password'), {
    ...json('POST', { currentPassword, newPassword }),
    signal,
  }), { allowEmpty: true });

export const authService = { getMode, signIn, signOut, getMe, changePassword };
