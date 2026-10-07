import { describe, expect, it } from 'vitest'

import { committedVocabulary } from '../../test/apiContractScan'
import { PERMISSIONS } from '../../auth/permissions'
import {
  DEBIT_DAY_OPTIONS, DOD_READ, DOD_REFUSAL, RE_DEBIT_LABEL, callerRefusal, canAny, codeSays, memberName, problemsOf,
  readFailure, refusalCode, runFileName, writeOutcome,
} from './dodRules'

/** A rejection as `parseApiError` builds one: the server's envelope under `body`, the HTTP facts beside it. */
const rejection = (status, body) => Object.assign(new Error(body?.message ?? 'refused'), { kind: 'http', status, body })

describe('the Debit Order words are the server\'s', () => {
  it('every refusal the screens answer in their own words is one the server publishes', () => {
    const published = committedVocabulary().acb.refusalCodes.map((c) => c.code)
    expect(published).toEqual(expect.arrayContaining(Object.values(DOD_REFUSAL)))
  })

  it('reading a run is any of the three Debit Order permissions -- none of which an organiser holds (DOD-14)', () => {
    expect(DOD_READ).toEqual([PERMISSIONS.DOD_PREPARE, PERMISSIONS.DOD_FILE, PERMISSIONS.DOD_SETTINGS])
    expect(canAny((p) => p === PERMISSIONS.DOD_FILE, DOD_READ)).toBe(true)
    expect(canAny((p) => p === PERMISSIONS.MEMBERS_VIEW, DOD_READ)).toBe(false)
  })
})

describe('codeSays', () => {
  it('says a code\'s meaning and that it may be re-debited, on whose word (Stephne, DOD-03)', () => {
    expect(codeSays({ wording: 'Not provided for', reDebit: 'YES', reDebitSource: 'Stephne, DOD-03' }))
      .toBe('Not provided for · May be re-debited (Stephne, DOD-03)')
  })

  it('says plainly where SASBO has not yet said (Friday item 9)', () => {
    expect(codeSays({ wording: 'Account closed', reDebit: 'UNKNOWN' })).toBe(`Account closed · ${RE_DEBIT_LABEL.UNKNOWN}`)
    expect(RE_DEBIT_LABEL.UNKNOWN).toMatch(/not yet confirmed by SASBO/)
  })
})

describe('callerRefusal and writeOutcome', () => {
  it('an anonymous caller is asked to sign in, naming what the route needs', () => {
    const error = rejection(403, { code: 'IDENTITY_REQUIRED', message: 'x', details: { permission: 'DOD_FILE' } })
    expect(callerRefusal(error)).toBe('Sign in to download the debit order file.')
    expect(writeOutcome(error, 'The download')).toEqual({ message: 'Sign in to download the debit order file. Nothing was changed.', landed: false })
  })

  it('a signed-in user without the permission is told whom to ask, never to sign in', () => {
    const error = rejection(403, { code: 'PERMISSION_REQUIRED', message: 'x', permission: 'DOD_SETTINGS' })
    expect(callerRefusal(error)).toBe('You need permission to change debit order settings. Ask your administrator if you should have it.')
  })

  it('a write that may have landed is never called unsaved, and says to check first', () => {
    const timeout = Object.assign(new Error('slow'), { kind: 'timeout', status: 0 })
    expect(writeOutcome(timeout, 'The approval')).toMatchObject({ landed: true, message: expect.stringMatching(/^The approval could not be confirmed\./) })
    expect(writeOutcome(rejection(503, null), 'The approval').landed).toBe(true)
  })

  it('the must-pass: a refusal wrote nothing, and says the server\'s own sentence', () => {
    const error = rejection(422, { code: 'RUN_EMPTY', message: 'A run with no debits cannot be approved.' })
    expect(writeOutcome(error, 'The approval')).toEqual({
      message: 'The approval was not recorded. Nothing was written: A run with no debits cannot be approved.', landed: false,
    })
    expect(refusalCode(error)).toBe('RUN_EMPTY')
    expect(refusalCode(new Error('offline'))).toBeNull()
  })

  it('a failed read keeps the screen\'s words unless the caller was refused', () => {
    expect(readFailure(rejection(500, null), 'We could not load the codes.')).toBe('We could not load the codes.')
  })
})

describe('the small rules', () => {
  it('names the bank file as the July file did when the server\'s name cannot be read', () => {
    expect(runFileName('2026-10')).toBe('sasbosub.oct')
    expect(runFileName('2027-01')).toBe('sasbosub.jan')
    expect(runFileName(undefined)).toBe('sasbosub')
  })

  it('lists a refusal\'s numbered problems in their order, never by text', () => {
    const error = rejection(422, { code: 'RETURNS_BATCH_INVALID', details: { problems: '3', 'problem.10': 'tenth', 'problem.2': 'second', 'problem.1': 'first' } })
    expect(problemsOf(error)).toEqual(['first', 'second', 'tenth'])
    expect(problemsOf(rejection(500, null))).toEqual([])
  })

  it('offers the debit days of the window, the 20th to the 31st', () => {
    expect(DEBIT_DAY_OPTIONS.map((o) => o.label)).toEqual(['20th', '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th', '30th', '31st'])
  })

  it('names a member as a sentence does', () => {
    expect(memberName({ initials: 'S', surname: 'Testperson' })).toBe('S Testperson')
    expect(memberName({ membershipNumber: 'SYN-0007' })).toBe('SYN-0007')
    expect(memberName(null)).toBe('this member')
  })
})
