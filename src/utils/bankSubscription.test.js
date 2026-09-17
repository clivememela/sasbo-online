import { describe, expect, it } from 'vitest'

import { findSubscriptionForBank, formatSubscriptionAmount } from './bankSubscription'

/**
 * THE SUBSCRIPTION LOOKUP MUST AGREE WITH THE SERVER'S, EXACTLY.
 *
 * `MemberServiceImpl.resolveSubscriptionByBankName` does an exact,
 * case-insensitive match on the bank's name. If this one is looser, the screen
 * shows one bank's subscription and the save records another's — a form that is
 * nearly right, which is the most expensive kind of wrong because nobody checks
 * it. `bankBranches.js` carries the same warning about the same temptation, and
 * that one was written after the fuzzy version had already shipped.
 */

const ROWS = [
  { bankName: 'Absa Bank Limited', acbDebitDay: 5, subscriptionAmount: 120.0 },
  { bankName: 'Nedbank Limited', acbDebitDay: 20, subscriptionAmount: 99.99 },
]

describe('findSubscriptionForBank matches the way the server matches', () => {
  it('finds the row for an exact name', () => {
    expect(findSubscriptionForBank(ROWS, 'Nedbank Limited')?.acbDebitDay).toBe(20)
  })

  it('ignores case and surrounding space, as findByNameIgnoreCase does', () => {
    expect(findSubscriptionForBank(ROWS, '  nedbank limited ')?.acbDebitDay).toBe(20)
  })

  it('🔴 does NOT match on a prefix or a substring', () => {
    // The whole point. A fuzzy match would answer Absa's row for "Absa", and the
    // server -- which does not -- would then save something else.
    expect(findSubscriptionForBank(ROWS, 'Nedbank')).toBeNull()
    expect(findSubscriptionForBank(ROWS, 'Absa')).toBeNull()
  })

  it('answers null rather than undefined, so "looked and found nothing" is sayable', () => {
    // derivation.js turns on this distinction: null is NO_MATCH, and never having
    // looked is NOT_APPLICABLE. They produce different words on screen.
    expect(findSubscriptionForBank(ROWS, 'Bank Of Nowhere')).toBeNull()
    expect(findSubscriptionForBank(ROWS, '')).toBeNull()
    expect(findSubscriptionForBank(null, 'Nedbank Limited')).toBeNull()
  })
})

describe('formatSubscriptionAmount', () => {
  it('shows rands and cents, because 120 beside 99.99 reads as two different things', () => {
    expect(formatSubscriptionAmount(120.0)).toBe('120.00')
    expect(formatSubscriptionAmount(99.99)).toBe('99.99')
  })

  it('🔴 a MISSING amount is empty, never "0.00"', () => {
    // The obvious implementation is Number(amount) + isFinite, and Number(null),
    // Number('') and Number([]) are all 0 -- so a member with no subscription row
    // would be shown as one who pays nothing. Different facts, and the second is
    // the kind that reaches a finance report.
    for (const missing of [null, undefined, '', '   ', {}, [], 'free', NaN, Infinity]) {
      expect(formatSubscriptionAmount(missing), String(missing)).toBe('')
    }
  })

  it('a numeric STRING is still an amount -- BigDecimal can arrive either way', () => {
    expect(formatSubscriptionAmount('120')).toBe('120.00')
  })
})
