import { apiUrl } from './api';
import { requestJson } from './parseApiError';

/**
 * All four methods on the one error path (conventions §16), under A14's read ceiling.
 *
 * 🔴 EVERY METHOD HERE THREW AWAY THE SERVER'S MESSAGE. `HTTP ${r.status}: ${r.statusText}` is
 * the shape `parseApiError` exists to remove: `statusText` is the EMPTY STRING over HTTP/2, which
 * every deployment of this application uses, so a failed location search told the user
 * `HTTP 500:` with nothing after the colon while the server's own sentence sat unread in the body.
 *
 * 🔑 AND THE FOUR `console.error`-AND-RETHROW WRAPPERS ARE GONE. They reported the same failure
 * twice — here, where nothing can act on it, and again at the caller, which is the only place
 * that can render a state. EH-D10 gives this application one sink and a service is not it.
 * Nothing is swallowed: each of these still rejects.
 *
 * ⚠️ THE ENDPOINTS STAY AT THEIR CALL SITES, in `apiUrl(...)` literals and template literals, so
 * `apiContract`'s static scan can still see all four. This file was the worked example of that
 * hazard: factoring its paths behind a shared `get(path)` dropped `/api/districts` out of the
 * contract, and `apiContract.test.js` caught it.
 */
export const locationService = {
  search: ({ bankName = '', branch = '', area = '', randomAccessNumber = '' } = {}) => {
    const params = new URLSearchParams({ bankName, branch, area, randomAccessNumber });
    return requestJson((signal) => fetch(apiUrl(`/api/branches?${params}`), {
      credentials: 'include',
      signal,
    }));
  },

  getProvinces: () =>
    requestJson((signal) => fetch(apiUrl('/api/provinces'), {
      credentials: 'include',
      signal,
    })),

  getDistricts: (provinceId) =>
    requestJson((signal) => fetch(apiUrl(`/api/districts?provinceId=${provinceId}`), {
      credentials: 'include',
      signal,
    })),

  getAreas: (districtId) =>
    requestJson((signal) => fetch(apiUrl(`/api/areas?districtId=${districtId}`), {
      credentials: 'include',
      signal,
    })),

  /**
   * Every area, for Capture Member's "Area Recruited" (03.3, R2/RE-3).
   *
   * ⚠️ NOT `getAreas()` with the argument left off. `AreaController.getAll` ignores the query string
   * entirely and answers the whole table, so `getAreas(undefined)` would work today and silently start
   * filtering by the string "undefined" the day somebody gives that endpoint a filter. Two callers with
   * two different needs get two methods; the endpoint literal stays at the call site so
   * `apiContract`'s static scan can still see it.
   */
  getAllAreas: () =>
    requestJson((signal) => fetch(apiUrl('/api/areas'), {
      credentials: 'include',
      signal,
    })),

  /**
   * The organisers' batch print (October build, 5 Oct Show & Tell: "put all the R/A numbers, print them one time"):
   * the workplaces of up to fifty R/A numbers in ONE request -- `GET /api/workplaces/listings?raNumbers=` -- answered
   * `{ asked, listings: [{ workplace, lastVisited }], unknown, workplacesServed, reason }`, in the order asked, the
   * numbers that are no workplace here in `unknown`. Open, as every read of the workplaces is. `RA_NUMBERS_INVALID`
   * for none, more than fifty, or one that is not a number -- the screen reads the numbers first, so it says so before
   * asking. The numbers go comma-separated, as the route reads them.
   */
  getListings: (raNumbers) => {
    const query = new URLSearchParams({ raNumbers: raNumbers.join(',') });
    return requestJson((signal) => fetch(apiUrl(`/api/workplaces/listings?${query}`), {
      credentials: 'include',
      signal,
    }));
  },

  /**
   * The members at one branch, a page at a time -- `GET /api/workplaces/{id}/members?page=&size=`, answered
   * `{ workplaceId, members, page, size, totalElements, totalPages }`. Needs `MEMBERS_VIEW`, and lists only a branch in
   * the caller's region or area (`WORKPLACE_OUT_OF_SCOPE`). The numbers come masked: the employee number as its last
   * four digits, the ID, e-mail and cell as whether there is one.
   */
  getBranchMembers: (workplaceId, page = 0, size = 200) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    return requestJson((signal) => fetch(apiUrl(`/api/workplaces/${encodeURIComponent(workplaceId)}/members?${query}`), {
      credentials: 'include',
      signal,
    }));
  },
};
