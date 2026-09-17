/**
 * WHEN THE MEMBER WILL ACTUALLY BE DEBITED — 04.3.
 *
 * <h2>Why this is the one genuinely new thing on the screen</h2>
 * Every other derivation in P4 is plumbing: a value that exists somewhere else,
 * shown where it is needed. This one computes something nobody has written down.
 * *"The 31st falls on a Sunday, so this member is debited on Friday the 29th"* is
 * the only sentence this form can tell an administrator that they did not already
 * know, and the rule behind it exists nowhere in either repository.
 *
 * <h2>The rule (A57, as the signed specification states it)</h2>
 * A debit day that lands on a non-business day moves <b>BACKWARD</b> to the most recent business day in the same
 * month -- the 18 August session ("it must move backward to the most recent business day within the same month")
 * and the A.7 glossary. <b>Only when backward would fall below the 20th</b> does it move forward instead: the
 * session's own example (a Sunday 20th is processed on Monday the 21st) and SASBO's re-debit letter, which only
 * ever debits on the 20th. So the date never falls below the 20th and never leaves its month.
 *
 * 🔴 History, because it went wrong twice. The first rule moved backward ALWAYS, which put a Saturday 20th on
 * Friday the 19th, outside the window. The first correction over-reached and moved EVERY weekend forward, which
 * matched all three of the spec's examples and disagreed with its rule on 56 of 288 cells in 2026-2027 (day 25
 * in July 2026: Friday the 24th, not Monday the 27th). Found by the ACB arc; the test pins a mid-window weekend.
 *
 * <h2>🔴 IT MUST ITERATE, NOT STEP ONCE</h2>
 * Under the Public Holidays Act 36 of 1994, a public holiday falling on a Sunday
 * makes the following Monday a public holiday too. So a single step can land on
 * another non-business day. 2026 has exactly this shape — Women's Day is Sunday
 * 9 August, so Monday 10 August is also a holiday. A one-step implementation is
 * correct for most of the year and wrong in the week somebody checks.
 *
 * <h2>⚠️ WEEKENDS-ONLY IS THE DOCUMENTED FALLBACK, AND IT SAYS SO ON SCREEN</h2>
 * No maintained public-holiday source is wired to this application. A hardcoded
 * table is explicitly ruled out — the set changes, and 2026 carries a one-off
 * local-government-election holiday that no table written last year contains. So
 * this computes weekends only, `holidaysKnown` is `false`, and the caller renders
 * that qualification rather than presenting the date as certain. Passing a
 * maintained list later is the only change needed: the iteration already handles
 * consecutive non-business days, which is the part a holiday source would need.
 */

import { toWireDate } from '../lib/format.js'

const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6

/** `YYYY-MM-DD` from the LOCAL calendar fields -- `lib/format.js` owns the rule (CM-38). */
const isoOf = (date) => toWireDate({ y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() })

/**
 * The last business day on or before `date`.
 *
 * Iterates. `holidays` is a set of `YYYY-MM-DD` strings; an empty one means
 * weekends only, which is the state this application is actually in.
 */
export const lastBusinessDayOnOrBefore = (date, holidays = new Set()) => {
  const cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  // Bounded, so a caller who passes a set containing every day cannot hang the
  // browser. Fourteen is far past any real run of non-business days; reaching it
  // means the input was wrong, and stopping is better than spinning.
  for (let step = 0; step < 14; step += 1) {
    if (!isWeekend(cursor) && !holidays.has(isoOf(cursor))) return cursor
    cursor.setDate(cursor.getDate() - 1)
  }
  return cursor
}

/** The first business day on or after `date`. Iterates, bounded, like its twin above. */
export const nextBusinessDayOnOrAfter = (date, holidays = new Set()) => {
  const cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  for (let step = 0; step < 14; step += 1) {
    if (!isWeekend(cursor) && !holidays.has(isoOf(cursor))) return cursor
    cursor.setDate(cursor.getDate() + 1)
  }
  return cursor
}

/** The last day of a month, so a 31st in February clamps rather than overflowing. */
const lastDayOfMonth = (year, month) => new Date(year, month + 1, 0).getDate()

/**
 * The date a member whose debit day is `day` will actually be debited, in the
 * month containing `reference`.
 *
 * Returns the shape the screen renders:
 *
 *   { iso, day, clamped, adjusted, holidaysKnown }
 *
 * `clamped` is a SHORT MONTH — the 31st in February. `adjusted` is the
 * business-day move. They are reported separately because they have different
 * explanations and a member can hit both at once: the 31st of February 2027 is
 * the 28th, which is a Sunday, so the answer is Friday the 26th.
 */
export const actualDebitDate = (day, reference = new Date(), holidays = new Set()) => {
  const requested = Number(day)
  if (!Number.isInteger(requested) || requested < 1 || requested > 31) return null

  const year = reference.getFullYear()
  const month = reference.getMonth()
  const monthEnd = lastDayOfMonth(year, month)
  const clampedDay = Math.min(requested, monthEnd)

  const target = new Date(year, month, clampedDay)
  // Backward, as the spec says; forward only where backward would leave the window (below the 20th, or the
  // month). A57 -- see the rule above.
  const backward = lastBusinessDayOnOrBefore(target, holidays)
  const actual = backward.getMonth() === month && backward.getDate() >= 20
    ? backward
    : nextBusinessDayOnOrAfter(target, holidays)

  return {
    iso: isoOf(actual),
    day: actual.getDate(),
    clamped: clampedDay !== requested,
    adjusted: actual.getDate() !== clampedDay,
    // Honest by construction: no maintained holiday source is wired, so unless a
    // caller supplies one this answer accounts for weekends only.
    holidaysKnown: holidays.size > 0,
  }
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

/**
 * The sentence the screen shows — the whole point of the unit.
 *
 * Says the DATE, and says WHY it is not the day the user picked. A date with no
 * explanation invites "that is wrong, I chose the 31st"; the explanation is what
 * turns it from a surprise into information.
 */
export const debitDateSentence = (day, reference = new Date(), holidays = new Set()) => {
  const result = actualDebitDate(day, reference, holidays)
  if (!result) return null

  const date = new Date(`${result.iso}T00:00:00`)
  const written = `${WEEKDAYS[date.getDay()]} ${result.day} ${MONTHS[date.getMonth()]}`

  if (!result.clamped && !result.adjusted) {
    return `This member will be debited on ${written}.`
  }

  const because = []
  if (result.clamped) because.push(`${MONTHS[date.getMonth()]} has no ${ordinal(Number(day))}`)
  if (result.adjusted) because.push('that day is not a business day')

  const caveat = result.holidaysKnown
    ? ''
    : ' Weekends only — public holidays are not accounted for.'

  return `${because.join(', and ')}, so this member will be debited on ${written}.${caveat}`
}

const ordinal = (n) => {
  const suffix = n % 100 >= 11 && n % 100 <= 13
    ? 'th'
    : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix}`
}
