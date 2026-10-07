import { PERMISSIONS, PERMISSION_LABELS } from '../../auth/permissions.js';
import { MONTHS } from '../../lib/format.js';
import { messageOf, writeMayHaveLanded } from '../../services/parseApiError.js';
import { DEBIT_DAYS, ordinal } from './acbRunRules.js';

/**
 * Debit Order Deductions: the October build's words and small rules, named once (`contracts/dod-api.md`).
 *
 * What a bank code allows is the SERVER'S data, set from Stephne's answers and changed under Settings: this file only
 * words it. The module's code name stays `acb` in addresses; every word an administrator reads says Debit Order.
 */

/** The contract's READ: any of the three may see runs and unpaids. No organiser holds one (Stephne, DOD-14). */
export const DOD_READ = Object.freeze([PERMISSIONS.DOD_PREPARE, PERMISSIONS.DOD_FILE, PERMISSIONS.DOD_SETTINGS]);

export const canAny = (can, permissions) => permissions.some((permission) => can(permission));

/** The refusal codes the Debit Order screens answer in words of their own; any other shows the server's sentence. */
export const DOD_REFUSAL = Object.freeze({
  RUN_VERSION_CONFLICT: 'RUN_VERSION_CONFLICT',
  RUN_NOT_IN_STATE: 'RUN_NOT_IN_STATE',
  FILE_NOT_RENDERED: 'FILE_NOT_RENDERED',
  UNPAIDS_UNDECIDED: 'UNPAIDS_UNDECIDED',
  RE_DEBIT_NOT_ALLOWED: 'RE_DEBIT_NOT_ALLOWED',
  UNPAID_LIMIT_REACHED: 'UNPAID_LIMIT_REACHED',
  RETURNS_BATCH_INVALID: 'RETURNS_BATCH_INVALID',
  UNPAID_COUNTS_INVALID: 'UNPAID_COUNTS_INVALID',
  SUSPENSION_CODE_REQUIRED: 'SUSPENSION_CODE_REQUIRED',
  CODE_VERSION_CONFLICT: 'CODE_VERSION_CONFLICT',
  MOVE_COUNT_CHANGED: 'MOVE_COUNT_CHANGED',
  OPENING_POSITION_INVALID: 'OPENING_POSITION_INVALID',
});

/** Whether the bank's code lets the debit be presented again -- the server's answer, as an administrator reads it. */
export const RE_DEBIT_LABEL = Object.freeze({
  YES: 'May be re-debited',
  NO: 'Never re-debited',
  UNKNOWN: 'Re-debit not yet confirmed by SASBO',
});

/**
 * One bank code in a sentence: its meaning, whether it may be re-debited and on whose word -- "not yet confirmed by
 * SASBO" where she has not said (Friday item 9). Takes an `AcbBankCodeDto`, or a line carrying the same fields.
 */
export const codeSays = ({ wording, reason, reDebit, reDebitSource }) => [
  wording || reason,
  RE_DEBIT_LABEL[reDebit] ? `${RE_DEBIT_LABEL[reDebit]}${reDebitSource ? ` (${reDebitSource})` : ''}` : null,
].filter(Boolean).join(' · ');

/** The two kinds of non-working day (DOD-17): the Act's public holidays, and a day the bank says it is closed. */
export const DAY_KIND_LABEL = Object.freeze({ PUBLIC_HOLIDAY: 'Public holiday', BANK_CLOSED: 'Bank closed' });

/** The debit days a member or a bank may have, as a choice: the 20th to the 31st (Q42). */
export const DEBIT_DAY_OPTIONS = Object.freeze(DEBIT_DAYS.map((day) => ({ value: String(day), label: ordinal(day) })));

/** No session: anonymous, or one that ended (OB29; `contracts/signin.md`). */
const SIGN_IN_CODES = new Set(['SIGN_IN_REQUIRED', 'SESSION_EXPIRED']);

/**
 * A refusal of the CALLER rather than of the request (OB29): nobody signed in -- `401 SIGN_IN_REQUIRED`, asked to sign
 * in, naming what the step needs (`needs`, when the answer does not say) -- or signed in without the permission --
 * `403 PERMISSION_REQUIRED`, said in the server's sentence. The two need different next steps; neither is retried.
 * `null` for any other failure.
 */
export const callerRefusal = (error, needs) => {
  const body = error?.body;
  const what = PERMISSION_LABELS[body?.permission ?? body?.details?.permission ?? needs] ?? 'do this';
  if (SIGN_IN_CODES.has(body?.code)) return `Sign in to ${what}.`;
  if (body?.code === 'PERMISSION_REQUIRED') {
    const said = typeof body.message === 'string' ? body.message.trim() : '';
    return said || `You need permission to ${what}. Ask your administrator if you should have it.`;
  }
  return null;
};

/** The refusal's code, or `null` for a failure that is not a refusal (a timeout, a lost connection). */
export const refusalCode = (error) => (typeof error?.body?.code === 'string' ? error.body.code : null);

/**
 * What a failed write says, in the order every Debit Order dialog uses: a refusal of the caller; a write that may have
 * landed (a timeout, a 5xx), which is never repeated -- the screen reads again first; otherwise the server refused
 * it, wrote nothing, and its own sentence says why. `what` is the step, as a sentence's subject: "The approval";
 * `needs` the permission it takes, for a sign-in prompt that names it.
 */
export const writeOutcome = (error, what, needs) => {
  const caller = callerRefusal(error, needs);
  if (caller) return { message: `${caller} Nothing was changed.`, landed: false };
  if (writeMayHaveLanded(error)) {
    return { message: `${what} could not be confirmed. It may have gone through, so the page reads again: check it before trying again.`, landed: true };
  }
  return { message: `${what} was not recorded. Nothing was written: ${messageOf(error)}`, landed: false };
};

/** A failed read, in a sentence: the caller's refusal, or the screen's own words for anything else. */
export const readFailure = (error, words, needs) => callerRefusal(error, needs) ?? words;

/**
 * The bank file's name when the server's cannot be read: the July file's pattern, `sasbosub.oct` for an October run.
 */
export const runFileName = (actionMonth) => {
  const match = /^\d{4}-(\d{2})$/.exec(actionMonth ?? '');
  return match ? `sasbosub.${MONTHS[Number(match[1]) - 1].toLowerCase()}` : 'sasbosub';
};

/** A refusal's numbered problems (`details.problem.1` ...), in order: a returns batch's, an unpaid-count list's. */
export const problemsOf = (error) => {
  const details = error?.body?.details ?? {};
  return Object.keys(details)
    .filter((key) => /^problem\.\d+$/.test(key))
    .sort((a, b) => Number(a.slice(8)) - Number(b.slice(8)))
    .map((key) => details[key]);
};

/** A member as a sentence names them: initials and surname, or the membership number, or "this member". */
export const memberName = (row) =>
  [row?.initials, row?.surname].filter(Boolean).join(' ') || row?.membershipNumber || 'this member';

/** "Cannot present more then 3 unpaid debits" (Stephne, DOD-03). */
export const UNPAID_LIMIT = 3;

/**
 * Why Present again is not offered for a line, or `null` when it is: the bank's code may never be re-debited, or SASBO
 * has not said (Friday item 9), or the member is at three unpaids (DOD-03). A line from a server that does not yet say
 * (no `reDebit`) is left to the server, which refuses with its own sentence.
 */
export const noRepresentWhy = (line) => {
  if (line.memberUnpaidCount != null && line.memberUnpaidCount >= UNPAID_LIMIT) return 'The member is at three unpaids, so it is not presented again.';
  if (line.reDebit === 'NO') return `Code ${line.unpaidCode} is never re-debited.`;
  if (line.reDebit === 'UNKNOWN') return `Whether code ${line.unpaidCode} may be re-debited is not yet confirmed by SASBO.`;
  return null;
};
