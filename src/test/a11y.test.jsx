// @vitest-environment jsdom -- axe walks a real DOM tree; there is nothing to scan without one
import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { axe } from 'vitest-axe'

import { DEFECTS, disabled, pin } from './knownDefects'
import MembersPage from '../pages/members/Members'
import CaptureMember from '../pages/members/CaptureMember'
import BankListing from '../pages/bank_branch/BankListing'
import { renderWithProviders } from './renderWithProviders'
import { AXE_RULES, expectNoA11yViolations } from './assertions'
import { server } from './msw/server'
import { smokeHandlers } from './msw/smokeLayer'
import { pageFixtures } from './msw/pageFixtures'

/**
 * THE ACCESSIBILITY GATE, on the three surfaces this phase names.
 *
 * WHAT IS DELIBERATELY OFF, AND WHY SAYING SO IS BETTER THAN PRETENDING
 * `color-contrast` is disabled, in `expectNoA11yViolations` rather than here,
 * so it cannot be re-enabled in one file and forgotten in another. jsdom has
 * no canvas, so axe cannot compute contrast at all -- and crucially it does
 * not FAIL when it cannot, it silently reports nothing. A rule that always
 * passes because it never ran is worse than an absent rule: it reads as
 * coverage. Contrast is a device-matrix job and is out of this arc's scope,
 * recorded rather than implied.
 *
 * STATE-GATED SURFACES ARE OPENED FIRST. Scanning a page whose content is
 * behind a tab or a loaded list means scanning an empty shell, which passes
 * trivially. Each case below waits for the surface to actually be there.
 */


beforeEach(() => {
  server.use(...smokeHandlers, ...pageFixtures)
})

describe('accessibility', () => {
  it.skip(disabled(DEFECTS.A28, 'the Members list must have no violations'), async () => {
    const { container } = renderWithProviders(<MembersPage />)
    await screen.findByText(/No Sasbo members match/i)
    await expectNoA11yViolations(container)
  })

  it.skip(
    disabled(DEFECTS.A28, 'the Members list must have no violations with rows rendered'),
    async () => {
      // The empty table and the populated table are different DOM. Scanning
      // only the empty one would miss every violation that lives in a row.
      server.use(
        http.get('*/api/members', () =>
          HttpResponse.json([
            { id: 1, firstNames: 'Synthetic', surname: 'Testperson', status: 'Active' },
          ]),
        ),
      )
      const { container } = renderWithProviders(<MembersPage />)
      await screen.findByText(/Testperson/)
      await expectNoA11yViolations(container)
    },
  )

  it(
    pin(DEFECTS.A28, 'the Members list still has exactly one violation, and it is select-name'),
    async () => {
      // Pinned NARROWLY, on purpose. Asserting "there is at least one
      // violation" would stay green if five more appeared; asserting the exact
      // set means a NEW violation reddens this test too, and the message says
      // which. The pin is a defect record, not a licence.
      const { container } = renderWithProviders(<MembersPage />)
      await screen.findByText(/No Sasbo members match/i)

      // AXE_RULES, not an inline copy. This file's own header says the rule
      // config must live only in `expectNoA11yViolations` "so it cannot be
      // re-enabled in one file and forgotten in another" -- and then restated it
      // here. This pin needs the raw violation ids rather than a pass/fail, so
      // it calls `axe` directly, but it takes the shared config to do it.
      const results = await axe(container, { rules: AXE_RULES })
      const ids = (results.violations ?? []).map((v) => v.id).sort()

      expect(
        ids,
        'The Members list violation set has changed. If it is now empty, A28 is fixed -- ' +
          'delete this pin and un-skip the two tests above. If it grew, a NEW ' +
          'accessibility defect has been introduced and needs its own row.',
      ).toEqual(['select-name'])
    },
  )

  it('the CaptureMember form has no violations', async () => {
    const { container } = renderWithProviders(<CaptureMember />)
    await waitFor(() => expect(screen.getByLabelText(/^Surname/)).toBeInTheDocument())
    await expectNoA11yViolations(container)
  })

  it('the Bank listing has no violations', async () => {
    server.use(
      http.get('*/api/banks/branches', () =>
        HttpResponse.json([
          { id: 1, bankName: 'Synthetic Bank', branchCode: '000000', universalBranchCode: '000000' },
        ]),
      ),
    )
    const { container } = renderWithProviders(<BankListing />)
    await waitFor(() => expect(container.querySelectorAll('*').length).toBeGreaterThan(5))
    await expectNoA11yViolations(container)
  })
})

describe('the a11y gate can actually fail', () => {
  it('reports a violation when one is deliberately introduced', async () => {
    // The gate's own reddening change, run inline and permanently. Without it,
    // "zero violations" is indistinguishable from "axe did not run" -- which
    // is precisely the failure mode `color-contrast` has under jsdom, one
    // block above. A gate that has never been seen to fail is not a gate.
    const { container } = renderWithProviders(
      <div>
        <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />
        <input type="text" />
      </div>,
    )

    // Both halves, because they come from different places and only one of them
    // was ever asserted.
    //
    // The first is this repository's own sentence, naming the human consequence.
    // The second is `toHaveNoViolations`'s own report -- and asserting it is what
    // proves THE MATCHER did the work. 🔴 `vitest-axe@0.1.0` ships an EMPTY
    // `dist/extend-expect.js`, so a registration that silently registers nothing
    // is a live hazard in this exact version. Without the second assertion this
    // test would pass on the prefix alone, which the prefix would supply even if
    // the matcher had been replaced by something that threw and reported
    // nothing at all.
    const failure = expectNoA11yViolations(container)

    await expect(failure).rejects.toThrow(/accessibility violation/i)
    await expect(failure).rejects.toThrow(/image-alt/)
  })
})
