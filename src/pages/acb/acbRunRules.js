import { formatDateLong, formatZar } from '../../lib/format.js';

/**
 * The A.C.B. run's vocabulary and the Runs screen's small rules, named once.
 *
 * The run states, exclusion reasons and refusal codes are the SERVER'S -- published in
 * `api-vocabulary.json` under `acb`, and held to that file by `acbRunRules.test.js`, so a state the
 * server adds reddens a test here instead of rendering as an unexplained word on screen.
 */

export const RUN_STATUS = Object.freeze({
  PREPARING: 'PREPARING',
  PREPARED: 'PREPARED',
  APPROVED: 'APPROVED',
  SUBMITTED: 'SUBMITTED',
  RETURNED: 'RETURNED',
  CLOSED: 'CLOSED',
  DECLINED: 'DECLINED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

/** What each state is called on screen. */
export const RUN_STATUS_LABEL = Object.freeze({
  PREPARING: 'Preparing',
  PREPARED: 'Prepared',
  APPROVED: 'Approved',
  SUBMITTED: 'Submitted',
  RETURNED: 'Returned',
  CLOSED: 'Closed',
  DECLINED: 'Declined by the bank',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
});

/** The states a run can be cancelled from: a proposal, before anything reached the bank. */
export const CANCELLABLE = new Set([RUN_STATUS.PREPARED, RUN_STATUS.APPROVED]);

/** Why a member is not debited, as an administrator reads it. */
export const EXCLUSION_LABEL = Object.freeze({
  NOT_DEBIT_ORDER: 'Not a debit-order member',
  STATUS_NOT_ACTIVE: 'Not Active',
  NO_BANK_ON_RECORD: 'Bank name matches no bank on record',
  NO_SUBSCRIPTION_ROW: 'SASBO does not collect at this bank',
  DAY_OUT_OF_WINDOW: 'Debit day outside the 20th to the 31st',
  ACCOUNT_SHAPE_INVALID: 'Account number cannot go in the file',
  SNAPSHOT_INCOMPLETE: 'Membership number or surname missing',
});

/** Why the bank declined a file, from the server's short list (D29, SD3-H). */
export const DECLINE_REASON_LABEL = Object.freeze({
  WRONG_DEBIT_DATE: 'A wrong debit date',
  LAYOUT: 'The file layout',
  OTHER: 'Another reason',
});

/**
 * What the prepare dialog says about a month whose last file the bank declined for a wrong debit date,
 * or `null`. A warning, never a refusal: the bank's complaint may be about a day that is no public
 * holiday -- but if the holiday calendar has not changed since, the new file's dates are the old
 * file's dates (SD3-H). `runs` is the list page the screen holds, newest first.
 */
export const declinedMonthWarning = (runs, month) => {
  const declined = (runs ?? []).find((run) => run.actionMonth === month && run.status === RUN_STATUS.DECLINED);
  if (!declined || declined.declinedReason !== 'WRONG_DEBIT_DATE') return null;
  return declined.calendarAgrees === false
    ? `The bank declined the ${monthLabel(month)} file for a wrong debit date. The holiday calendar has changed since, so this run's dates can differ.`
    : `The bank declined the ${monthLabel(month)} file for a wrong debit date, and the holiday calendar has not changed since — this run would carry the same dates. Check the date the bank named first.`;
};

export const REFUSAL = Object.freeze({
  RUN_ALREADY_EXISTS: 'RUN_ALREADY_EXISTS',
  RUN_VERSION_CONFLICT: 'RUN_VERSION_CONFLICT',
  RUN_NOT_IN_STATE: 'RUN_NOT_IN_STATE',
});

/**
 * What the Runs screen says about the holiday calendar (D30), or `null` when there is nothing to say.
 *
 * With no calendar on record nothing can be prepared, and the screen says so before anyone tries.
 * From sixty days before the date the calendar is known until -- the server decides when, and says
 * `endingSoon` -- the screen names that date, so a month past it is never first refused inside
 * December's three-day window (SD3-G). Anything that is not a calendar -- the route smoke answers
 * every read with `[]` -- says nothing rather than something wrong.
 */
export const calendarNotice = (calendar) => {
  if (!calendar || typeof calendar !== 'object' || Array.isArray(calendar)) return null;
  if (!calendar.knownUntil) return 'No holiday calendar is on record, so no month can be prepared yet.';
  if (!calendar.endingSoon) return null;
  return `The holiday calendar is known until ${formatDateLong(calendar.knownUntil)}. `
    + 'A month after that cannot be prepared until the calendar is extended.';
};

/**
 * What a month will charge, and the next dated rate after it if there is one (Q43): the rate in
 * force for a month is the latest row dated on or before its first day. `null` when the answer is
 * not a list of rates -- the route smoke answers every read with `[]` -- or no rate reaches the month.
 */
export const rateNote = (ratesAnswer, month) => {
  const rates = Array.isArray(ratesAnswer?.rates) ? ratesAnswer.rates : null;
  if (!rates || !/^\d{4}-\d{2}$/.test(month ?? '')) return null;
  const first = `${month}-01`;
  const inForce = rates.filter((r) => r.effectiveFrom <= first).at(-1);
  if (!inForce) return null;
  const next = rates.find((r) => r.effectiveFrom > first);
  return `${monthLabel(month)} charges ${formatZar(inForce.amount)} a member — the rate since `
    + `${monthLabel(inForce.effectiveFrom.slice(0, 7))}.`
    + (next ? ` From ${monthLabel(next.effectiveFrom.slice(0, 7))}: ${formatZar(next.amount)}.` : '');
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

/** `2026-10` -> `October 2026`; anything else is shown as it came. */
export const monthLabel = (yearMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth ?? '');
  if (!match) return yearMonth ?? '';
  return `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
};

const asYearMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/**
 * The months a run may be prepared for: this one and the next -- what the server accepts. `today`
 * is the browser's date; the server decides in Johannesburg, and a refusal says so.
 */
export const preparableMonths = (today = new Date()) => {
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return [today, next].map((date) => ({ value: asYearMonth(date), label: monthLabel(asYearMonth(date)) }));
};

/**
 * A server page, or an empty one. Anything that is not `{ content: [...] }` -- the route smoke
 * answers every read with `[]` -- becomes an empty page rather than a crash.
 */
export const asPage = (payload) => {
  if (!payload || !Array.isArray(payload.content)) {
    return { content: [], page: 0, totalPages: 0, totalElements: 0 };
  }
  return {
    content: payload.content,
    page: Number(payload.page) || 0,
    totalPages: Number(payload.totalPages) || 0,
    totalElements: Number(payload.totalElements) || 0,
  };
};

/** The last four digits the server sends, shown as such -- never more is ever received. */
export const maskedAccount = (lastFour) => (lastFour ? `•••• ${lastFour}` : '—');

/**
 * How long to wait before each re-read of a run that is preparing: backing off from a second to
 * eight, about two minutes in all. After the last, the screen stops and says to check back.
 */
export const POLL_DELAYS_MS = Object.freeze([1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000, 8000, 8000,
  8000, 8000, 8000, 8000, 8000, 8000, 8000]);

/**
 * Re-reads run `id` until it leaves PREPARING. Resolves with the settled run, `null` when
 * `stopped()` became true (the screen was left), or `undefined` when the delays ran out. A failed
 * read rejects -- the caller says what it could not confirm.
 */
export async function pollRun(read, id, { delays = POLL_DELAYS_MS, stopped = () => false } = {}) {
  for (const delay of delays) {
    await new Promise((resolve) => { setTimeout(resolve, delay); });
    if (stopped()) return null;
    const run = await read(id);
    if (stopped()) return null;
    if (run?.status !== RUN_STATUS.PREPARING) return run;
  }
  return undefined;
}
