/**
 * Month end's vocabulary as the browser holds it -- the codes it ACTS ON and the words it shows for the server's
 * words. Held to the server's own list, `api-vocabulary.json` under `monthEnd`, by `monthEnd.test.js`: a word the
 * server adds reddens that file instead of reaching a screen as a word nobody wrote a sentence for.
 *
 * THE SENTENCE A PERSON READS ON A REFUSAL IS THE SERVER'S `message` (ME-13). The browser keeps only the codes it
 * branches on, and shows a code it has never heard of as the server wrote it.
 */

/** The refusal codes the screens branch on (ME-13) -- each one the server publishes. */
export const MONTH_END_REFUSAL = Object.freeze({
  REQUEST_MALFORMED: 'REQUEST_MALFORMED',
  WORKPLACE_PAGE_INVALID: 'WORKPLACE_PAGE_INVALID',
});

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
