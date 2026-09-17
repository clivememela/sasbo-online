import { apiUrl } from './api';
import { requestJson, requestJsonWrite } from './parseApiError';

const PAGE_SIZE = 100;

/**
 * The member lane's service, on the one error path (conventions §16).
 *
 * 🔴 THIS IS THE FILE WHERE THE OLD MESSAGE COST THE MOST. A failed capture told the user
 *
 *     Failed to save member: HTTP 500:
 *
 * with nothing after the colon, because `statusText` is the empty string over HTTP/2 — while the
 * server's own explanation sat unread in the body. Every method here now rejects with that
 * message, plus `status`, `kind` and `retryable`.
 *
 * 🔑 AND `validationErrors` IS WHY THIS MATTERS BEYOND WORDING. Spring's
 * `MethodArgumentNotValidException` handler returns per-field messages under `validationErrors`
 * for a 400 — the one part of its envelope that is stable and field-addressable — and the old
 * code discarded it, so a capture form could not show *"identityNumber: must be 13 digits"* even
 * though it had been sent. It arrives first-class now, always an object, so a form can do
 * `Object.assign(fieldErrors, err.validationErrors)` without type-testing anything (EH-D7).
 *
 * ⚠️ THE THREE WRITES TAKE THE 20s CEILING, THE TWO READS 10s (A14, §16). A read that is slow can
 * be retried for free; a write abandoned mid-flight leaves the caller unable to say whether it
 * happened, which is worse than waiting.
 *
 * 🔑 THE `console.error`-AND-RETHROW WRAPPERS ARE GONE from all five. They reported each failure
 * twice — here, where nothing can act on it, and again at the caller, which is the only place
 * that can render a state (EH-D10). Nothing is swallowed; every method still rejects.
 */
export const memberService = {
  getMembers: () =>
    requestJson((signal) => fetch(apiUrl('/api/members'), {
      credentials: 'include',
      signal,
    })),

  getPageSize: () => PAGE_SIZE,

  updateMember: (updatedMember) =>
    requestJsonWrite((signal) => fetch(apiUrl(`/api/members/${updatedMember.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updatedMember),
      signal,
    })),

  // Banking fields only (PATCH).
  updateBanking: (id, banking) =>
    requestJsonWrite((signal) => fetch(apiUrl(`/api/members/${id}/banking`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(banking),
      signal,
    })),

  getMemberById: (id) =>
    requestJson((signal) => fetch(apiUrl(`/api/members/${id}`), {
      credentials: 'include',
      signal,
    })),

  createMember: (member) =>
    requestJsonWrite((signal) => fetch(apiUrl('/api/members'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(member),
      signal,
    })),

  /**
   * 🔴 A50: THE SERVER ANSWERS A SENT LETTER WITH AN EMPTY 200 (`ResponseEntity.ok().build()`). Read as JSON, a letter
   * that WAS emailed rejected as a failure -- and a second press emailed the member twice. `allowEmpty` resolves
   * exactly that, while a body that is not JSON (a proxy's HTML page) still rejects: see memberService.sendWelcome.test.
   */
  sendWelcomeLetter: (id) =>
    requestJsonWrite((signal) => fetch(apiUrl(`/api/members/${id}/send-welcome`), {
      method: 'POST',
      credentials: 'include',
      signal,
    }), { allowEmpty: true }),
};
