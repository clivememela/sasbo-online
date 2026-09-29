// @vitest-environment jsdom -- axe walks a real DOM tree; there is nothing to scan without one
import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import MembersPage from '../pages/members/Members'
import CaptureMember from '../pages/members/CaptureMember'
import BankListing from '../pages/bank_branch/BankListing'
import Home from '../pages/Home'
// The first screen's figures are a lazy chunk; in the registry before the scan, so it waits on the page, not on the box.
import '../pages/home/HomeFigures.jsx'
import { renderWithProviders } from './renderWithProviders'
import { expectNoA11yViolations } from './assertions'
import { server } from './msw/server'
import { monthEndAnswer } from './msw/monthEndExamples'
import { smokeHandlers } from './msw/smokeLayer'
import { pageFixtures } from './msw/pageFixtures'

/**
 * THE ACCESSIBILITY GATE, on the surfaces named below -- the three this phase named, and the first screen since
 * month end's `02.3` (MR-ROB-37).
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
  it('the Members list has no violations', async () => {
    const { container } = renderWithProviders(<MembersPage />)
    await screen.findByText(/No members match these criteria/i)
    await expectNoA11yViolations(container)
  })

  it(
    'the Members list has no violations with rows rendered',
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

  /**
   * 🔴 A28's PIN WAS HERE, AND IT IS DELETED RATHER THAN EDITED.
   *
   * It asserted the violation set was exactly `['select-name']`. The tempting change was
   * `.toEqual([])` -- one character, same file, and completely wrong: a pin records a
   * defect, so when the defect goes the pin goes with it. Editing it would have turned a
   * record of something broken into a duplicate of the two tests above, which already
   * assert no violations by discovery rather than by list.
   *
   * The fix is in `Members.jsx`: the "Identity Type" filter is `SelectInput` now, which
   * carries a real `<label htmlFor>`. See `knownDefects.js` for the retirement note and
   * for the SECOND site the register never named.
   */

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

  it('the first screen has no violations, with its figures, their sheet and the menu rows (02.3, MR-ROB-37)', async () => {
    // The server's own golden answer (MD48): a sheet with rows, a total and the marks the screen draws on them.
    server.use(monthEndAnswer('GET /api/members/summary'))
    const { container } = renderWithProviders(<Home />)
    await screen.findByText('INVENTED GROUP CORE')
    await expectNoA11yViolations(container)
  })

  it('the first screen has no violations while its figures are not available -- the shared fixture\'s empty array', async () => {
    // The state every other test of this screen sees: the strip's "not available" and the sheet's sentence.
    const { container } = renderWithProviders(<Home />)
    await screen.findByText('The figures are not available from this server yet.')
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
        {/* 🔑 THE ONE PLACE IN THIS REPOSITORY WHERE MISSING `alt` IS THE POINT, so the
            lint rule and this test assert opposite things and the test is the stronger of
            the two. `jsx-a11y/alt-text` reads this as the defect it is designed to catch;
            what it cannot see is that the defect is the FIXTURE. Disabled here, at the one
            site, with the reason -- never at config level, because a rule switched off for
            the file would then be off for every real `<img>` a future test renders, which
            is exactly the masking L20 describes.

            It cannot hide a genuine regression either: the assertions below REQUIRE axe to
            report `image-alt` here, so an `alt` added to quieten the linter turns this test
            red rather than green. */}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- deliberately invalid: this is the gate's own reddening fixture, and the assertions below require it to fail */}
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
