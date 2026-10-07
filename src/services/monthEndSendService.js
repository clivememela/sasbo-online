import { apiUrl } from './api';
import { WRITE_CEILING_MS, requestJson, requestJsonWrite } from './parseApiError';

/**
 * SENDING THE MONTH -- the regions' packs, the banks' and providers' files, and the record of what went to whom, under
 * `/api/month-end` (the October build's contract, `contracts/monthend-api.md`; Stephne's Month end answers, 6 Oct).
 * Every route here is held by `MONTH_END_SEND`, and a pack or a file is made only from a TAKEN month.
 *
 *   `getRegionPacks(month)`            `MonthEndRegionPacksDto` -- the month's take, whether mail is set up, and one row
 *                                      a recipient in the caller's scope: the set, its pack or `null`, its deliveries.
 *   `produceRegionPack(month, set)`    201 a new pack, or 200 the one in hand (a double click produces nothing twice);
 *                                      `{ again: true }` makes a new one beside it.
 *   `downloadRegionPack(id, format)`   the pack as a file -- `pdf` or `xlsx` -- recorded as a download.
 *   `emailRegionPack(id, formats)`     e-mails the recipient; every attempt is recorded, refused or not.
 *   `emailRegionPacks(month, sets, formats)`  one call for many recipients, each with its own result.
 *   `getFiles(month)`                  `MonthEndFilesDto` -- the banks' and providers' files (scope ALL).
 *   `produceBankFile` / `produceProviderFile`  201 `{ file, password, passwordNote }`: the password is in this answer
 *                                      ONLY -- never stored, never logged, here or on the server.
 *   `downloadFile(id)`                 the encrypted file, recorded as a download.
 *   `sendFileBySftp(id)`               a provider's file onto its SFTP server (Law Call) -- refused where none is set.
 *   `getDeliveries(month, page, size)` what was sent, newest first, a page at a time.
 *
 * 🔑 A FILE IS FETCHED, NEVER LINKED: its route is held by a permission, and a link's request carries no session
 * (`requestJson`'s `file`). Each path is written at its call site, where the API contract scan reads it, and the month
 * and every code travel encoded -- they arrive from an address a person can type.
 */

const read = (url) => requestJson((signal) => fetch(url, { credentials: 'include', signal }));

const post = (url, body) => requestJsonWrite((signal) => fetch(url, {
  method: 'POST',
  credentials: 'include',
  ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  signal,
}));

// A whole bank's list is larger than any answer of JSON here: the write ceiling, as a write's answer has.
const file = (url) =>
  requestJson((signal) => fetch(url, { credentials: 'include', signal }), { file: true, timeoutMs: WRITE_CEILING_MS });

export const getRegionPacks = (month) =>
  read(apiUrl(`/api/month-end/${encodeURIComponent(month)}/region-packs`));

/** Produces the recipient's pack for the month's newest take -- or, with `again`, a new one beside the one in hand. */
export const produceRegionPack = (month, set, { again = false } = {}) =>
  post(apiUrl(`/api/month-end/${encodeURIComponent(month)}/region-packs/${encodeURIComponent(set)}`),
    again ? { again: true } : undefined);

/** `format` is the server's word for it -- `PDF` or `XLSX` -- and the path takes it in small letters. */
export const downloadRegionPack = (id, format) => {
  const kind = String(format).toLowerCase();
  return file(apiUrl(`/api/month-end/region-packs/${encodeURIComponent(id)}/${encodeURIComponent(kind)}`));
};

export const emailRegionPack = (id, formats) =>
  post(apiUrl(`/api/month-end/region-packs/${encodeURIComponent(id)}/email`), { formats });

/** `sets` null is every active recipient in the caller's scope. Never fails as a whole: each set answers for itself. */
export const emailRegionPacks = (month, sets, formats) =>
  post(apiUrl(`/api/month-end/${encodeURIComponent(month)}/region-packs/email`), { sets, formats });

export const getFiles = (month) => read(apiUrl(`/api/month-end/${encodeURIComponent(month)}/files`));

export const produceBankFile = (month, code) =>
  post(apiUrl(`/api/month-end/${encodeURIComponent(month)}/files/banks/${encodeURIComponent(code)}`));

export const produceProviderFile = (month, code) =>
  post(apiUrl(`/api/month-end/${encodeURIComponent(month)}/files/providers/${encodeURIComponent(code)}`));

export const downloadFile = (id) => file(apiUrl(`/api/month-end/files/${encodeURIComponent(id)}`));

export const sendFileBySftp = (id) => post(apiUrl(`/api/month-end/files/${encodeURIComponent(id)}/sftp`));

export const getDeliveries = (month, page = 0, size = 50) => {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  return read(apiUrl(`/api/month-end/${encodeURIComponent(month)}/deliveries?${query}`));
};

/** The same calls, gathered, for everything that iterates the service layer -- these very functions, never copies. */
export const monthEndSendService = {
  getRegionPacks,
  produceRegionPack,
  downloadRegionPack,
  emailRegionPack,
  emailRegionPacks,
  getFiles,
  produceBankFile,
  produceProviderFile,
  downloadFile,
  sendFileBySftp,
  getDeliveries,
};
