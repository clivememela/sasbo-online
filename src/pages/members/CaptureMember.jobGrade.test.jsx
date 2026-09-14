// @vitest-environment jsdom -- renders the capture form and reads its <option> elements
import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import CaptureMember from './CaptureMember'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * THE JOB-GRADE DROPDOWN: the label is shown, the VALUE is submitted -- NT-3.
 *
 * WHY THIS IS THE ONE DROPDOWN THAT NEEDS ITS OWN TEST
 * Every other select on this form is fed a plain array of strings from
 * `memberConstants`, where the displayed text and the stored value are the same
 * thing and cannot disagree. This one is fed `{value, label}` OBJECTS from the
 * server -- `{value: "C1", label: "C1 - Clerk - Permanent"}` -- so display and
 * storage are two different fields for the first time, and a mapping that
 * confuses them is invisible on screen in one direction and corrupts data in the
 * other.
 *
 * 🔴 THE REGRESSION IT PINS is `Field`'s option mapping collapsing back to the
 * bare `opt`:
 *
 *     <option key={opt} value={opt}>{opt}</option>
 *
 * With object options that renders `[object Object]` as both the value and the
 * text -- so the screen shows nonsense AND the form submits nonsense. It is a
 * one-line simplification that looks harmless beside every other select on the
 * form, which is exactly why it needs an assertion rather than a convention.
 *
 * ⚠️ WHAT THIS DELIBERATELY DOES NOT ASSERT. `jobGradeService`'s failure paths
 * returning a different type from its success path is `A25`, a live register row
 * with a skip and a pin already asserting it in
 * `services.errorContract.test.js`. Repairing or re-asserting it here would turn
 * a deliberate red green and redden the disabled-population guards in all three
 * repositories. This file covers the SUCCESS shape, which nothing covered.
 *
 * 🔑 AND IT DRIVES THE REAL SCREEN rather than rendering the select in
 * isolation. `Field` is not exported, and exporting it to test it would be a
 * test dictating the component's shape -- the dropdown is reached the way an
 * administrator reaches it: choose a bank, and the grades for that bank arrive.
 */

/** A bank the form can resolve, and the grades that bank answers with. */
const BANK = { id: 1, bankName: 'Bidvest Bank Limited', universalBranchCode: '462005' }

const GRADES = [
  { value: 'C1', label: 'C1 - Clerk - Permanent' },
  { value: 'BA1', label: 'BA1' },
]

/**
 * The endpoints this screen touches, declared before the catch-all.
 *
 * ⚠️ ORDER MATTERS AND IT HAS BITTEN THIS SUITE BEFORE. `pageFixtures` is a
 * single wildcard `http.get` over every api path, returning an empty array, and
 * msw answers with the FIRST matching handler -- so a catch-all registered ahead
 * of these would swallow every one of them and the dropdown would render empty
 * for a reason no assertion names. The specific handlers go first.
 *
 * (The glob is described rather than quoted here on purpose: written out, its
 * closing characters end this comment block. An earlier draft slipped a
 * zero-width space in to prevent that, which `no-irregular-whitespace` caught --
 * correctly, since an invisible character in source is a worse trade than a
 * sentence.)
 */
beforeEach(() => {
  server.use(
    http.get('*/api/banks', () => HttpResponse.json([BANK])),
    http.get('*/api/banks/branches', () => HttpResponse.json([BANK])),
    http.get('*/api/job-grades', () => HttpResponse.json(GRADES)),
    ...pageFixtures,
  )
})

/**
 * Choose a bank through the searchable control.
 *
 * 🔴 THE LABEL IS ATTACHED TO NOTHING, so this cannot use `getByLabelText` --
 * and that is a defect in the screen rather than a shortcut taken here. Every
 * "searchable" field renders its `<label htmlFor>` pointing at an id the control
 * underneath never sets, so a screen reader announces an unlabelled text box.
 * That is register row `A35`, asserted by the browser suite; this reaches the
 * input through the label's own container, which is the same accommodation the
 * page object makes, for the same reason.
 */
async function chooseBank(user) {
  await openEmploymentTab(user)

  const label = await screen.findByText(/^Bank Where Employed/)
  const input = label.closest('div').querySelector('input')

  await user.type(input, 'Bidvest')
  await user.click(await screen.findByRole('option', { name: BANK.bankName }))
}

/**
 * Open the tab the bank and job-grade fields live on.
 *
 * The form opens on `Personal Information` and renders ONE tab's fields at a
 * time, so neither field exists in the DOM until this runs -- and the failure
 * without it is `Unable to find an element with the text`, which reads as a
 * renamed label rather than as an unopened tab.
 *
 * ⚠️ Matched with a leading anchor rather than exactly: a tab's accessible name
 * gains an asterisk the moment a field on it is invalid, so `{ name: 'Employment
 * & Bank', exact: true }` works until the first validation error and then stops.
 * Nothing here triggers one today; the anchor means nothing here has to keep
 * being true.
 */
async function openEmploymentTab(user) {
  await user.click(screen.getByRole('button', { name: /^Employment & Bank/ }))
}

describe('the job-grade dropdown', () => {
  it('shows each grade LABEL as its text and carries the grade CODE as its value', async () => {
    const user = setupUser()
    renderWithProviders(<CaptureMember />)

    await chooseBank(user)

    // The <option> elements themselves, because that is where the two fields
    // separate: `textContent` is what the administrator reads and `value` is
    // what the form submits. Asserting only the visible text would pass while
    // the wrong thing was being saved -- which is this defect class exactly.
    const clerk = await waitFor(() =>
      screen.getByRole('option', { name: 'C1 - Clerk - Permanent' }),
    )

    expect(clerk).toHaveValue('C1')
    expect(clerk.textContent).toBe('C1 - Clerk - Permanent')
  })

  it('renders a grade with no description as its bare code, with no dangling separator', async () => {
    const user = setupUser()
    renderWithProviders(<CaptureMember />)

    await chooseBank(user)

    // 🔑 THE SHAPE THAT SHIPPED BROKEN, kept as a client-side witness. The
    // server's label builder joined all three parts and then scrubbed the
    // separators it did not want, so a grade with no description and no contract
    // type reached the browser as `"BA1 -"`. It is fixed on the server and
    // asserted there; this is the assertion from the side a user actually sees,
    // and it is the reason the fixture above carries a one-part grade at all.
    const bare = await waitFor(() => screen.getByRole('option', { name: 'BA1' }))

    expect(bare).toHaveValue('BA1')
    expect(bare.textContent).not.toMatch(/-\s*$/)
  })

  it('offers no grades at all until a bank is chosen', async () => {
    const user = setupUser()
    renderWithProviders(<CaptureMember />)
    await openEmploymentTab(user)

    // The dropdown is disabled without a bank and `JOB_GRADE_OPTIONS` is empty,
    // so the screen shows "No job grades available". Asserted because it is the
    // state the form OPENS in -- the one every administrator sees first -- and
    // because it proves the two assertions above are about grades that arrived
    // from the server rather than about anything the component had already.
    expect(await screen.findByText('No job grades available')).toBeInTheDocument()
  })
})
