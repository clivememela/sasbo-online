import { describe, expect, it } from 'vitest'

import { committedVocabulary } from '../../test/apiContractScan'
import {
  CANCELLABLE, EXCLUSION_LABEL, REFUSAL, RUN_STATUS, RUN_STATUS_LABEL, asPage, calendarNotice, maskedAccount, monthLabel,
  pollRun, preparableMonths,
} from './acbRunRules'

/**
 * The Runs screen's rules, and its vocabulary held to the SERVER'S (`api-vocabulary.json`, `acb`).
 * A state or reason the server adds reddens this file instead of reaching the screen as a word
 * nobody wrote a label for.
 */

const acb = committedVocabulary().acb

describe('the run vocabulary is the server\'s', () => {
  it('every run state the server publishes, and no other, with a label for each', () => {
    expect(Object.values(RUN_STATUS)).toEqual(acb.runStatuses)
    expect(Object.keys(RUN_STATUS_LABEL)).toEqual(acb.runStatuses)
  })

  it('every exclusion reason the server publishes has the words an administrator reads', () => {
    expect(Object.keys(EXCLUSION_LABEL)).toEqual(acb.exclusionReasons.map((r) => r.name))
  })

  it('the refusal codes the screen branches on are codes the server gives', () => {
    const published = acb.refusalCodes.map((c) => c.code)
    expect(published).toEqual(expect.arrayContaining(Object.values(REFUSAL)))
  })

  it('only a proposal can be cancelled -- what the server\'s state table allows', () => {
    expect([...CANCELLABLE].sort()).toEqual([RUN_STATUS.APPROVED, RUN_STATUS.PREPARED])
  })
})

describe('monthLabel and preparableMonths', () => {
  it('names a month as an administrator says it, and passes anything else through', () => {
    expect(monthLabel('2026-10')).toBe('October 2026')
    expect(monthLabel('2026-1')).toBe('2026-1')
    expect(monthLabel(undefined)).toBe('')
  })

  it('offers this month and the next -- across a year end too', () => {
    expect(preparableMonths(new Date(2026, 8, 19)).map((m) => m.value)).toEqual(['2026-09', '2026-10'])
    expect(preparableMonths(new Date(2026, 11, 31)).map((m) => m.value)).toEqual(['2026-12', '2027-01'])
    expect(preparableMonths(new Date(2026, 11, 31))[1].label).toBe('January 2027')
  })
})

describe('calendarNotice (D30, SD3-G)', () => {
  const CALENDAR = { name: 'za-statutory', knownUntil: '2027-12-31', endingSoon: false, year: 2027, holidays: [] }

  it('names the date the calendar ends on once the server says it is near', () => {
    expect(calendarNotice({ ...CALENDAR, endingSoon: true })).toBe(
      'The holiday calendar is known until 31 Dec 2027. A month after that cannot be prepared until the calendar is extended.')
  })

  it('the must-pass twin: a calendar far from its end says nothing', () => {
    expect(calendarNotice(CALENDAR)).toBeNull()
  })

  it('no calendar on record says that nothing can be prepared -- before anyone tries', () => {
    expect(calendarNotice({ ...CALENDAR, name: 'none', knownUntil: null, endingSoon: true }))
      .toBe('No holiday calendar is on record, so no month can be prepared yet.')
  })

  it('anything that is not a calendar -- the route smoke\'s [] among them -- says nothing', () => {
    expect(calendarNotice([])).toBeNull()
    expect(calendarNotice(null)).toBeNull()
    expect(calendarNotice('za-statutory')).toBeNull()
  })
})

describe('asPage', () => {
  it('reads a server page', () => {
    expect(asPage({ content: [{ id: 1 }], page: 2, totalPages: 3, totalElements: 25 }))
      .toEqual({ content: [{ id: 1 }], page: 2, totalPages: 3, totalElements: 25 })
  })

  it('turns anything else -- the route smoke\'s [] among them -- into an empty page, never a crash', () => {
    for (const odd of [[], null, undefined, {}, { content: 'x' }]) {
      expect(asPage(odd)).toEqual({ content: [], page: 0, totalPages: 0, totalElements: 0 })
    }
  })
})

describe('maskedAccount', () => {
  it('shows the last four the server sent, or a dash', () => {
    expect(maskedAccount('9911')).toBe('•••• 9911')
    expect(maskedAccount(null)).toBe('—')
  })
})

describe('pollRun', () => {
  const answers = (...statuses) => {
    const reads = []
    const read = async (id) => {
      reads.push(id)
      return { id, status: statuses[Math.min(reads.length - 1, statuses.length - 1)] }
    }
    return { read, reads }
  }

  it('re-reads until the run leaves PREPARING, and answers the settled run', async () => {
    const { read, reads } = answers(RUN_STATUS.PREPARING, RUN_STATUS.PREPARING, RUN_STATUS.PREPARED)
    const settled = await pollRun(read, 41, { delays: [0, 0, 0, 0, 0] })
    expect(settled.status).toBe(RUN_STATUS.PREPARED)
    expect(reads).toEqual([41, 41, 41])
  })

  it('gives up after its last delay, and says so with undefined -- the screen then says "check back"', async () => {
    const { read, reads } = answers(RUN_STATUS.PREPARING)
    expect(await pollRun(read, 41, { delays: [0, 0, 0] })).toBeUndefined()
    expect(reads).toHaveLength(3)
  })

  it('stops reading the moment the screen is left, and answers null', async () => {
    const { read, reads } = answers(RUN_STATUS.PREPARING)
    let left = false
    const polling = pollRun(read, 41, { delays: [0, 0, 0, 0], stopped: () => left })
    left = true
    expect(await polling).toBeNull()
    expect(reads).toEqual([])
  })

  it('a failed read rejects -- the screen says what it could not confirm', async () => {
    const failing = async () => { throw new Error('lost') }
    await expect(pollRun(failing, 41, { delays: [0] })).rejects.toThrow('lost')
  })
})
