import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'

import { bankService } from './bankService'
import { server } from '../test/msw/server'

/**
 * `bankService` gets its own file for two reasons.
 *
 * First, it is the REFERENCE DOMAIN -- for the server coverage phase and for
 * the browser reference journey both. Whatever shape it has is the shape every
 * other domain is told to copy, so a defect here propagates by instruction.
 *
 * Second, it swallows failures in TWO places and only one of them is visible
 * to the four-case error contract:
 *
 *   line 148  `return []` after logging, in getBankNames        <- the contract
 *                                                                  sees this
 *   line 66   `.catch(() => [])` on the INNER /api/banks call,
 *             inside getBankListing                             <- invisible to
 *                                                                  the contract
 *
 * The second one is the interesting one. `getBankListing` fetches branches,
 * then fetches banks to attach each branch's universal branch code. If the
 * BANKS call fails, the outer promise still RESOLVES -- with branches whose
 * universal codes are silently missing. The four-case contract fails every
 * endpoint at once, so the outer call fails too and the swallow never shows.
 * It takes a test that fails exactly one of the two requests, which is what
 * this file does.
 */

const BRANCHES = [
  { id: 1, bankName: 'Standard Bank', branchCode: '051001' },
  { id: 2, bankName: 'Absa Bank', branchCode: '632005' },
]

const BANKS = [
  { name: 'Standard Bank', universalBranchCode: '051001' },
  { name: 'Absa Bank', universalBranchCode: '632005' },
]

const branchesOk = () => http.get('*/api/banks/branches', () => HttpResponse.json(BRANCHES))
const banksOk = () => http.get('*/api/banks', () => HttpResponse.json(BANKS))
const banksFail = () =>
  http.get('*/api/banks', () => HttpResponse.json({ status: 500, error: 'boom' }, { status: 500 }))

describe('bankService.getBankListing', () => {
  it('attaches each branch its universal branch code when both calls succeed', async () => {
    server.use(branchesOk(), banksOk())
    const listing = await bankService.getBankListing()
    expect(listing.map((b) => b.universalBranchCode)).toEqual(['051001', '632005'])
  })

  it('matches a bank name that differs only by decoration', async () => {
    // The comparable-key logic strips "bank", "limited", "the", punctuation and
    // so on. That is real behaviour a screen depends on, and it is the kind of
    // normalisation that silently stops working.
    server.use(
      http.get('*/api/banks/branches', () =>
        HttpResponse.json([{ id: 9, bankName: 'The Standard Bank of South Africa Ltd' }]),
      ),
      http.get('*/api/banks', () =>
        HttpResponse.json([{ name: 'Standard Bank', universalBranchCode: '051001' }]),
      ),
    )
    const [branch] = await bankService.getBankListing()
    expect(
      branch.universalBranchCode,
      'The decorated bank name did not match its plain counterpart, so the branch shows ' +
        'no universal code. A member copying that code off the screen to set up a debit ' +
        'order has nothing to copy.',
    ).toBe('051001')
  })

  describe('the second swallow -- the inner /api/banks failure', () => {
    /*
     * ⚠️ THE INNER FALLBACK SURVIVES 06.1a, AND IT IS NO LONGER A13 -- IT IS A CLASSIFICATION.
     *
     * A13 is closed: the listing's PRIMARY call (`/api/banks/branches`) rejects properly now. What
     * remains is the SECOND, enrichment call to `/api/banks`, which supplies the universal branch
     * codes and still falls back to `[]`. That is deliberate and documented at the site: losing it
     * empties one column rather than the page, which is EH-D9's "partial failure stays partial"
     * rather than "failure indistinguishable from emptiness".
     *
     * 🔑 SO THIS TEST IS RE-AIMED AT THE REAL REMAINING DEFECT, which is not the fallback but its
     * SHAPE -- and that is worth keeping because it is genuinely surprising. It cites no register
     * row because closing A13 would otherwise have taken the only assertion covering this
     * behaviour with it.
     */
    it('a failed /api/banks call degrades the listing rather than losing it', async () => {
      server.use(branchesOk(), banksFail())
      const listing = await bankService.getBankListing()

      expect(
        listing,
        'The enrichment call failing now loses the whole listing. One missing column is the ' +
          'intended degradation; a blank page is not.',
      ).toHaveLength(2)

        // This is the damage, asserted rather than described -- and it is worse
        // than "the codes are blank". When the banks call fails, `banksResult`
        // is [] and the method returns `branches` UNMAPPED, so the
        // `universalBranchCode` key is ABSENT rather than empty.
        //
        // So the resolved SHAPE depends on whether a request the caller never
        // made succeeded. On the happy path every branch carries the key; on
        // this path none of them do. A consumer reading
        // `branch.universalBranchCode.trim()` works all day and throws the
        // first time /api/banks has a bad minute -- and the stack trace points
        // at the screen, not at the swallow three layers down that caused it.
        expect(listing.map((b) => b.universalBranchCode)).toEqual([undefined, undefined])
        expect(Object.hasOwn(listing[0], 'universalBranchCode')).toBe(false)
      },
    )
  })
})

describe('bankService.getBankNames -- the first swallow', () => {
  it('sorts the names it does return', async () => {
    server.use(
      http.get('*/api/banks', () =>
        HttpResponse.json([{ name: 'Standard Bank' }, { name: 'Absa Bank' }]),
      ),
    )
    // Asserted against an UNSORTED fixture on purpose. A sorted fixture would
    // pass whether the service sorted or not -- the vacuous-assertion trap the
    // existing server tests were caught by (register E1).
    expect(await bankService.getBankNames()).toEqual(['Absa Bank', 'Standard Bank'])
  })

  // ✅ A13's PAIR, FLIPPED BY 06.1a. The pin that asserted an empty list is deleted; this is the
  // standard-facing test it was blocking.
  it('a failed bank-name fetch does NOT read as "there are no banks"', async () => {
    server.use(banksFail())
    await expect(bankService.getBankNames()).rejects.toThrow()
  })

  it('CAN distinguish "the backend is down" from "there are no banks"', async () => {
    // 🔑 INVERTED, NOT DELETED -- the same fact stated the right way round, which is what would
    // notice a regression. It used to assert `whenDown === whenEmpty`, i.e. that the two were
    // INDISTINGUISHABLE, and that assertion was the register row in one line. Now one rejects and
    // the other resolves empty, and this is the test that fails if the `.catch` ever comes back.
    server.use(banksFail())
    await expect(bankService.getBankNames()).rejects.toThrow()

    server.resetHandlers()
    server.use(http.get('*/api/banks', () => HttpResponse.json([])))
    expect(await bankService.getBankNames()).toEqual([])
  })
})

describe('bankService payload tolerance', () => {
  it.each([
    ['a bare array', [{ name: 'Absa Bank' }]],
    ['a Spring page', { content: [{ name: 'Absa Bank' }] }],
    ['a data envelope', { data: [{ name: 'Absa Bank' }] }],
    ['an items envelope', { items: [{ name: 'Absa Bank' }] }],
  ])('reads bank names out of %s', async (_shape, payload) => {
    server.use(http.get('*/api/banks', () => HttpResponse.json(payload)))
    expect(await bankService.getBankNames()).toEqual(['Absa Bank'])
  })

  it('an unrecognised payload shape yields nothing rather than throwing', async () => {
    // Pinned deliberately: `normalizeListPayload` returns [] for anything it
    // does not recognise, which is the same value as "the backend is down"
    // (A13) and as "there are no banks". Three distinct facts, one value. The
    // tolerance is defensible; the collapsing of the three is the problem, and
    // this records the third contributor to it.
    server.use(http.get('*/api/banks', () => HttpResponse.json({ unexpected: 'shape' })))
    expect(await bankService.getBankNames()).toEqual([])
  })
})
