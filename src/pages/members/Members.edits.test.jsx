// @vitest-environment jsdom -- the member record's edit: never thrown away without a word, and a save that shows it is running
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import MembersPage from './Members'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * EDITS ARE NEVER LOST SILENTLY. `06.5`, the `06.3` critique, F-P55.
 *
 * 🔴 With the record in edit mode and a field changed, choosing another member, the close button, the scrim or
 * Escape threw the change away without a word -- and the next member opened already in edit mode. "Save changes"
 * closed its confirmation before the write and showed nothing while the write ran.
 *
 * The pairs, because each guard has a wrong fix that satisfies it alone:
 *   ① a changed edit asks before switching            ② and "Discard changes" still switches, to a record to read
 *   ③ an edit with NO changes switches without asking, and the next member opens to be read
 *   ④ the close button asks too
 *   ⑤ the confirmation stays open, busy, until the save has answered -- and then closes and says so
 *   ⑥ COSATU positions that arrive as the server's one string can be unticked in edit mode, and are saved as a list
 */

const ALPHA = {
  id: 7,
  membershipNumber: 'M0007',
  firstNames: 'Synthetic',
  surname: 'Alpha',
  initials: 'S',
  identityType: 'I.D. Number',
  identityNumber: '9001010000080',
  status: 'Active',
  paymentType: 'Payroll',
}
const BRAVO = { ...ALPHA, id: 8, membershipNumber: 'M0008', surname: 'Bravo', identityNumber: '8506155000084' }

const panel = () => within(screen.getByTestId('member-panel'))

async function editAlpha({ change }) {
  const user = setupUser()
  renderWithProviders(<MembersPage />)
  await user.click(await screen.findByRole('button', { name: /open the record for.*Alpha/i }))
  await user.click(await screen.findByRole('button', { name: /Edit Member/i }))
  if (change) {
    // In the record: the register's criteria row has an Initials search of its own.
    const initials = await panel().findByLabelText(/^Initials/)
    await user.clear(initials)
    await user.type(initials, 'Q')
  }
  return user
}

describe('the member record, mid-edit', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Two `use` calls: the catch-all first, then the specific handlers, which prepend.
    server.use(...pageFixtures)
    server.use(http.get('*/api/members', () => HttpResponse.json([ALPHA, BRAVO])))
  })

  it('① choosing another member with a changed field asks first -- and "Keep editing" keeps the change', async () => {
    const user = await editAlpha({ change: true })
    await user.click(screen.getByRole('button', { name: /open the record for.*Bravo/i }))

    const dialog = await screen.findByRole('dialog', { name: /Discard your changes/ })
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Discard your changes/ })).not.toBeInTheDocument())
    expect(panel().getByLabelText(/^Initials/)).toHaveValue('Q')
    expect(panel().getByText('Synthetic Alpha')).toBeInTheDocument()
  })

  it('② the must-pass: "Discard changes" switches, and the next member opens to be read', async () => {
    const user = await editAlpha({ change: true })
    await user.click(screen.getByRole('button', { name: /open the record for.*Bravo/i }))
    const dialog = await screen.findByRole('dialog', { name: /Discard your changes/ })
    await user.click(within(dialog).getByRole('button', { name: 'Discard changes' }))

    expect(await panel().findByText('Synthetic Bravo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Edit Member/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Save changes$/ })).not.toBeInTheDocument()
  })

  it('③ an edit with no changes switches without asking -- and the next member opens to be read, not edited', async () => {
    const user = await editAlpha({ change: false })
    await user.click(screen.getByRole('button', { name: /open the record for.*Bravo/i }))

    expect(await panel().findByText('Synthetic Bravo')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /Discard your changes/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Edit Member/i })).toBeInTheDocument()
  })

  it('④ the close button asks too, when the edit has changes', async () => {
    const user = await editAlpha({ change: true })
    await user.click(panel().getByRole('button', { name: 'Close member details' }))

    expect(await screen.findByRole('dialog', { name: /Discard your changes/ })).toBeInTheDocument()
    expect(panel().getByLabelText(/^Initials/)).toHaveValue('Q')
  })

  it('⑤ the save confirmation stays open and busy until the save has answered, then closes and says so', async () => {
    let answer
    const answered = new Promise((resolve) => {
      answer = resolve
    })
    server.use(
      http.put('*/api/members/:id', async ({ request }) => {
        const body = await request.json()
        await answered
        return HttpResponse.json(body)
      }),
    )
    const user = await editAlpha({ change: true })
    await user.click(screen.getByRole('button', { name: /^Save changes$/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Save these changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    // The write has not answered: the confirmation is still there, and its button says it is working.
    expect(screen.getByRole('dialog', { name: 'Save these changes?' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Save changes/ })).toHaveAttribute('aria-busy', 'true')

    answer()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Save these changes?' })).not.toBeInTheDocument())
    expect(await screen.findByText(/record saved/)).toBeInTheDocument()
  })

  it("⑥ COSATU positions that arrive as the server's string can be unticked in edit mode, and are saved as a list", async () => {
    // 🔴 `MemberDto.cosatuPositions` is a String ("PEC,CEC"). Entering edit mode copied the record raw, so the checkbox
    // group got a string: unticking a position called `.filter` on it and threw, and nothing was left to save.
    let saved
    server.use(
      http.get('*/api/members', () => HttpResponse.json([{ ...ALPHA, isCosatu: 'Y', cosatuPositions: 'PEC,CEC' }, BRAVO])),
      http.put('*/api/members/:id', async ({ request }) => {
        saved = await request.json()
        return HttpResponse.json(saved)
      }),
    )
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await user.click(await screen.findByRole('button', { name: /open the record for.*Alpha/i }))
    await user.click(await screen.findByRole('button', { name: /Edit Member/i }))
    await user.click(screen.getByRole('button', { name: /Sasbo Structures/i }))

    await user.click(await screen.findByRole('checkbox', { name: /^CEC/ }))
    await user.click(screen.getByRole('button', { name: /^Save changes$/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Save these changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(saved).toBeDefined())
    expect(saved.cosatuPositions).toEqual(['PEC'])
  })
})
