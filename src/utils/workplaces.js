import { emptyReasonSentence, listProvenance, listRows } from '../config/monthEnd.js';
import { ERROR_KINDS } from '../services/parseApiError.js';
import { nameKey } from './nameKey.js';

/**
 * THE MEMBER'S WORKPLACE -- month end `01.3` -- the rules the Workplace control reads, kept apart from how it looks so
 * each can be tested without a screen (`workplaces.test.js`).
 *
 * The control is on capture's and the record's Employment tab, above *Bank Where Employed*, *Bank Branch* and
 * *IBT No.*, which STAY (BR21: ACB finds the bank by that text, and job grades and subscriptions are keyed by it). It
 * never writes them by itself: it OFFERS, and only where the names agree (`workplaceFill`).
 */

/**
 * The search (MR-PERF-12): nothing is asked below the SECOND character, one question per pause in typing, and a page
 * of eight -- a search on the server, never a list of 5,507. The server's own ceiling on a term is a hundred characters
 * (`searchMaxLength` in `api-vocabulary.json`); the field stops there rather than send one it would refuse.
 */
export const WORKPLACE_SEARCH = Object.freeze({ from: 2, pauseMs: 300, size: 8, maxLength: 100 });

/**
 * A read the server does not have yet is NOT AVAILABLE, never a failure (MD58, MV-53): a server built before month end
 * answers these routes 404, and retrying would only ask again.
 */
export const notHere = (error) => error?.kind === ERROR_KINDS.HTTP && error.status === 404;

/**
 * The sentences for *not available* that are this screen's own. A reason the SERVER gives is said in its word, through
 * `emptyReasonSentence` (ME-19), so the four it knows read the same on every screen.
 */
export const NOT_AVAILABLE = Object.freeze({
  NOT_HERE: 'This server does not answer for SASBO’s workplaces yet.',
  UNREADABLE: 'This server’s answer about SASBO’s workplaces could not be read.',
});

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const emptyBecause = (what, reason) => `${what}: ${emptyReasonSentence(reason || 'EMPTY')}`;

/**
 * What the control can offer, from the status read and SASBO's employers (`01.1`).
 *
 *   `{ state: 'ready', employers, employersFrom, workplacesFrom }` -- workplaces are on record here, and there is an
 *        employer to choose; the two `…From` are each list's provenance line (MD28);
 *   `{ state: 'unavailable', why }` -- not available, and the sentence that says why: the server's own reason (every
 *        hosted stack says NOT_LOADED until SASBO agrees, MD45), or an answer of the WRONG SHAPE -- the suite's shared
 *        fixture answers every read with `[]` (BR56, MV-36), and that is never an empty control.
 */
export function workplaceSource(status, employers) {
  const standing = isRecord(status) && isRecord(status.workplaces) ? status.workplaces : null;
  const rows = listRows(employers);
  if (!standing || !rows) return { state: 'unavailable', why: NOT_AVAILABLE.UNREADABLE };
  if (standing.reason || !(standing.rows > 0)) {
    return { state: 'unavailable', why: emptyBecause('SASBO’s workplaces', standing.reason) };
  }
  if (!rows.length) return { state: 'unavailable', why: emptyBecause('SASBO’s employers', employers.reason) };
  return {
    state: 'ready',
    employers: rows,
    employersFrom: listProvenance(employers),
    workplacesFrom: listProvenance(standing),
  };
}

/**
 * A page of workplaces as the search shows it: `{ page }`, or `{ why }` -- where none is on record here (the switch
 * was set back since the control opened) or where the answer is not a page's shape. `reason` is null when workplaces
 * exist and the search found none, which is an ANSWER: "No workplace matches".
 */
export function workplaceResults(answer) {
  if (!isRecord(answer) || !Array.isArray(answer.content)) return { why: NOT_AVAILABLE.UNREADABLE };
  if (answer.reason) return { why: emptyBecause('SASBO’s workplaces', answer.reason) };
  return { page: answer };
}

/**
 * The member's workplace from the answer for ONE member (`GET /api/members/{id}`), which carries the lineage the list
 * does not (MR-PERF-9): `{ workplace }`; `{ none: true }` where the server now says there is none; `{ why }` where the
 * answer is not a member's shape.
 */
export function memberWorkplace(answer) {
  if (!isRecord(answer)) return { why: NOT_AVAILABLE.UNREADABLE };
  if (isRecord(answer.workplace)) return { workplace: answer.workplace };
  return answer.workplaceId == null ? { none: true } : { why: NOT_AVAILABLE.UNREADABLE };
}

/** The two fields the offer can fill, by the names the form gives them. */
export const FILLABLE = Object.freeze({ bankName: 'Bank Where Employed', branch: 'Bank Branch' });

/**
 * 🔑 THE OFFER'S RULE: which of *Bank Where Employed* and *Bank Branch* a chosen workplace may fill, and with what.
 *
 * A name AGREES when, trimmed and with case aside (`nameKey` -- the server's own `IgnoreCase` lookups), it is one the
 * field ALREADY OFFERS:
 *
 *   Bank Where Employed  the workplace's employer on SASBO's list -- or, where it has none, its employer as printed on
 *                        its row -- against the banks the field offers;
 *   Bank Branch          the workplace's name, against the branches the field offers for the bank it will hold.
 *
 * What is filled is the FORM'S OWN option, never SASBO's spelling, so each field only ever holds a value its own list
 * offers -- the value ACB and the job grades look up. Nothing is matched by likeness: no `includes`, no "Ltd" folding.
 * A near miss is simply not offered, and the field stays the administrator's to choose.
 *
 * A field is offered only where it agrees, would change, and is FREE: empty, or holding what an earlier offer filled.
 * A value the administrator chose -- or that the record holds -- is never overwritten (S4, `utils/derivation.js`).
 *
 * @param {object} workplace  the chosen workplace's row
 * @param {{ banks: string[], branchesFor: (bank: string) => string[], form: object, free: object }} fields
 * @returns {{ bankName?: string, branch?: string }} the fields to fill -- empty when there is nothing to offer
 */
export function workplaceFill(workplace, { banks, branchesFor, form, free }) {
  const agreeing = (options, names) => {
    const keys = names.map(nameKey).filter(Boolean);
    return (Array.isArray(options) ? options : []).find((option) => keys.includes(nameKey(option)));
  };
  const fill = {};
  const bank = agreeing(banks, [workplace?.employer || workplace?.employerPrinted]);
  if (bank && free.bankName && bank !== form.bankName) fill.bankName = bank;
  const bankHeld = fill.bankName ?? form.bankName;
  const branch = bankHeld ? agreeing(branchesFor(bankHeld), [workplace?.name]) : undefined;
  if (branch && free.branch && branch !== form.branch) fill.branch = branch;
  return fill;
}
