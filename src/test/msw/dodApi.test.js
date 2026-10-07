import { describe, expect, it } from 'vitest'

import { committedSurface, committedVocabulary } from '../apiContractScan'
import { BANK_CODES, CODES, dodRoutes, runOf, unpaidOf } from './dodApi'

/**
 * The Debit Order handlers answer what `contracts/dod-api.md` says the server answers: every `/api/acb` route of the
 * committed API surface, and no route it does not have. A route the server adds or drops reddens here before a screen
 * is tested against a guess. Their words are the vocabulary's, so a test never passes on a value the server never sends.
 */
describe('the Debit Order handlers mirror the contract', () => {
  it('answer every /api/acb route in the committed surface, and nothing else', () => {
    const surface = committedSurface().filter((line) => line.split(' ')[1].startsWith('/api/acb/'))
    expect(surface.length).toBeGreaterThan(40)
    expect(Object.keys(dodRoutes({ run: runOf(), batches: [] })).sort()).toEqual([...surface].sort())
  })

  it('speak the server\'s words: run states, unpaid reasons and decisions it publishes', () => {
    const acb = committedVocabulary().acb
    expect(acb.runStatuses).toContain(runOf().status)
    expect(acb.unpaidReasons).toEqual(expect.arrayContaining(BANK_CODES.map((c) => c.reason)))
    expect(acb.unpaidDecisions).toContain(unpaidOf().suggestedDecision)
  })

  it('carry her sheet: a SASBO code for every bank code but the 18, and every re-debit answer one of three', () => {
    for (const code of CODES.bankCodes) {
      expect(['YES', 'NO', 'UNKNOWN']).toContain(code.reDebit)
      if (code.bankCode !== '18') expect(CODES.suspensionCodes.map((s) => s.code)).toContain(code.suspensionCode)
    }
    // Nothing is said about 6, 15, 18 or 26 (Friday item 9): each stays unknown, and provisional.
    for (const bankCode of ['6', '15', '18', '26']) {
      expect(CODES.bankCodes.find((c) => c.bankCode === bankCode)).toMatchObject({ reDebit: 'UNKNOWN', provisional: true })
    }
  })
})
