// @vitest-environment jsdom -- the location listing against the records it is actually handed
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import LocationListing from './LocationListing'
import { renderWithProviders } from '../../test/renderWithProviders'

/**
 * A BRANCH RECORD IS NOT REQUIRED TO CARRY MEMBERS, AND THIS PAGE ASSUMED IT WAS.
 *
 * `Locations.jsx:127` hands every `/api/branches` result straight to this component as
 * `data`. A branch row has no `members` key, so `listingData.members.map(...)` threw
 * `TypeError: Cannot read properties of undefined (reading 'map')` and the ErrorBoundary
 * replaced the entire page with *"This page could not be displayed."* — on every successful
 * location search.
 *
 * 🔴 IT WAS INVISIBLE TO EVERY INSTRUMENT POINTED AT THIS ROUTE. The width matrix loads
 * `/reports/locations` at seven widths and finds a search form that renders perfectly; the
 * route smoke mounts it and finds the same. The crash needs a *search to have been run*, and
 * nothing in the suite ran one. It was found by driving the route into the state the matrix
 * cannot reach — which is the entire argument for `05.1`'s state harness.
 *
 * The three cases below are one guard and its two non-vacuity halves:
 *
 *   ① a record without members renders, and says the location is empty
 *   ② the blank-form sample still renders its four rows        (else ① passes by rendering nothing)
 *   ③ the sample never appears under a supplied record         (else ① could be "fixed" by merging)
 *
 * ③ is the one that matters. The obvious repair — filling a real record's gaps from the
 * sample — also makes ① pass, while printing four invented members under a real branch's
 * name. That is a worse defect than the crash, and only ③ can tell the two apart.
 */

/** Exactly the shape `/api/branches` returns: no `members` key at all. */
const branchRecord = {
  id: 1,
  bankName: 'Synthetic Bank',
  branchName: 'Sample Branch',
  randomAccessNumber: '250655',
  areaRepName: 'Synthetic Area Rep',
}

describe('LocationListing, given the record Locations actually hands it', () => {
  it('renders a branch that has no members instead of taking the page down', () => {
    expect(() => renderWithProviders(<LocationListing data={branchRecord} />)).not.toThrow()

    expect(screen.getByText(/No members are recorded at this location/i)).toBeInTheDocument()
    // The listing itself is still there -- an empty members list is not an empty page.
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Mem No')).toBeInTheDocument()
  })

  it('still renders the blank form sample when no record is supplied', () => {
    // ✅ THE MUST-PASS HALF. Without it, deleting the map entirely would satisfy the case
    // above: "no members recorded" is also what a component that renders nothing says.
    renderWithProviders(<LocationListing />)

    expect(screen.getByText('SAMPLE ,A, MS')).toBeInTheDocument()
    expect(screen.getByText('PLACEHOLDER ,D, MRS')).toBeInTheDocument()
    expect(screen.queryByText(/No members are recorded/i)).not.toBeInTheDocument()
  })

  it('never fills a supplied record from the sample', () => {
    // 🔴 THE ONE THAT CATCHES THE WRONG FIX. Printing invented members under a real
    // branch heading is worse than the crash this replaced: a crash is obviously broken,
    // and a table of four people who do not work at that branch is not.
    renderWithProviders(<LocationListing data={branchRecord} />)

    expect(screen.queryByText('SAMPLE ,A, MS')).not.toBeInTheDocument()
    expect(screen.queryByText(/branch\.manager@example\.invalid/)).not.toBeInTheDocument()
    // ...and the record's own values are the ones on screen.
    expect(screen.getByText('Synthetic Area Rep')).toBeInTheDocument()
  })
})
