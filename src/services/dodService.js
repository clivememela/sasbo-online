import { apiUrl } from './api';
import { requestJson, requestJsonWrite } from './parseApiError';

/**
 * Debit Order Deductions -- what the October build opened on `/api/acb` (`contracts/dod-api.md`): the run's steps
 * after preparing, the bank's returns by debit day, suspensions and endings, the bank codes, the settings, unpaid
 * counts captured by hand, and the letters. `acbRunService` keeps the reads and writes that were open before sign-in.
 *
 * Every path is written at its own call site, where the API contract scan reads it. A run's step carries the
 * `version` the screen was showing: a stale one is refused `RUN_VERSION_CONFLICT`, never applied.
 */
const send = (method, body) => ({
  method,
  credentials: 'include',
  ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
});

const pageQuery = (page, size) => new URLSearchParams({ page: String(page), size: String(size) });

const write = (url, method, body) => requestJsonWrite((signal) => fetch(url, { ...send(method, body), signal }));
const read = (url) => requestJson((signal) => fetch(url, { credentials: 'include', signal }));
// A download: `{ blob, filename }`, the deadline covering the body, and a proxy's HTML page refused as the file.
const download = (url) => requestJson((signal) => fetch(url, { credentials: 'include', signal }), { file: true });

export const dodService = {
  // ---- the run's steps (dod-api §2) -------------------------------------------------------------------------------
  approve: (id, version) => write(apiUrl(`/api/acb/runs/${id}/approve`), 'POST', { version }),
  /** The bank file, CFO only (DOD-11). Every download is counted on the run and audited. */
  runFile: (id) => download(apiUrl(`/api/acb/runs/${id}/file`)),
  submitted: (id, version) => write(apiUrl(`/api/acb/runs/${id}/submitted`), 'POST', { version }),
  /** `reason` is one of the server's decline reasons; `bankWords` the bank's own, at most 300 characters. */
  declined: (id, version, reason, bankWords) =>
    write(apiUrl(`/api/acb/runs/${id}/declined`), 'POST', { version, reason, bankWords: bankWords || undefined }),
  returned: (id, version) => write(apiUrl(`/api/acb/runs/${id}/returned`), 'POST', { version }),
  close: (id, version) => write(apiUrl(`/api/acb/runs/${id}/close`), 'POST', { version }),

  // ---- the bank's returns, one report per debit day (dod-api §3) --------------------------------------------------
  debitDays: (id) => read(apiUrl(`/api/acb/runs/${id}/debit-days`)),
  /** `batch` is `{ actionDate, reportDate?, entries: [{ fileSequence | lineId, code, decision? }] }`, all or nothing. */
  recordReturns: (id, batch) => write(apiUrl(`/api/acb/runs/${id}/returns`), 'POST', batch),
  returnsBatches: (id, page = 0, size = 20) => read(apiUrl(`/api/acb/runs/${id}/returns/batches?${pageQuery(page, size)}`)),

  // ---- suspensions and endings (dod-api §4; reactivating and rejoining are the member record's, MEMBERS_EDIT) -----
  /** `suspensionCode` is SASBO's; the server finds it from the bank's code unless one is sent. */
  suspendMember: (id, lineId, { suspensionCode, note } = {}) =>
    write(apiUrl(`/api/acb/runs/${id}/lines/${lineId}/suspend-member`), 'POST', { suspensionCode, note }),
  /** Confirms one ending after the third unpaid (DOD-22); the request has no body (dod-api v2 §4). */
  terminate: (memberId) => write(apiUrl(`/api/acb/termination-report/${memberId}/terminate`), 'POST'),

  // ---- unpaid counts captured by hand, and the opening position (dod-api §5) -------------------------------------
  unpaidCounts: (page = 0, size = 50) => read(apiUrl(`/api/acb/unpaid-counts?${pageQuery(page, size)}`)),
  captureUnpaidCounts: (source, entries) => write(apiUrl('/api/acb/unpaid-counts'), 'PUT', { source, entries }),
  openingPosition: () => read(apiUrl('/api/acb/opening-position')),
  /** The sheet itself is the body, never a form: the server reads at most 1 MB of `.xlsx`. */
  uploadOpeningPosition: (file) => requestJsonWrite((signal) => fetch(apiUrl('/api/acb/opening-position'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    body: file,
    signal,
  })),

  // ---- letters (dod-api §6) ---------------------------------------------------------------------------------------
  /** A specimen PDF of one letter, invented from the address to the account (public). */
  letterSpecimen: (template) => download(apiUrl(`/api/acb/letters/specimen/${template}`)),

  // ---- settings (dod-api §7) --------------------------------------------------------------------------------------
  codes: () => read(apiUrl('/api/acb/codes')),
  updateCode: (bankCode, change) => write(apiUrl(`/api/acb/codes/${encodeURIComponent(bankCode)}`), 'PUT', change),
  addCode: (code) => write(apiUrl('/api/acb/codes'), 'POST', code),
  addDay: (date, name, kind) => write(apiUrl('/api/acb/holidays'), 'POST', { date, name, kind }),
  removeDay: (date) => write(apiUrl(`/api/acb/holidays/${encodeURIComponent(date)}`), 'DELETE'),
  knownUntil: (date) => write(apiUrl('/api/acb/calendar/known-until'), 'POST', { knownUntil: date }),
  calendarSettings: (bankClosuresCount) => write(apiUrl('/api/acb/calendar/settings'), 'PUT', { bankClosuresCount }),
  addRate: (effectiveFrom, amount, source) => write(apiUrl('/api/acb/rates'), 'POST', { effectiveFrom, amount, source }),
  banks: () => read(apiUrl('/api/acb/banks')),
  /** What moving the bank's members to `day` would do. Nothing changes. */
  previewMove: (bankId, day) => {
    // Built before `apiUrl`, as `holidayCalendar`'s is: the contract scan reads the literal it is given.
    const query = new URLSearchParams({ day: String(day) });
    return read(apiUrl(`/api/acb/banks/${bankId}/debit-day-move?${query}`));
  },
  /** The move itself, refused `MOVE_COUNT_CHANGED` when the bank's members changed since the preview. */
  move: (bankId, newDay, expectedCount) =>
    write(apiUrl(`/api/acb/banks/${bankId}/debit-day-move`), 'POST', { newDay, expectedCount }),
};
