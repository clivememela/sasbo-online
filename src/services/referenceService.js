import { apiUrl } from './api';
import { requestJson } from './parseApiError';

/**
 * SASBO's lists -- month end 01.1. One typed route a list (MD41): no name of a list travels in an address, so each
 * read is a method of its own with its path written at its call site, where the API-contract scan can see it.
 *
 * Every answer is `{ list, printedOn, confirmedOn, reason, rows }`: the rows in the server's order, the day the
 * report they were read from was printed, the day SASBO confirmed them (empty until she has, MD28), and -- where no
 * row is -- why, in one of the four words `LIST_EMPTY_REASON` gives a sentence to.
 *
 * Every method goes through `requestJson`, the one error path (conventions §16). A list is asked for when the control
 * that shows it is opened, and kept for the visit -- never at first paint (MD69).
 */
export const referenceService = {
  getRegions: () =>
    requestJson((signal) => fetch(apiUrl('/api/reference/regions'), { credentials: 'include', signal })),

  getAreas: () =>
    requestJson((signal) => fetch(apiUrl('/api/reference/areas'), { credentials: 'include', signal })),

  getEmployerGroups: () =>
    requestJson((signal) => fetch(apiUrl('/api/reference/employer-groups'), { credentials: 'include', signal })),

  getEmployers: () =>
    requestJson((signal) => fetch(apiUrl('/api/reference/employers'), { credentials: 'include', signal })),

  getTableCodes: () =>
    requestJson((signal) => fetch(apiUrl('/api/reference/table-codes'), { credentials: 'include', signal })),

  getCommitteeProvinces: () =>
    requestJson((signal) => fetch(apiUrl('/api/reference/committee-provinces'), { credentials: 'include', signal })),

  getCommittees: () =>
    requestJson((signal) => fetch(apiUrl('/api/reference/committees'), { credentials: 'include', signal })),

  getSuspensionCodes: () =>
    requestJson((signal) => fetch(apiUrl('/api/reference/suspension-codes'), { credentials: 'include', signal })),

  /** How many rows each list holds here, and why none where none is (ME-18, ME-19). */
  getStatus: () =>
    requestJson((signal) => fetch(apiUrl('/api/reference/status'), { credentials: 'include', signal })),
};
