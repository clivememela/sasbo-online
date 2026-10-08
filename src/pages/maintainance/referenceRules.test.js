import { describe, expect, it } from 'vitest'

import { monthEndBody } from '../../test/msw/monthEndExamples'
import {
  OTHER, codeLabel, placeOf, reasonBody, reasonsOf, tableCodeMatches, tierChoices, tierCounts, tierName, tiersOf,
  withReason,
} from './referenceRules'

/** The rules the two lists' screens read by -- each against the server's golden answers where it reads one. */

const REASONS = monthEndBody('GET /api/reference/no-deduction-reasons')
const TIERS = monthEndBody('GET /api/reference/core-tiers')
const CODES = monthEndBody('GET /api/reference/table-codes')

describe('the reasons for no payroll deduction (R1)', () => {
  it('MV-36: the server\'s answer is read; anything of another shape is none', () => {
    expect(reasonsOf(REASONS)).toBe(REASONS)
    expect(reasonsOf([])).toBeNull()
    expect(reasonsOf({ rows: [] })).toBeNull()
    expect(reasonsOf(null)).toBeNull()
  })

  it('a row in its place: replaced where it was, added where it is new, the list kept in the server\'s order', () => {
    const study = { ...REASONS.rows[0], id: 6, name: 'Study leave', ordinal: 6 }
    expect(withReason(REASONS.rows, study).map((row) => row.name).at(-1)).toBe('Study leave')
    const first = withReason(REASONS.rows, { ...REASONS.rows[4], ordinal: 1 })
    // Two at place 1: by name, as the server orders them.
    expect(first.slice(0, 2).map((row) => row.name)).toEqual(['Sick leave', 'Unpaid leave'])
    expect(first).toHaveLength(REASONS.rows.length)
  })

  it('a code is its number and its name -- or its number alone where no name is on record', () => {
    expect(codeLabel(11, 'NOT ON PAYROLL')).toBe('11 · NOT ON PAYROLL')
    expect(codeLabel(12, null)).toBe('12')
  })

  it('a place is 1 to 999; nothing typed is no place; anything else is none of them', () => {
    expect(placeOf('')).toBe('')
    expect(placeOf(' 7 ')).toBe(7)
    expect(placeOf('999')).toBe(999)
    expect([placeOf('0'), placeOf('1000'), placeOf('2.5'), placeOf('-1'), placeOf('ten')]).toEqual([null, null, null, null, null])
  })

  it('a new reason sends no version and, with no place, none; a change sends its version; an emptied place is left out', () => {
    const form = { name: ' Study leave ', code: '11', ordinal: '', offered: 'yes' }
    expect(reasonBody(form)).toEqual({ name: 'Study leave', suspensionCode: 11, active: true })
    expect(reasonBody({ ...form, ordinal: '6', offered: 'no' }, 2))
      .toEqual({ name: 'Study leave', suspensionCode: 11, ordinal: 6, active: false, version: 2 })
    expect(reasonBody(form, 0)).toEqual({ name: 'Study leave', suspensionCode: 11, active: true, version: 0 })
  })
})

describe('the core tiers (R7)', () => {
  it('MV-36: the server\'s answer is read; anything of another shape is none', () => {
    expect(tiersOf(TIERS)).toBe(TIERS)
    expect(tiersOf([])).toBeNull()
    expect(tiersOf({ tiers: [{ code: 'A' }], allOther: 'All other institutions' })).toBeNull()
  })

  it('the tiers in their order, and every other institution last, sent as none', () => {
    expect(tierChoices(TIERS)).toEqual([
      { value: 'A', label: 'Core A' },
      { value: 'B', label: 'Core B' },
      { value: 'C', label: 'Core C' },
      { value: OTHER, label: 'All other institutions' },
    ])
  })

  it('a table code\'s tier by its name, and how many stand in each', () => {
    expect(tierName(TIERS, CODES.rows[0])).toBe('Core A')
    expect(tierName(TIERS, CODES.rows[1])).toBe('All other institutions')
    expect(tierCounts(TIERS, CODES.rows).map((tier) => tier.count)).toEqual([1, 0, 0, 3])
  })

  it('a table code matches its number, its name or its employer\'s, in any case -- and everything matches nothing typed', () => {
    const [bank, , insurer, lender] = CODES.rows
    expect(tableCodeMatches(bank, '90')).toBe(true)
    expect(tableCodeMatches(insurer, 'Insurer')).toBe(true)
    expect(tableCodeMatches(lender, 'insurer')).toBe(false)
    expect(tableCodeMatches(lender, '  ')).toBe(true)
  })
})
