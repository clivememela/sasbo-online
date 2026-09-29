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
 *
 * 🔑 EACH READ IS ALSO ITS OWN NAMED EXPORT, so a screen that needs two lists ships two reads and not nine: an object
 * literal's unused methods are never shaken out of a bundle, and the first screen (`02.3`) reads only the areas and
 * the regions. `referenceService` is the same reads, gathered, for everything that iterates the service layer.
 */
export const getRegions = () =>
  requestJson((signal) => fetch(apiUrl('/api/reference/regions'), { credentials: 'include', signal }));

export const getAreas = () =>
  requestJson((signal) => fetch(apiUrl('/api/reference/areas'), { credentials: 'include', signal }));

export const getEmployerGroups = () =>
  requestJson((signal) => fetch(apiUrl('/api/reference/employer-groups'), { credentials: 'include', signal }));

export const getEmployers = () =>
  requestJson((signal) => fetch(apiUrl('/api/reference/employers'), { credentials: 'include', signal }));

export const getTableCodes = () =>
  requestJson((signal) => fetch(apiUrl('/api/reference/table-codes'), { credentials: 'include', signal }));

export const getCommitteeProvinces = () =>
  requestJson((signal) => fetch(apiUrl('/api/reference/committee-provinces'), { credentials: 'include', signal }));

export const getCommittees = () =>
  requestJson((signal) => fetch(apiUrl('/api/reference/committees'), { credentials: 'include', signal }));

export const getSuspensionCodes = () =>
  requestJson((signal) => fetch(apiUrl('/api/reference/suspension-codes'), { credentials: 'include', signal }));

/** How many rows each list holds here, and why none where none is (ME-18, ME-19). */
export const getStatus = () =>
  requestJson((signal) => fetch(apiUrl('/api/reference/status'), { credentials: 'include', signal }));

export const referenceService = {
  getRegions,
  getAreas,
  getEmployerGroups,
  getEmployers,
  getTableCodes,
  getCommitteeProvinces,
  getCommittees,
  getSuspensionCodes,
  getStatus,
};
