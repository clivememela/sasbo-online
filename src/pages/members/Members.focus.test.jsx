// @vitest-environment jsdom -- where focus goes when the member record opens and closes
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import MembersPage from './Members'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * THE RECORD TAKES FOCUS WHEN IT OPENS, AND GIVES IT BACK WHEN IT CLOSES. `06.5`, F-P55.
 *
 * 🔴 Choosing a member moved no focus, so a keyboard user stayed on the row and a screen reader was told nothing had
 * opened; closing the record dropped focus to the page, losing their place in the register. The scrim was a second
 * "Close member details" button in the tab order and the accessibility tree.
 *
 * The close button is clicked in the first case, so that case is also the must-pass for the second: the record's own
 * close control is still a button anyone can reach.
 */

const MEMBER = {
  id: 7,
  membershipNumber: 'M0007',
  firstNames: 'Synthetic',
  surname: 'Focus',
  initials: 'S',
  status: 'Active',
  paymentType: 'Payroll Deduction',
}

describe('focus and the member record', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Two `use` calls: the catch-all first, then the specific handlers, which prepend.
    server.use(...pageFixtures)
    server.use(http.get('*/api/members', () => HttpResponse.json([MEMBER])))
  })

  /*
   * 🔄 FOLLOWING MAIN `8c6b675`: the record is a dialog. Radix puts focus inside it on open, and `Modal`'s own
   * `returnFocus` gives it back to the element that opened it -- the same promise the docked panel made, kept by a
   * different mechanism, so it is asserted the same way: focus lands inside, and comes back to the row.
   */
  it('opening a record moves focus into it, and closing it gives focus back to the row that opened it', async () => {
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    const row = await screen.findByRole('button', { name: /open the record for.*Focus/i })

    await user.click(row)
    const record = await screen.findByTestId('member-panel')
    await waitFor(() => expect(record).toContainElement(document.activeElement))

    await user.click(within(record).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(row).toHaveFocus())
  })

  it('the record has exactly one close control, and a press outside is the other way out', async () => {
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await user.click(await screen.findByRole('button', { name: /open the record for.*Focus/i }))
    const record = await screen.findByTestId('member-panel')

    // 🔄 The docked panel carried a second, screen-reader-only close beside the visible one; the dialog has one.
    expect(within(record).getAllByRole('button', { name: 'Close' })).toHaveLength(1)

    // And Escape is the other way out, through the same `onOpenChange` as the X -- so an unsaved edit is asked
    // about either way (`Members.edits` ④). A press on the scrim is Radix's third, and is not asserted here:
    // dismissal by pointer is not reproducible under jsdom, and an assertion that cannot fail is worse than none.
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByTestId('member-panel')).not.toBeInTheDocument())
  })
})
