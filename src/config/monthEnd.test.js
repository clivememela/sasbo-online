import { describe, expect, it } from 'vitest'

import { committedVocabulary } from '../test/apiContractScan'
import {
  LIST_EMPTY_REASON, MEMBER_STATUS_KIND, MONTH_END_REFUSAL, STATUS_KIND, STATUS_REASON, WORKPLACES_SERVED, dayLabel,
  deletionCodeOptions, emptyReasonSentence, listProvenance, listRows, reasonFor, statusKind, suspensionCodeOptions,
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

describe('a status, its kind, and the reason a change into it carries (03.1, 03.2)', () => {
  it('the six statuses and their kinds are the server's, in its order', () => {
    expect(Object.entries(MEMBER_STATUS_KIND).map(([name, kind]) => ({ name, kind }))).toEqual(monthEnd.memberStatuses)
  })

  it('the kinds are the three the server knows, and no other', () => {
    expect([...new Set(monthEnd.memberStatuses.map((s) => s.kind))].sort()).toEqual(Object.values(STATUS_KIND).sort())
  })

  it('every reason a screen sends is one the server knows -- and none is ACB's or capture's', () => {
    expect(monthEnd.statusReasons).toEqual(expect.arrayContaining(Object.values(STATUS_REASON)))
    for (const theirs of ['SUBS_IN_ARREARS', 'UNPAID_SUSPENDED', 'CAPTURED']) {
      expect(monthEnd.statusReasons).toContain(theirs)
      expect(Object.values(STATUS_REASON)).not.toContain(theirs)
    }
  })

  it('the reason follows the kind, as the server judges it, and a status nobody knows has neither', () => {
    const byKind = { LEAVING: 'DELETION_CODE', SUSPENDED: 'SUSPENSION_CODE', NEITHER: 'REINSTATED' }
    for (const { name, kind } of monthEnd.memberStatuses) {
      expect(statusKind(name)).toBe(kind)
      expect(reasonFor(name)).toBe(byKind[kind])
    }
    expect(statusKind('Gone')).toBeNull()
    expect(reasonFor('Gone')).toBeNull()
  })
})

describe('SASBO's codes as a person chooses one (RC7: the number, never the row's id)', () => {
  it('every numbered deletion code the server publishes is offered by its number, the reasons under code 2 beneath it', () => {
    const options = deletionCodeOptions(monthEnd.deletionCodes)
    const numbered = monthEnd.deletionCodes.filter((row) => Number.isInteger(row.code))
    expect(options.map((o) => o.code)).toEqual(numbered.map((row) => row.code))
    expect(options.every((o) => o.label.startsWith(`${o.code} · `))).toBe(true)
    const underTwo = monthEnd.deletionCodes.filter((row) => row.under === 2).map((row) => row.name)
    expect(underTwo.length).toBeGreaterThan(0)
    expect(options.find((o) => o.code === 2).under).toEqual(underTwo)
    expect(options.filter((o) => o.code !== 2).every((o) => o.under.length === 0)).toBe(true)
  })

  it('every suspension code the server publishes is offered by its number', () => {
    expect(suspensionCodeOptions(monthEnd.suspensionCodes).map((o) => o.code))
      .toEqual(monthEnd.suspensionCodes.map((row) => row.code))
  })
})
