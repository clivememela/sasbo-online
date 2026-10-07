import { apiUrl } from './api';
import { requestJson, requestJsonWrite } from './parseApiError';

/**
 * Month end's reads and its one job -- `04.1` to `04.10`, under `/api/month-end`.
 *
 *   `getMonths()`                 `{ openMonth, taken: [{ month, state, takenAt, takenBy }] }` -- the month the server
 *                                 says it is, and every month taken, with when and by whom (MD55: the browser's clock
 *                                 decides nothing about a month).
 *   the seven statistics          `MonthEndStatisticDto` -- `{ statistic, legacy, month, state, takenAt, takenBy, area,
 *                                 region, workplacesServed, sheets, notes }`, each sheet `{ key, title, legacyTitle,
 *                                 columns, rows, total }`. A taken month is read as it was frozen, the open month live;
 *                                 a past month never taken is `MONTH_NOT_TAKEN`.
 *   `askPack(month)`              the statistics pack, a JOB: 202 with a new pack `PREPARING`, or 200 with the one in
 *                                 hand; another month's pack in preparation is `PACK_BUSY`.
 *   `getPack(id)`                 the pack as the screen polls it, until `READY` or `FAILED`.
 *   `packWorkbookUrl(id, name)`   where one workbook of a READY pack is saved from -- an `.xlsx` attachment, fetched
 *                                 by the browser from a link, never by a script.
 *
 * 🔑 ONE TYPED ROUTE A STATISTIC (MD41), each a named export with its path written at its call site, where the API
 * contract scan and the stub server's drift check can read it -- and so a screen ships the reads it imports and no
 * other. The listings (`/{month}/listings/{listing}`) are NOT here: they refuse every caller, so the page says so
 * without asking (04.1). Since the October build (`contracts/monthend-api.md` R4, R5):
 *
 *   `takeMonth(month, { replaces, reason })`  the take, held by `MONTH_END_TAKE` -- a take again names the take it
 *                                 replaces and says why (Stephne, MEN-10, MEN-11);
 *   `getSuspendedMembers(query)`  everyone suspended now, the oldest suspension first, a page at a time -- and
 *   `getLapsedSuspensions(query)` those three months on (MEN-18). Both name members: held by `MEMBERS_VIEW` and
 *                                 `MONTH_END_VIEW`, and scoped by the caller's region or area.
 *
 * The month travels encoded: it arrives from an address a person can type, and a path segment is not the place for
 * whatever they typed. A malformed month is the server's to refuse (`REQUEST_MALFORMED`), in its own words.
 */

/** A statistic's place: an area's letter or a region's code, one or the other; neither is all of SASBO. */
const placeQuery = ({ area, region } = {}) => {
  const query = new URLSearchParams();
  if (area) query.set('area', area);
  else if (region) query.set('region', region);
  const text = query.toString();
  return text ? `?${text}` : '';
};

const read = (url) => requestJson((signal) => fetch(url, { credentials: 'include', signal }));

export const getMonths = () => read(apiUrl('/api/month-end/months'));

/** 04.3: the month's new and deleted members, by area, core and other; the month and the year to date. */
export const getNewAndDeleted = (month, place) =>
  read(apiUrl(`/api/month-end/${encodeURIComponent(month)}/new-and-deleted`) + placeQuery(place));

/** 04.4: membership by group and by table code, how it is collected, the suspended by code. */
export const getMembership = (month, place) =>
  read(apiUrl(`/api/month-end/${encodeURIComponent(month)}/membership`) + placeQuery(place));

/** 04.5: why members left -- by SASBO's deletion codes, joined and left, and the reason a resigner gave. */
export const getLeavers = (month, place) =>
  read(apiUrl(`/api/month-end/${encodeURIComponent(month)}/leavers`) + placeQuery(place));

/** 04.6: the branches and their penetration, by area and by employer. */
export const getBranches = (month, place) =>
  read(apiUrl(`/api/month-end/${encodeURIComponent(month)}/branches`) + placeQuery(place));

/** 04.7: recruitment -- by recruiter, by table code, by channel. */
export const getRecruitment = (month, place) =>
  read(apiUrl(`/api/month-end/${encodeURIComponent(month)}/recruitment`) + placeQuery(place));

/** 04.8: representatives and committee members, by table code. */
export const getRepresentatives = (month, place) =>
  read(apiUrl(`/api/month-end/${encodeURIComponent(month)}/representatives`) + placeQuery(place));

/** 04.9: the branches due a visit -- each with its last visit, the longest unvisited first. */
export const getVisits = (month, place) =>
  read(apiUrl(`/api/month-end/${encodeURIComponent(month)}/visits`) + placeQuery(place));

/** R5: the suspended, by bank and code, by code, and by the reason for no payroll deduction (Stephne, MEN-18). */
export const getSuspensions = (month, place) =>
  read(apiUrl(`/api/month-end/${encodeURIComponent(month)}/suspensions`) + placeQuery(place));

/** The eight reads by the statistic's route name -- the key the screen's address carries. */
export const STATISTIC_READS = Object.freeze({
  'new-and-deleted': getNewAndDeleted,
  membership: getMembership,
  leavers: getLeavers,
  branches: getBranches,
  recruitment: getRecruitment,
  representatives: getRepresentatives,
  visits: getVisits,
  suspensions: getSuspensions,
});

/** The suspended lists' query: a page, and an employer (its id) or a suspension code (its number) where one is chosen. */
const suspendedQuery = ({ page = 0, size = 50, employer, code } = {}) => {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (employer) query.set('employer', String(employer));
  if (code) query.set('code', String(code));
  return query;
};

export const getSuspendedMembers = (filters) =>
  read(apiUrl(`/api/month-end/suspensions/members?${suspendedQuery(filters)}`));

export const getLapsedSuspensions = (filters) =>
  read(apiUrl(`/api/month-end/suspensions/lapsed?${suspendedQuery(filters)}`));

/**
 * R4: takes the month -- or, with `replaces` (the month's newest take, `takeId`), takes it again, which needs `reason`.
 * A write, at the write ceiling.
 */
export const takeMonth = (month, { replaces, reason } = {}) =>
  requestJsonWrite((signal) => fetch(apiUrl(`/api/month-end/${encodeURIComponent(month)}/take`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ ...(replaces != null && { replaces }), ...(reason && { reason }) }),
    signal,
  }));

/** 04.10: ask for the month's statistics pack -- a write, at the write ceiling; it sends no body. */
export const askPack = (month) =>
  requestJsonWrite((signal) => fetch(apiUrl(`/api/month-end/${encodeURIComponent(month)}/pack`), {
    method: 'POST',
    credentials: 'include',
    signal,
  }));

/** A pack as the screen polls it. */
export const getPack = (id) => read(apiUrl(`/api/month-end/packs/${encodeURIComponent(id)}`));

/**
 * Where one workbook of a READY pack is saved from. A link's address, not a request: nothing here fetches, so it is
 * not a method of `monthEndService`, which the error contract calls one by one.
 */
export const packWorkbookUrl = (id, workbook) =>
  apiUrl(`/api/month-end/packs/${encodeURIComponent(id)}/${encodeURIComponent(workbook)}`);

/** The same reads, gathered, for everything that iterates the service layer -- these very functions, never copies. */
export const monthEndService = {
  getMonths,
  getNewAndDeleted,
  getMembership,
  getLeavers,
  getBranches,
  getRecruitment,
  getRepresentatives,
  getVisits,
  getSuspensions,
  getSuspendedMembers,
  getLapsedSuspensions,
  takeMonth,
  askPack,
  getPack,
};
