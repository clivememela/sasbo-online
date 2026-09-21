import { apiUrl } from './api';
import { requestJson, requestJsonWrite } from './parseApiError';

/**
 * The A.C.B. debit-order run — `/api/acb/runs`.
 *
 * Every list is a server-side page, `{ content, page, size, totalElements, totalPages }`, with a
 * 0-based `page`; the server caps `size`. Preparing answers 202 with the run `PREPARING`: the
 * preparation is a job, and the screen polls `get` until the run settles. Approving is not here —
 * the server refuses it to every caller until the API knows who is calling (register B1).
 */
const pageQuery = (page, size) => new URLSearchParams({ page: String(page), size: String(size) });

export const acbRunService = {
    list: (page = 0, size = 12) =>
        requestJson((signal) => fetch(apiUrl(`/api/acb/runs?${pageQuery(page, size)}`), {
            credentials: 'include',
            signal,
        })),

    /** `actionMonth` is `YYYY-MM`. Answers the run as created -- `PREPARING`. */
    prepare: (actionMonth) =>
        requestJsonWrite((signal) => fetch(apiUrl('/api/acb/runs'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ actionMonth }),
            signal,
        })),

    get: (id) =>
        requestJson((signal) => fetch(apiUrl(`/api/acb/runs/${id}`), {
            credentials: 'include',
            signal,
        })),

    lines: (id, page = 0, size = 50) =>
        requestJson((signal) => fetch(apiUrl(`/api/acb/runs/${id}/lines?${pageQuery(page, size)}`), {
            credentials: 'include',
            signal,
        })),

    exclusions: (id, page = 0, size = 50) =>
        requestJson((signal) => fetch(apiUrl(`/api/acb/runs/${id}/exclusions?${pageQuery(page, size)}`), {
            credentials: 'include',
            signal,
        })),

    /**
     * The holiday calendar -- its name, the date it is known until, and whether that date is near --
     * and one year of it: this year's unless `year` is given (D30). Public, and read-only here: the
     * server refuses its writes to every caller until the API knows who is calling (B1).
     */
    holidayCalendar: (year) =>
        requestJson((signal) => fetch(apiUrl(`/api/acb/holidays${year == null ? '' : `?${new URLSearchParams({ year: String(year) })}`}`), {
            credentials: 'include',
            signal,
        })),

    /** Withdraws a prepared or approved run. `version` is the one the screen was showing. */
    cancel: (id, version, reason) =>
        requestJsonWrite((signal) => fetch(apiUrl(`/api/acb/runs/${id}/cancel`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ version, reason }),
            signal,
        })),
};

/**
 * The server's refusal, read off a rejection: its stable `code` and the facts it carries (a run's
 * `status` and `version`, a month). `null` when the error is not an A.C.B. refusal -- a timeout,
 * a lost connection, any other server error.
 */
export const acbRefusalOf = (error) => {
    const code = error?.body?.code;
    return typeof code === 'string' ? { code, details: error.body.details ?? {} } : null;
};
