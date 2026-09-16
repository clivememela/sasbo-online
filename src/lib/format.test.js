import { describe, expect, it } from 'vitest'

import {
  EMPTY,
  dash,
  formatDate,
  formatDateLong,
  formatInt,
  formatZar,
  isValidDate,
  parseDate,
  toWireDate,
  today,
  yearsBetween,
} from './format'

describe('format — the UTC trap, which is the reason this module exists', () => {
  /**
   * 🔴 R-ROB-N, and the reason it is a rule rather than a preference. `CaptureMember.jsx:85`
   * computes today as `new Date().toISOString().split("T")`, so in South Africa (UTC+2) a
   * member captured between 00:00 and 01:59 SAST is dated YESTERDAY. That is CM-38, the
   * Capture Member arc's defect, and this asserts that this module cannot reproduce it.
   */
  it('today() reads the LOCAL calendar, where toISOString would be a day out', () => {
    // 00:30 on 15 June, local time. In any zone east of UTC this instant is still 14 June
    // in UTC — which is exactly the window the defect lives in.
    const justAfterMidnight = new Date(1988, 5, 15, 0, 30, 0)

    expect(today(justAfterMidnight)).toEqual({ y: 1988, m: 6, d: 15 })

    // The comparison that makes the point rather than merely stating it: what the broken
    // idiom would have produced, from the very same instant.
    const viaUtc = justAfterMidnight.toISOString().split('T')[0]
    const viaThisModule = toWireDate(today(justAfterMidnight))
    // In UTC+2 these differ; in UTC they agree. Asserting `viaThisModule` is right is the
    // contract — the UTC value is printed for whoever reads a failure here.
    expect(viaThisModule, `toISOString path gave ${viaUtc}`).toBe('1988-06-15')
  })

  it('every exported formatter is reachable without constructing a Date from a date string', () => {
    // A date-only value must never be parsed by `new Date("1988-06-15")`, which is midnight
    // UTC. These all go through the field parser instead.
    expect(formatDate('1988-06-15')).toBe('1988/06/15')
    expect(formatDateLong('1988-06-15')).toBe('15 Jun 1988')
    expect(toWireDate('15/06/1988')).toBe('1988-06-15')
  })
})

describe('format — parseDate accepts the four typed forms the approved mock names', () => {
  const expected = { y: 1988, m: 6, d: 15 }

  it.each([
    ['15 Jun 1988', 'the display form'],
    ['15 June 1988', 'the display form, spelled out'],
    ['15/06/1988', 'day first, the South African convention'],
    ['1988-06-15', 'year first, ISO-shaped'],
    ['19880615', 'eight digits'],
    ['1988/06/15', 'the form this app STORES, read back'],
  ])('accepts %s (%s)', (input) => {
    expect(parseDate(input)).toEqual(expected)
  })

  it('refuses an impossible date instead of rolling it over', () => {
    // `new Date(1988, 1, 31)` silently becomes 2 March. A birth date that quietly moves is
    // worse than one that is refused, and the mock's contract is refusal in plain words.
    expect(parseDate('31/02/1988')).toBeNull()
    expect(parseDate('1988-13-01')).toBeNull()
    expect(parseDate('1988-02-30')).toBeNull()
  })

  it('honours the leap year rather than approximating it', () => {
    expect(parseDate('29/02/2024')).toEqual({ y: 2024, m: 2, d: 29 })
    expect(parseDate('29/02/2023')).toBeNull()
    expect(parseDate('29/02/1900')).toBeNull() // divisible by 100, not by 400
    expect(parseDate('29/02/2000')).toEqual({ y: 2000, m: 2, d: 29 })
  })

  it('refuses to guess between day-first and month-first', () => {
    // 06/15/1988 is unambiguous ONLY because 15 cannot be a month. 05/06/1988 is genuinely
    // ambiguous, and this parser reads it day-first, always, rather than sometimes.
    expect(parseDate('05/06/1988')).toEqual({ y: 1988, m: 6, d: 5 })
    expect(parseDate('06/15/1988')).toBeNull()
  })

  it('returns null rather than throwing, for anything at all', () => {
    for (const input of [null, undefined, '', '   ', 'yesterday', {}, [], 'Jun 1988', '15/6/88']) {
      expect(parseDate(input)).toBeNull()
    }
  })

  it('isValidDate rejects non-integers, so a partially-typed field cannot slip through', () => {
    expect(isValidDate({ y: 1988, m: 6, d: 15 })).toBe(true)
    expect(isValidDate({ y: 1988, m: 6.5, d: 15 })).toBe(false)
    expect(isValidDate({ y: 1988, m: 6 })).toBe(false)
  })
})

describe('format — money and numbers name their locale', () => {
  it('formats rands with two decimals, always', () => {
    // 🔑 The assertion is on the DIGITS and the separator positions, not on the exact
    // whitespace: en-ZA uses a narrow no-break space as the group separator and which
    // codepoint that is has changed between ICU versions. Asserting the literal string
    // would make this test a report on the Node build rather than on this function.
    const formatted = formatZar(1234.5)
    expect(formatted.startsWith('R ')).toBe(true)
    expect(formatted.replace(/[^\d,.]/g, '')).toBe('1234,50')
  })

  it('renders a missing amount as the em dash, not as R 0.00', () => {
    // "R 0.00" is a FACT about a member's subscription. "—" is the absence of one, and
    // reporting the first when you mean the second is a confident wrong answer.
    expect(formatZar(null)).toBe(EMPTY)
    expect(formatZar(undefined)).toBe(EMPTY)
    expect(formatZar('')).toBe(EMPTY)
    expect(formatZar('not a number')).toBe(EMPTY)
    expect(formatZar(0)).not.toBe(EMPTY)
  })

  it('formats counts and refuses nonsense', () => {
    expect(formatInt(1234).replace(/[^\d]/g, '')).toBe('1234')
    expect(formatInt(null)).toBe(EMPTY)
    expect(formatInt('abc')).toBe(EMPTY)
  })
})

describe('format — dash is the one place "nothing" is rendered', () => {
  it('treats an EMPTY ARRAY as nothing, which join() does not', () => {
    // `[].join(', ')` is `''`, so a member with no COSATU positions renders a blank cell
    // that reads as a bug. This is the case the helper exists for.
    expect(dash([])).toBe(EMPTY)
    expect(dash(['PEC', 'CEC'])).toBe('PEC, CEC')
    expect(dash('')).toBe(EMPTY)
    expect(dash(null)).toBe(EMPTY)
    expect(dash(0)).toBe('0')
    expect(dash(false)).toBe('false')
  })
})

describe('format — yearsBetween is the picker\'s age readout', () => {
  it('does not count a birthday that has not happened yet this year', () => {
    expect(yearsBetween('1988-06-15', { y: 2026, m: 6, d: 15 })).toBe(38)
    expect(yearsBetween('1988-06-15', { y: 2026, m: 6, d: 14 })).toBe(37)
    expect(yearsBetween('1988-06-15', { y: 2026, m: 5, d: 30 })).toBe(37)
  })

  it('is null when either end is unparseable, rather than a misleading number', () => {
    expect(yearsBetween('not a date')).toBeNull()
    expect(yearsBetween('1988-06-15', 'nonsense')).toBeNull()
  })
})
