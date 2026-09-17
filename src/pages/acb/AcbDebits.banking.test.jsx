// @vitest-environment jsdom -- the debit-order banking change: its dialog, its failures, and what they claim
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import AcbDebits from './AcbDebits'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { setupUser } from '../../test/user'

/**
 * 🔴 THREE FINDINGS FROM P9's INDEPENDENT REVIEW, ON THE SCREEN THAT CHANGES A MEMBER'S DEBIT ORDER.
 *
 *   R4-F1  a failed update was written to the PAGE notice, under the "Update Banking Details" scrim, while the dialog
 *          in front of the user showed nothing;
 *   R3-F2  every failure said "Nothing was written" -- including a timeout or a lost connection, where the change may
 *          well have landed. On this screen that invites re-submitting a banking change whose outcome is unknown;
 *   R2-F3  Cancel was disabled while saving, but Escape, the scrim and the X still closed the dialog mid-write.
 *
 * Each has its must-pass: a refusal (4xx) still says plainly that nothing was saved, and an update that succeeds
 * closes the dialog and shows the new details.
 */

const RECORD = {
  id: 7,
  membershipNumber: 'SYN-0007',
  title: 'Mr',
  initials: 'S',
  surname: 'Testperson',
  identityNumber: '9001010000080',
  bankName: 'Synthetic Bank',
  branch: 'Sample Branch',
  bankAccountNumber: '62000000001',
  status: 'Active',
}

async function openTheBankingDialog() {
  const user = setupUser()
  renderWithProviders(<AcbDebits />)
  await user.type(screen.getByLabelText('Surname'), 'Testperson')
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  const [choose] = await screen.findAllByRole('button', { name: /load banking details/i })
  await user.click(choose)
  await user.click(await screen.findByRole('button', { name: 'Edit Details' }))
  const dialog = await screen.findByRole('dialog', { name: 'Update Banking Details' })
  return { user, dialog }
}

describe('AcbDebits, updating banking details', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(
      http.get('*/api/members', () => HttpResponse.json([RECORD])),
      http.get('*/api/members/:id', () => HttpResponse.json(RECORD)),
    )
  })

  it('R4-F1 + R3-F2: a refused update is said inside the dialog, and says it was not saved', async () => {
    server.use(
      http.patch('*/api/members/:id/banking', () =>
        HttpResponse.json({ status: 400, message: 'Account number is invalid.' }, { status: 400 }),
      ),
    )
    const { user, dialog } = await openTheBankingDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Update' }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent(/were not saved/i)
    expect(alert).toHaveTextContent('Account number is invalid.')
  })

  it('R3-F2: an update whose answer never arrived does not say nothing was written', async () => {
    server.use(http.patch('*/api/members/:id/banking', () => HttpResponse.error()))
    const { user, dialog } = await openTheBankingDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Update' }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent(/could not be confirmed/i)
    expect(alert).not.toHaveTextContent(/nothing was written|not saved/i)
  })

  it('R3-F2: a server error (5xx) cannot say nothing was written either', async () => {
    server.use(
      http.patch('*/api/members/:id/banking', () => HttpResponse.json({ status: 500, error: 'boom' }, { status: 500 })),
    )
    const { user, dialog } = await openTheBankingDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Update' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/could not be confirmed/i)
  })

  it('R2-F3: while the update runs, Escape does not close the dialog', async () => {
    server.use(http.patch('*/api/members/:id/banking', () => new Promise(() => {})))
    const { user, dialog } = await openTheBankingDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Update' }))

    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Update Banking Details' })).toBeInTheDocument()
  })

  it('the must-pass: an update that succeeds closes the dialog and shows the new details', async () => {
    server.use(
      http.patch('*/api/members/:id/banking', async ({ request }) =>
        HttpResponse.json({ ...RECORD, ...(await request.json()) }),
      ),
    )
    const { user, dialog } = await openTheBankingDialog()
    const account = within(dialog).getByLabelText('Account Number')
    await user.clear(account)
    await user.type(account, '62000000002')
    await user.click(within(dialog).getByRole('button', { name: 'Update' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('62000000002')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
