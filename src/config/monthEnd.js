/**
 * Month end's vocabulary as the browser holds it -- the codes it ACTS ON and the words it shows for the server's
 * words. Held to the server's own list, `api-vocabulary.json` under `monthEnd`, by `monthEnd.test.js`: a word the
 * server adds reddens that file instead of reaching a screen as a word nobody wrote a sentence for.
 *
 * THE SENTENCE A PERSON READS ON A REFUSAL IS THE SERVER'S `message` (ME-13). The browser keeps only the codes it
 * branches on, and shows a code it has never heard of as the server wrote it.
 */
import { formatInt } from '../lib/format.js';

/** The refusal codes the screens branch on (ME-13) -- each one the server publishes. */
export const MONTH_END_REFUSAL = Object.freeze({
  REQUEST_MALFORMED: 'REQUEST_MALFORMED',
  WORKPLACE_PAGE_INVALID: 'WORKPLACE_PAGE_INVALID',
  // A change of status (03.1): the member moved since the screen read it -- re-read, and say so; the member is gone;
  // the code chosen left SASBO's list since the dialog loaded it -- load the list again.
  STATUS_CHANGED_SINCE: 'STATUS_CHANGED_SINCE',
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  DELETION_CODE_UNKNOWN: 'DELETION_CODE_UNKNOWN',
  SUSPENSION_CODE_UNKNOWN: 'SUSPENSION_CODE_UNKNOWN',
});

/**
 * What a status IS (03.2): leaving, suspended, or neither. **A figure reads a status's kind, never its spelling** --
 * no status is renamed before SASBO's table, and a figure that counted by spelling would break the day one is.
 */
export const STATUS_KIND = Object.freeze({
  LEAVING: 'LEAVING',
  SUSPENDED: 'SUSPENDED',
  NEITHER: 'NEITHER',
});

/** The six statuses and the kind of each, in the server's order (`memberStatuses`). */
export const MEMBER_STATUS_KIND = Object.freeze({
  Active: STATUS_KIND.NEITHER,
  Pending: STATUS_KIND.NEITHER,
  Suspended: STATUS_KIND.SUSPENDED,
  Resigned: STATUS_KIND.LEAVING,
  Retired: STATUS_KIND.LEAVING,
  Terminated: STATUS_KIND.LEAVING,
});

/** A status's kind -- `null` for a status the browser has never heard of, which no figure may guess at. */
export const statusKind = (status) => MEMBER_STATUS_KIND[status] ?? null;

/** The reasons a person's change of status carries (03.1). ACB's two, and capture's, are never sent from a screen. */
export const STATUS_REASON = Object.freeze({
  DELETION_CODE: 'DELETION_CODE',
  SUSPENSION_CODE: 'SUSPENSION_CODE',
  REINSTATED: 'REINSTATED',
});

/**
 * The reason a change INTO a status carries, as the server judges it -- by the status's kind and no finer, until
 * SASBO's table (MM49): into a leaving status SASBO's deletion code, into Suspended its suspension code, into any
 * other a reinstatement. `null` for a status the browser does not know.
 */
export const reasonFor = (toStatus) => {
  switch (statusKind(toStatus)) {
    case STATUS_KIND.LEAVING: return STATUS_REASON.DELETION_CODE;
    case STATUS_KIND.SUSPENDED: return STATUS_REASON.SUSPENSION_CODE;
    case STATUS_KIND.NEITHER: return STATUS_REASON.REINSTATED;
    default: return null;
  }
};

/**
 * SASBO's deletion codes as a person chooses one (03.3): each numbered code with its number and name, and the five
 * reasons SASBO keeps under code 2 -- *Resigned Society* -- which have no number of their own. `rows` is the list as
 * the server answers it (`{ code, name, under? }`); a row with neither a number nor a code above it is left out
 * rather than offered as a code nobody can send.
 */
export const deletionCodeOptions = (rows) => {
  const numbered = rows.filter((row) => Number.isInteger(row.code));
  return numbered.map((row) => ({
    code: row.code,
    label: `${row.code} · ${row.name}`,
    under: rows.filter((sub) => !Number.isInteger(sub.code) && sub.under === row.code).map((sub) => sub.name),
  }));
};

/** SASBO's suspension codes as a person chooses one: each with its number and name. */
export const suspensionCodeOptions = (rows) => rows
  .filter((row) => Number.isInteger(row.code))
  .map((row) => ({ code: row.code, label: `${row.code} · ${row.name}` }));

/**
 * Why one of SASBO's lists -- or the workplaces -- has nothing to show here (ME-19): one sentence for each of the
 * server's four words, so that a screen says why instead of showing an empty control.
 */
export const LIST_EMPTY_REASON = Object.freeze({
  NOT_CONFIRMED: 'Not confirmed by SASBO yet.',
  NOT_LOADED: 'Not loaded on this demonstration yet.',
  FAILED: 'Could not be loaded.',
  EMPTY: 'Nothing is on it.',
});

/** What the deployment's switch says of SASBO's workplaces (MD62). */
export const WORKPLACES_SERVED = Object.freeze({
  NONE: 'NONE',
  NAMES: 'NAMES',
  ALL: 'ALL',
});

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'];

/** An ISO date as a person writes it -- `2026-08-31` is `31 August 2026`; anything else is passed through. */
export const dayLabel = (iso) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!match) return iso ?? '';
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
};

/**
 * The line under anything grouped by one of SASBO's lists (MD28): where it was read from, and whether SASBO has
 * confirmed it -- `As printed on 31 August 2026 — not yet confirmed by SASBO`.
 */
export const listProvenance = (answer) => {
  if (!answer?.printedOn) return '';
  const printed = `As printed on ${dayLabel(answer.printedOn)}`;
  return answer.confirmedOn
    ? `${printed} — confirmed by SASBO on ${dayLabel(answer.confirmedOn)}`
    : `${printed} — not yet confirmed by SASBO`;
};

/** The sentence for an empty list's reason; a word the browser has never heard of is shown as the server wrote it. */
export const emptyReasonSentence = (reason) => LIST_EMPTY_REASON[reason] ?? reason ?? '';

/**
 * A list answer's rows -- or `null` where the answer is not the shape a list's is, which a screen shows as
 * *not available* and never as an empty list (MV-36): the shared test fixture answers every read with `[]`.
 */
export const listRows = (answer) =>
  answer && typeof answer === 'object' && !Array.isArray(answer) && Array.isArray(answer.rows) ? answer.rows : null;

/* ── The figures (02.2, 02.3) ────────────────────────────────────────────────────────────────────── */

/**
 * What the figures are grouped by: the server's six, in its order (`summaryGroupings`), each as a person reads it --
 * which is also how the sheet's first column is headed. Held to the server's list by `monthEnd.test.js`.
 */
export const SUMMARY_GROUPING = Object.freeze({
  group: 'Employer group',
  employer: 'Employer',
  tableCode: 'Table code',
  area: 'Area',
  region: 'Region',
  committee: 'Committee',
});

/** `2026-09` as a person writes it -- `September 2026`; anything else is passed through. */
export const monthLabel = (yearMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth ?? '');
  return match ? `${MONTHS[Number(match[2]) - 1]} ${match[1]}` : yearMonth ?? '';
};

/**
 * The months the figures may be asked for: the SERVER'S month and the twelve before it, newest first (MD55) --
 * counted back from what the server answered, never from the browser's clock.
 */
export const monthsTo = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return Array.from({ length: 13 }, (_, back) => {
    const index = year * 12 + month - 1 - back;
    const value = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
    return { value, label: monthLabel(value) };
  });
};

/**
 * The summary's answer -- or `null` where it is not the shape the server's is (MV-36): no month, no totals, no rows.
 * The server answers at least one row in every grouping, *No workplace on record*, so an answer with none is not one.
 * The shared test fixture answers every read with `[]`, and a screen shows that as *not available*, never a crash.
 */
export const summaryOf = (answer) =>
  answer && typeof answer.month === 'string' && answer.totals && Array.isArray(answer.rows) && answer.rows.length
    ? answer
    : null;

/**
 * The Area control's choices (MD35): all of SASBO, a region, or an area -- `region:NORTH`, `area:A` -- from SASBO's
 * lists as the reference routes answer them.
 */
export const placeOptions = (regions, areas) => [
  { value: '', label: 'All areas' },
  ...regions.map((region) => ({ value: `region:${region.code}`, label: `${region.name} region` })),
  ...areas.map((area) => ({ value: `area:${area.letter}`, label: `Area ${area.letter}` })),
];

/** The request's part for a place chosen: `{ region: 'NORTH' }`, `{ area: 'A' }`, or nothing for all areas. */
export const placeQuery = (place) => {
  const [kind, code] = place.split(':');
  return code ? { [kind]: code } : {};
};

/** Why the figures are not grouped where the switch does not say *all* (MD62): one line beneath the sheet. */
export const UNGROUPED_BECAUSE = Object.freeze({
  [WORKPLACES_SERVED.NONE]: "SASBO's workplaces are not loaded on this demonstration yet.",
  [WORKPLACES_SERVED.NAMES]: "SASBO's staff numbers are not loaded on this demonstration yet, so the figures are not grouped.",
});

const membersHave = (count) => `${formatInt(count)} member${count === 1 ? ' has' : 's have'}`;

/**
 * What the figures could not place, in one line (ME-17) -- a status nobody knows, by its value; no workplace; a
 * workplace with no table code -- or `''` when there is nothing to say.
 */
export const unplacedSentence = (unplaced) => {
  const statuses = unplaced?.statuses ?? [];
  const unknown = statuses.reduce((sum, row) => sum + row.members, 0);
  return [
    unknown && `${membersHave(unknown)} a status this system does not know: ${statuses.map((row) => `"${row.status}"`).join(', ')}`,
    unplaced?.noWorkplace && `${membersHave(unplaced.noWorkplace)} no workplace on record`,
    unplaced?.noTableCode && `${membersHave(unplaced.noTableCode)} a workplace with no table code`,
  ].filter(Boolean).join(' · ');
};
