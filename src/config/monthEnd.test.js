import { describe, expect, it } from 'vitest'

import { committedVocabulary } from '../test/apiContractScan'
import {
  LIST_EMPTY_REASON, MONTH_END_REFUSAL, WORKPLACES_SERVED, dayLabel, emptyReasonSentence, listProvenance, listRows,
} from './monthEnd'

/**
 * Month end's vocabulary held to the SERVER'S (`api-vocabulary.json`, `monthEnd` -- MD40): the codes the browser
 * branches on are codes the server gives, and every word the server can say of an empty list has its sentence.
 */
const monthEnd = committedVocabulary().monthEnd

describe('the month-end vocabulary is the server\'s', () => {
  it('publishes its own section, beside ACB\'s, which it does not touch', () => {
    expect(monthEnd).toBeDefined()
    expect(committedVocabulary().acb.refusalCodes.map((c) => c.code)).not.toContain('WORKPLACE_PAGE_INVALID')
  })

  it('the refusal codes the screens branch on are codes the server gives (ME-13)', () => {
    const published = monthEnd.refusalCodes.map((c) => c.code)
    expect(published).toEqual(expect.arrayContaining(Object.values(MONTH_END_REFUSAL)))
  })

  it('every reason a list can be empty for has its sentence, and no other (ME-19)', () => {
    expect(Object.keys(LIST_EMPTY_REASON)).toEqual(monthEnd.listEmptyReasons)
  })

  it('the switch\'s three words are the server\'s (MD62)', () => {
    expect(Object.values(WORKPLACES_SERVED)).toEqual(monthEnd.workplaceSwitch)
  })

  it('the published ceilings: two hundred a page, a hundred characters a search (MR-PERF-12, MR-SEC-22)', () => {
    expect(monthEnd.workplacePageMaxSize).toBe(200)
    expect(monthEnd.searchMaxLength).toBe(100)
  })
})

describe('what a person reads', () => {
  it('a day as a person writes it', () => {
    expect(dayLabel('2026-08-31')).toBe('31 August 2026')
    expect(dayLabel('2026-8-31')).toBe('2026-8-31')
    expect(dayLabel(undefined)).toBe('')
  })

  it('MD28: a list read off a report says so until SASBO confirms it', () => {
    expect(listProvenance({ printedOn: '2026-08-31', confirmedOn: null }))
      .toBe('As printed on 31 August 2026 — not yet confirmed by SASBO')
    expect(listProvenance({ printedOn: '2026-08-31', confirmedOn: '2026-10-09' }))
      .toBe('As printed on 31 August 2026 — confirmed by SASBO on 9 October 2026')
    expect(listProvenance(null)).toBe('')
  })

  it('an empty list says why; a word the browser has never heard of is shown as the server wrote it', () => {
    expect(emptyReasonSentence('NOT_LOADED')).toBe('Not loaded on this demonstration yet.')
    expect(emptyReasonSentence('SOMETHING_NEW')).toBe('SOMETHING_NEW')
  })

  it('MV-36: an answer of the wrong shape is not a list -- never an empty one', () => {
    expect(listRows({ rows: [1] })).toEqual([1])
    expect(listRows([])).toBeNull()
    expect(listRows(null)).toBeNull()
    expect(listRows({})).toBeNull()
  })
})
