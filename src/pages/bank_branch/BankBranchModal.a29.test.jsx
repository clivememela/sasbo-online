// @vitest-environment jsdom -- renders the branch modal inside the route's error boundary
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import BankBranchModal from './BankBranchModal'
import ErrorBoundary from '../../components/common/ErrorBoundary'
import { renderWithProviders } from '../../test/renderWithProviders'
import { setupUser } from '../../test/user'
import { DEFECTS, disabled, pin } from '../../test/knownDefects'

/**
 * A29 AT THE CLIENT: editing a bank branch crashes the screen.
 *
 * Until now this row was asserted in ONE place, the browser suite's
 * `banks-and-branches.feature`, which needs the whole compose stack. A fix to
 * `AddressAutocomplete` would redden that scenario only on the next full gate --
 * and on 2026-09-16 the full gate could not run at all against main (C13). This
 * pair makes the same row visible in thirty seconds of `npm test`.
 *
 * 🔑 THE FIXTURE IS THE API'S SHAPE, NOT A GUESS. `physicalAddress` arrives as an
 * OBJECT for every one of the 68 seeded branches (measured by P5 against the live
 * stack). The read-only view survives it because `DetailItem` formats objects; the
 * edit form hands the object straight to `AddressAutocomplete`, whose debounce
 * effect calls `query.trim()` on mount.
 *
 * ⚠️ THE BLAST RADIUS SHRANK AND THE DEFECT DID NOT. Before the design merge there was
 * no boundary and the whole application unmounted; now `Main.jsx` puts one beside the
 * outlet, so the SCREEN falls and the shell stands. The boundary is rendered here
 * explicitly, the way `Main.jsx` renders it, so the pin asserts what a user sees.
 */
const BRANCH = {
  id: 1,
  bankName: 'Absa Bank Limited',
  branch: 'Sandton',
  branchCode: '632005',
  physicalAddress: {
    streetNumber: '15',
    streetName: 'Alice Lane',
    suburb: { name: 'Sandown' },
    city: { name: 'Sandton' },
    postalCode: '2196',
  },
  postalAddress: 'PO Box 1, Sandton, 2146',
}

function renderBranch(onError) {
  renderWithProviders(
    <ErrorBoundary onError={onError}>
      <BankBranchModal selectedBank={BRANCH} onClose={() => {}} />
    </ErrorBoundary>,
  )
}

describe('editing a branch whose address arrives as an object', () => {
  beforeEach(() => {
    // Silencing only: React logs a render error before the boundary catches it. The
    // log is not asserted -- the boundary's error is.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it.skip(
    disabled(DEFECTS.A29, 'the edit form opens with the address as editable text'),
    async () => {
      // Written to the correct behaviour: the form the Edit button opens is a form. The
      // read-only view already knows how to turn this object into a line of text.
      const user = setupUser()
      renderBranch()

      await user.click(await screen.findByRole('button', { name: 'Edit' }))

      expect(await screen.findByRole('combobox', { name: 'Physical Address' })).toHaveValue(
        expect.stringContaining('Alice Lane'),
      )
    },
  )

  it(pin(DEFECTS.A29, 'Edit throws on the address and the screen falls to its error page'), async () => {
    const errors = []
    const user = setupUser()
    renderBranch((error) => errors.push(error))

    // Must-pass first: the read-only view renders the same record, so a failure below
    // is about EDITING and not about a fixture the modal cannot open at all.
    expect(await screen.findByText(BRANCH.branchCode)).toBeInTheDocument()
    expect(errors).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(await screen.findByText('This page could not be displayed.')).toBeInTheDocument()
    // WHICH call on WHAT is the useful half of the finding: `.trim` on a non-string.
    expect(errors.map((e) => e.message)).toEqual([expect.stringMatching(/\.trim is not a function/)])
  })
})
