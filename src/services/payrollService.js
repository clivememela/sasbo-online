import { apiUrl } from './api';
import { WRITE_CEILING_MS, requestJson, requestJsonWrite } from './parseApiError';

/**
 * Payroll Deductions and Reconciliation, under `/api/payroll` (`C:/tmp/sasbo-work/oct/contracts/payroll-api.md`).
 *
 * Reads need `PAYROLL_VIEW` or `PAYROLL_PROCESS`, writes `PAYROLL_PROCESS`; the sign-in stream's `fetch` wrapper puts
 * the token on every call here, so nothing below names it. Amounts travel as decimal strings (`"174.00"`), months as
 * `YYYY-MM`, instants as ISO strings; lists are pages of `{ content, page, size, totalElements, totalPages }`.
 *
 *   reads      the vocabulary (types, outcome labels, limits), the employers, the files (paged), a file's summary, its
 *              lines and its discrepancies (paged), a discrepancy with every note, a file's query lists
 *   writes     load a file (multipart) or type its lines in, compare it again (new columns), raise its query list,
 *              note and resolve a discrepancy, record a payment
 *   downloads  the discrepancies list and the full report (`xlsx` | `pdf`), and an employer's query list -- password
 *              protected, because it leaves SASBO (POPIA). Fetched, never linked: the token travels on a `fetch`. Each
 *              resolves `{ blob, filename }` for `lib/saveFile.js`.
 *
 * Every id and filter travels encoded; what a person typed in an address is the server's to refuse, in its own words.
 */

/** The page size every payroll list asks for -- the server's default, and well under its cap of 100. */
export const PAGE_SIZE = 20;

/** `?a=1&b=2`, leaving out anything not given. */
const queryOf = (params) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
};

/**
 * The deadline's signal and the person's Cancel as one: either stops the request. `AbortSignal.any` where the browser
 * has it; otherwise the same thing by hand.
 */
const either = (deadline, cancel) => {
  if (!cancel) return deadline;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([deadline, cancel]);
  const both = new AbortController();
  const stop = () => both.abort();
  if (deadline.aborted || cancel.aborted) stop();
  deadline.addEventListener('abort', stop, { once: true });
  cancel.addEventListener('abort', stop, { once: true });
  return both.signal;
};

const read = (url) => requestJson((signal) => fetch(url, { credentials: 'include', signal }));

/** A POST with a JSON body -- or with none at all, which then claims no content type. */
const post = (url, body, cancel) => requestJsonWrite((signal) => fetch(url, {
  method: 'POST',
  ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  credentials: 'include',
  signal: either(signal, cancel),
}));

/** A download is made on request, so it gets the write ceiling; the deadline still covers its body. */
const download = (url, init = {}) =>
  requestJson((signal) => fetch(url, { credentials: 'include', ...init, signal }), { file: true, timeoutMs: WRITE_CEILING_MS });

const id = (value) => encodeURIComponent(value);

/* ── reads ── */

/** Route 1: the discrepancy types with their labels and what to do, every outcome's label, and the limits. */
export const getVocabulary = () => read(apiUrl('/api/payroll/vocabulary'));

/** Route 2: the employers that send a payroll file (about sixteen; not paged). */
export const getEmployers = () => read(apiUrl('/api/payroll/employers'));

/** Route 4: the files, newest month first -- the one place every administrator reaches them (PAY-32). */
export const getFiles = ({ employerId, period, status } = {}, page = 0, size = PAGE_SIZE) =>
  read(apiUrl('/api/payroll/files') + queryOf({ employerId, period, status, page, size }));

/** Route 7: a file's summary -- counts, totals, the payment check, its columns, its queries. */
export const getFile = (fileId) => read(apiUrl(`/api/payroll/files/${id(fileId)}`));

/** Route 8: the file's lines, each with its match; `show` is ALL, MATCHED, NOT_MATCHED or UNREADABLE. */
export const getRows = (fileId, show, page = 0, size = PAGE_SIZE) =>
  read(apiUrl(`/api/payroll/files/${id(fileId)}/rows`) + queryOf({ show, page, size }));

/** Route 9: the file's discrepancies, by type and status. */
export const getDiscrepancies = (fileId, { type, status } = {}, page = 0, size = PAGE_SIZE) =>
  read(apiUrl(`/api/payroll/files/${id(fileId)}/discrepancies`) + queryOf({ type, status, page, size }));

/** Route 18: one discrepancy, with every note. */
export const getDiscrepancy = (discrepancyId) => read(apiUrl(`/api/payroll/discrepancies/${id(discrepancyId)}`));

/** Route 14: the file's query lists, each with its lines. */
export const getQueries = (fileId) => read(apiUrl(`/api/payroll/files/${id(fileId)}/queries`));

/* ── writes ── */

/**
 * Route 5: loads an employer's file and compares it, in one request. `replace` and `columnMapping` are sent only when
 * the administrator chose them. The same bytes loaded again answer `alreadyLoaded: true`, so a retry after a timeout
 * loads nothing twice. `cancel` is the screen's Cancel: it stops the waiting, which cannot stop a server that already
 * has the file.
 */
export const uploadFile = ({ file, employerId, period, replace = false, columnMapping = null } = {}, { cancel } = {}) => {
  const form = new FormData();
  if (file) form.append('file', file);
  form.append('employerId', String(employerId ?? ''));
  form.append('period', String(period ?? ''));
  if (replace) form.append('replace', 'true');
  if (columnMapping) form.append('columnMapping', JSON.stringify(columnMapping));
  // No Content-Type: the browser writes the multipart boundary itself.
  return requestJsonWrite((signal) => fetch(apiUrl('/api/payroll/files'), {
    method: 'POST',
    credentials: 'include',
    body: form,
    signal: either(signal, cancel),
  }));
};

/** Route 6: a file whose lines were typed in from a PDF or a picture (PAY-03). */
export const typeInFile = ({ employerId, period, statedTotal = null, rows = [] } = {}, { cancel } = {}) =>
  post(apiUrl('/api/payroll/files/typed'), { employerId, period, statedTotal, rows }, cancel);

/** Route 10: compares the file again -- against the members as they are now, and with new columns when given. */
export const compareAgain = (fileId, { version, columnMapping = null } = {}) =>
  post(apiUrl(`/api/payroll/files/${id(fileId)}/reconcile`), { version, columnMapping });

/** Route 13: puts every open discrepancy with a query action on a new query list for the employer. */
export const raiseQueries = (fileId) => post(apiUrl(`/api/payroll/files/${id(fileId)}/queries`));

/** Route 19: a note on a discrepancy -- what was done or found. */
export const addNote = (discrepancyId, text) => post(apiUrl(`/api/payroll/discrepancies/${id(discrepancyId)}/notes`), { text });

/** Route 20: resolves a discrepancy with an outcome and a note; `version` is the one last read. */
export const resolveDiscrepancy = (discrepancyId, { outcome, note, version } = {}) =>
  post(apiUrl(`/api/payroll/discrepancies/${id(discrepancyId)}/resolve`), { outcome, note, version });

/** Route 21: money an employer paid in for a month; the month's file is checked again (PAY-28). */
export const recordPayment = ({ employerId, period, amount, receivedOn, reference = null } = {}) =>
  post(apiUrl('/api/payroll/payments'), { employerId, period, amount, receivedOn, reference });

/* ── downloads ── */

/**
 * The file as it arrived (`GET /files/{id}/content`, on the server beside route 7; not yet in the contract's table):
 * the one place administrators reach every employer's file (PAY-32). Gone with the lines once the file is a year old.
 */
export const downloadOriginal = (fileId) => download(apiUrl(`/api/payroll/files/${id(fileId)}/content`));

/** Route 11: the file's discrepancies list, `xlsx` or `pdf`. */
export const downloadDiscrepancies = (fileId, format) =>
  download(apiUrl(`/api/payroll/files/${id(fileId)}/reports/discrepancies`) + queryOf({ format }));

/** Route 12: the full report -- matched, not matched, missing and the totals -- in IT's report's shape (PAY-11). */
export const downloadFullReport = (fileId, format) =>
  download(apiUrl(`/api/payroll/files/${id(fileId)}/reports/full`) + queryOf({ format }));

/** Route 16: an employer's query list, protected by the password the administrator chose. Sent once, never kept. */
export const downloadQuery = (queryId, { format, password } = {}) =>
  download(apiUrl(`/api/payroll/queries/${id(queryId)}/download`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, password }),
  });

/** The calls, gathered, for everything that iterates the service layer -- these very functions, never copies. */
export const payrollService = {
  getVocabulary,
  getEmployers,
  getFiles,
  getFile,
  getRows,
  getDiscrepancies,
  getDiscrepancy,
  getQueries,
  uploadFile,
  typeInFile,
  compareAgain,
  raiseQueries,
  addNote,
  resolveDiscrepancy,
  recordPayment,
  downloadOriginal,
  downloadDiscrepancies,
  downloadFullReport,
  downloadQuery,
};

/** A refusal's stable code and its details, or `null` -- the sentence is the error's own `message`. */
export const payrollRefusalOf = (error) => {
  const code = error?.body?.code;
  return typeof code === 'string' ? { code, details: error.body.details ?? {} } : null;
};
