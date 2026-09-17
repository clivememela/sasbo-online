// @vitest-environment jsdom -- the record's save confirmation: the form's own words, and no change that is not one
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import MembersPage from './Members'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * THE SAVE CONFIRMATION SAYS WHAT CHANGED, IN THE FORM'S OWN WORDS. `06.5`, the `06.3` critique, F-P55.
 *
 * 🔴 It listed field keys -- `isCosatu: Y → N` -- printed "No" and an empty list as "-" or nothing, and reported a
 * COSATU positions list the user had not changed: it compared lists by identity, and by type against the server's
 * "PEC,CEC" string.
 *
 *   ① the words: a changed name, a yes/no and a list, each as the form says them, and no key anywhere
 *   ② no false change: ticking a position and unticking it again leaves nothing to save
 *
 * ② is also ①'s must-pass: a confirmation that listed everything, or nothing, fails one of the two.
 */

const MEMBER = {
  id: 7,
  membershipNumber: 'M0007',
  firstNames: 'Synthetic',
  surname: 'Changer',
  initials: 'S',
  identityType: 'I.D. Number',
  identityNumber: '9001010000080',
  status: 'Active',
  paymentType: 'Payroll',
  isCosatu: 'Y',
  // ⚠️ A LIST, NOT THE SERVER'S STRING, AND ON PURPOSE. With the string, the read-only Structures view this record
  // returns to after "Nothing on this record has changed" throws on `.join` -- register row A37, pinned as open in
  // `Members.cosatu.test.jsx` and not this file's subject. The string shape in EDIT mode is covered by
  // `Members.edits.test.jsx` ⑥. A list still proves ②: a position ticked and unticked is a new list, which the old
  // comparison reported as a change.
  cosatuPositions: ['PEC', 'CEC'],
}

async function editTheRecord(user) {
  renderWithProviders(<MembersPage />)
  await user.click(await screen.findByRole('button', { name: /open the record for/i }))
  await user.click(await screen.findByRole('button', { name: /Edit Member/i }))
}

/** Press Save, and read the confirmation's list as a person reads it. */
async function listedChanges(user) {
  await user.click(screen.getByRole('button', { name: /^Save changes$/ }))
  const dialog = await screen.findByRole('dialog', { name: 'Save these changes?' })
  return within(dialog)
    .getAllByRole('listitem')
    .map((item) => item.textContent.replace(/^•\s*/, '').trim())
}

describe('the save confirmation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Two `use` calls: the catch-all first, then the specific handlers, which prepend.
    server.use(...pageFixtures)
    server.use(http.get('*/api/members', () => HttpResponse.json([MEMBER])))
  })

  it('① names each change as the form does, and reads a yes/no and a list as a person would', async () => {
    const user = setupUser()
    await editTheRecord(user)
    // In the record: the register's criteria row has an Initials search of its own.
    const initials = await within(screen.getByTestId('member-panel')).findByLabelText(/^Initials/)
    await user.clear(initials)
    await user.type(initials, 'Q')
    await user.click(screen.getByRole('button', { name: /Sasbo Structures/i }))
    await user.selectOptions(await screen.findByLabelText(/^COSATU Member\?/), 'No')

    const listed = await listedChanges(user)

    expect(listed).toEqual(
      expect.arrayContaining(['Initials: S → Q', 'COSATU Member: Yes → No', 'COSATU Positions: PEC, CEC → none']),
    )
    expect(listed.join('\n'), 'the confirmation shows a field key, not the name the form gives it').not.toMatch(
      /isCosatu|cosatuPositions|cosatuLocal|cosatuRegion/,
    )
  })

  it('② ticking a position and unticking it again leaves nothing to save', async () => {
    const user = setupUser()
    await editTheRecord(user)
    await user.click(screen.getByRole('button', { name: /Sasbo Structures/i }))
    const treasurer = await screen.findByRole('checkbox', { name: /^Treasurer/ })
    await user.click(treasurer)
    await user.click(treasurer)

    await user.click(screen.getByRole('button', { name: /^Save changes$/ }))

    expect(await screen.findByText(/Nothing on this record has changed/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Save these changes?' })).not.toBeInTheDocument()
  })
})
