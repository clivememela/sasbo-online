import { describe, expect, it } from 'vitest'

import { actualDebitDate, debitDateSentence, lastBusinessDayOnOrBefore } from './debitDate'

/**
 * 04.3 — the actual debit date.
 *
 * The dates below are real calendar dates, chosen because they have the shape
 * being tested, and each one names why. A test that computes its own expectation
 * from the same rule as the code proves only that the code is self-consistent.
 */

/** August 2026: the 9th is a Sunday (Women's Day), so the 10th is a holiday too. */
const AUG_2026 = new Date(2026, 7, 15)

describe('lastBusinessDayOnOrBefore', () => {
  it('leaves a business day alone', () => {
    // Friday 21 August 2026.
    expect(lastBusinessDayOnOrBefore(new Date(2026, 7, 21)).getDate()).toBe(21)
  })

  it('moves BACKWARDS off a weekend, never forwards', () => {
    // Sunday 23 August 2026 -> Friday the 21st. Forwards would be Monday the 24th,
    // which for a month-end debit day would push the collection into the next month
    // and change which month the member has paid for.
    expect(lastBusinessDayOnOrBefore(new Date(2026, 7, 23)).getDate()).toBe(21)
    // Saturday the 22nd, same answer.
    expect(lastBusinessDayOnOrBefore(new Date(2026, 7, 22)).getDate()).toBe(21)
  })

  it('🔴 ITERATES over consecutive non-business days -- the Public Holidays Act case', () => {
    // Women's Day 2026 falls on SUNDAY 9 August, so MONDAY 10 August is a public
    // holiday too. A one-step implementation moving off Tuesday the 11th would land
    // on the 10th and stop -- on another non-business day. The answer is Friday the
    // 7th, and reaching it takes three steps.
    const holidays = new Set(['2026-08-09', '2026-08-10'])
    expect(lastBusinessDayOnOrBefore(new Date(2026, 7, 10), holidays).getDate()).toBe(7)
  })

  it('does not mutate the date it was given', () => {
    const input = new Date(2026, 7, 23)
    lastBusinessDayOnOrBefore(input)
    expect(input.getDate()).toBe(23)
  })
})

describe('actualDebitDate', () => {
  it('clamps a 31st in a short month rather than overflowing into the next', () => {
    // February 2026 has 28 days. The 28th is a Saturday, so the answer is Friday
    // the 27th -- BOTH adjustments at once, which is why they are reported apart.
    const result = actualDebitDate(31, new Date(2026, 1, 10))
    expect(result.day).toBe(27)
    expect(result.clamped).toBe(true)
    expect(result.adjusted).toBe(true)
  })

  it('reports neither flag when the requested day is already a business day', () => {
    const result = actualDebitDate(21, AUG_2026)
    expect(result).toMatchObject({ day: 21, clamped: false, adjusted: false })
  })

  it('says whether public holidays were accounted for -- and by default they are not', () => {
    // The fallback has to be VISIBLE, not assumed. No maintained holiday source is
    // wired to this application, so an answer that did not say so would be
    // overstating what it knows.
    expect(actualDebitDate(21, AUG_2026).holidaysKnown).toBe(false)
    expect(actualDebitDate(21, AUG_2026, new Set(['2026-08-09'])).holidaysKnown).toBe(true)
  })

  it('answers null for a day that is not a day', () => {
    for (const bad of [null, undefined, '', 0, 32, 'the 20th', NaN]) {
      expect(actualDebitDate(bad, AUG_2026)).toBeNull()
    }
  })

  it('never returns a date outside the requested month', () => {
    // The reason the adjustment turns backward at the end of a month. Checked across
    // a year rather than at one date, because the failure would be seasonal.
    for (let month = 0; month < 12; month += 1) {
      for (const day of [20, 25, 28, 30, 31]) {
        const result = actualDebitDate(day, new Date(2026, month, 15))
        expect(new Date(`${result.iso}T00:00:00`).getMonth(), `${result.iso}`).toBe(month)
      }
    }
  })
})

describe('🔴 A57 -- a non-business day moves FORWARD, and only backward at the end of the month', () => {
  // The source of the rule: a SASBO "Not Provided For" re-debit letter (printed
  // 11/09/26, planning/branches/acb/legacy/) tells the member that debits run on the
  // 20th and that a Saturday, Sunday or public holiday moves the date FORWARD to the
  // next weekday; the specification's 18 August worked example says the same. The
  // rule here used to move backwards only, which put a Saturday 20th on Friday the
  // 19th -- below the 20-31 window the debit day exists to respect.

  it('a Saturday 20th is debited on Monday the 22nd, never Friday the 19th', () => {
    // 20 June 2026 is a Saturday.
    const result = actualDebitDate(20, new Date(2026, 5, 10))
    expect(result).toMatchObject({ iso: '2026-06-22', day: 22, adjusted: true, clamped: false })
  })

  it('a Sunday 20th is debited on Monday the 21st -- the specification example', () => {
    // 20 September 2026 is a Sunday.
    expect(actualDebitDate(20, new Date(2026, 8, 1)).iso).toBe('2026-09-21')
  })

  it('a weekend at the END of the month moves backward, so it never leaves the month', () => {
    // 31 October 2026 is a Saturday: forward would be 2 November, another month.
    expect(actualDebitDate(31, new Date(2026, 9, 1)).iso).toBe('2026-10-30')
  })

  it('never lands below the 20th, across two years', () => {
    // The bottom of the window, which "never leaves the month" alone did not guard.
    for (let month = 0; month < 24; month += 1) {
      for (const day of [20, 21, 25, 28, 30, 31]) {
        const result = actualDebitDate(day, new Date(2026, month, 15))
        expect(result.day, `${result.iso} for the ${day}th`).toBeGreaterThanOrEqual(20)
      }
    }
  })

  it('a holiday Monday after a Sunday 20th keeps moving forward', () => {
    // Iteration still matters going forward: Sunday 20 September plus a supplied
    // holiday on Monday the 21st is Tuesday the 22nd.
    expect(actualDebitDate(20, new Date(2026, 8, 1), new Set(['2026-09-21'])).iso).toBe('2026-09-22')
  })
})

describe('debitDateSentence', () => {
  it('says the date, and says WHY it is not the day that was picked', () => {
    // A date with no explanation invites "that is wrong, I chose the 31st".
    const sentence = debitDateSentence(31, new Date(2026, 1, 10))
    expect(sentence).toContain('February has no 31st')
    expect(sentence).toContain('not a business day')
    expect(sentence).toContain('Friday 27 February')
  })

  it('carries the weekends-only caveat while no holiday source is wired', () => {
    expect(debitDateSentence(31, new Date(2026, 1, 10)))
      .toContain('Weekends only — public holidays are not accounted for.')
  })

  it('drops the caveat once holidays ARE known', () => {
    // The non-vacuity half: without this the caveat could be unconditional text.
    expect(debitDateSentence(31, new Date(2026, 1, 10), new Set(['2026-02-27'])))
      .not.toContain('Weekends only')
  })

  it('stays plain when nothing was adjusted', () => {
    expect(debitDateSentence(21, AUG_2026)).toBe('This member will be debited on Friday 21 August.')
  })
})
