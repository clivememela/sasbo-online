// @vitest-environment jsdom -- mounts the welcome-letter dialog and answers its send request
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import WelcomeLetter from './WelcomeLetter'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { setupUser } from '../../test/user'

/**
 * THE WELCOME LETTER, AFTER A MEMBER IS CAPTURED. Three register rows, each written red first:
 *
 *   A50  a letter that WAS sent is reported as failed. The server answers `POST .../send-welcome` with an empty
 *        200 (`ResponseEntity.ok().build()`), and a read that requires JSON rejects it -- so the dialog said "could
 *        not be sent", and a second press emailed the member twice.
 *   A51  only the first member captured in a visit can be sent a letter. The dialog stays mounted and its send state
 *        was never reset, so the next member's dialog opened already "Sent", with no Send button.
 *   A52  the letter's banner read "Your Sasbo Membership No: —" for every new member. Nothing assigns a membership
 *        number yet (A54, the server's), so no test here expects one: the dialog must SAY the letter goes without it.
 *
 * Each red case has its must-pass beside it: a real failure is still reported; the same member is not reset by a
 * re-render; a member who has a number shows it.
 */

const sent = (status = 200) => http.post('*/api/members/:id/send-welcome', () => new HttpResponse(null, { status }))
/** A JSON answer: what the dialog's old read could accept -- so A51's cases reach "sent" on either side of A50's fix. */
const sentWithBody = () => http.post('*/api/members/:id/send-welcome', () => HttpResponse.json({}))

const person = (id, extra = {}) => ({
  id, title: 'Ms', firstNames: 'Thandi', surname: `Synthetic${id}`, personalEmail: `member${id}@example.test`,
  preferredEmail: 'personal', identityNumber: '9001010000000', bankName: 'Synthetic Bank', status: 'Active', ...extra,
})

/** Captures two members in one visit, as CaptureMember does: the dialog stays mounted, its member changes. */
function TwoCaptures() {
  const [member, setMember] = useState(person(101))
  const [open, setOpen] = useState(true)
  return (
    <>
      <button type="button" onClick={() => { setMember(person(102)); setOpen(true) }}>capture the next member</button>
      <button type="button" onClick={() => setOpen(true)}>reopen</button>
      <WelcomeLetter open={open} onClose={() => setOpen(false)} member={member} />
    </>
  )
}

describe('the welcome letter dialog', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('A50 — a sent letter is reported as sent', () => {
    it('an empty 200 from the server reads as sent, not as a failure', async () => {
      server.use(sent(200))
      const user = setupUser()
      renderWithProviders(<WelcomeLetter open onClose={() => {}} member={person(101)} />)

      await user.click(screen.getByRole('button', { name: /send welcome letter/i }))

      expect(await screen.findByText(/welcome letter sent/i)).toBeInTheDocument()
      expect(screen.queryByText(/could not be sent|not valid json|unexpected/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /send welcome letter/i })).not.toBeInTheDocument()
    })

    it('must-pass: a server failure is still reported, and the letter can be sent again', async () => {
      server.use(sent(500))
      const user = setupUser()
      renderWithProviders(<WelcomeLetter open onClose={() => {}} member={person(101)} />)

      await user.click(screen.getByRole('button', { name: /send welcome letter/i }))

      expect(await screen.findByRole('button', { name: /send welcome letter/i })).toBeEnabled()
      expect(screen.queryByText(/welcome letter sent/i)).not.toBeInTheDocument()
      // The server's own message reaches the person (the shared error contract, 06.1a).
      expect(screen.getByText(/the server could not complete that request/i)).toBeInTheDocument()
    })
  })

  describe('A51 — every member captured in a visit can be sent a letter', () => {
    it('the next member opens ready to send, not already "sent"', async () => {
      server.use(sentWithBody())
      const user = setupUser()
      renderWithProviders(<TwoCaptures />)

      await user.click(screen.getByRole('button', { name: /send welcome letter/i }))
      await screen.findByText(/welcome letter sent/i)
      await user.keyboard('{Escape}')
      await user.click(screen.getByRole('button', { name: /capture the next member/i }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getAllByText(/Synthetic102/).length).toBeGreaterThan(0)
      expect(within(dialog).getByRole('button', { name: /send welcome letter/i })).toBeEnabled()
      expect(within(dialog).queryByText(/welcome letter sent/i)).not.toBeInTheDocument()
    })

    it('must-pass: reopening the SAME member keeps what was already sent', async () => {
      server.use(sentWithBody())
      const user = setupUser()
      renderWithProviders(<TwoCaptures />)

      await user.click(screen.getByRole('button', { name: /send welcome letter/i }))
      await screen.findByText(/welcome letter sent/i)
      await user.keyboard('{Escape}')
      await user.click(screen.getByRole('button', { name: /reopen/i }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText(/welcome letter sent/i)).toBeInTheDocument()
    })
  })

  describe('the outcome of a send is announced, not only drawn', () => {
    it('a sent letter is a status message, a failed one an alert', async () => {
      server.use(sent(200))
      const user = setupUser()
      const { unmount } = renderWithProviders(<WelcomeLetter open onClose={() => {}} member={person(101)} />)
      await user.click(screen.getByRole('button', { name: /send welcome letter/i }))
      expect(await screen.findByRole('status')).toHaveTextContent(/welcome letter sent/i)
      unmount()

      server.use(sent(500))
      renderWithProviders(<WelcomeLetter open onClose={() => {}} member={person(101)} />)
      await user.click(screen.getByRole('button', { name: /send welcome letter/i }))
      expect(await screen.findByRole('alert')).toBeInTheDocument()
    })
  })

  describe('A56 — a letter with nowhere to go is not offered', () => {
    // The server refuses it (400, "No email address is available for this member.", pinned in server 93c11d9), so the
    // defect is only the offer: "emailed as an attachment to —" beside an enabled Send.
    it('a member with no email address: Send is not offered, and the dialog says why', () => {
      renderWithProviders(
        <WelcomeLetter open onClose={() => {}} member={person(101, { personalEmail: '', workEmail: '' })} />,
      )

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByRole('button', { name: /send welcome letter/i })).toBeDisabled()
      expect(within(dialog).getByText(/no email address/i)).toBeInTheDocument()
      expect(dialog).not.toHaveTextContent(/attachment to\s*—/)
    })

    it('must-pass: a member with a work address only, preferring work, can be sent the letter', () => {
      renderWithProviders(
        <WelcomeLetter open onClose={() => {}} member={person(101, { personalEmail: '', workEmail: 'work101@example.test', preferredEmail: 'work' })} />,
      )

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByRole('button', { name: /send welcome letter/i })).toBeEnabled()
      expect(within(dialog).getByText('work101@example.test')).toBeInTheDocument()
    })
  })

  describe('A52 — the letter says what it will carry, not a dash', () => {
    it('a member with no membership number: the dialog says the letter goes without one', () => {
      renderWithProviders(<WelcomeLetter open onClose={() => {}} member={person(101)} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).not.toHaveTextContent(/Membership No:\s*—/)
      expect(within(dialog).getAllByText(/no membership number/i).length).toBeGreaterThan(0)
    })

    it('must-pass: a member who has a number is shown it, and no warning', () => {
      renderWithProviders(<WelcomeLetter open onClose={() => {}} member={person(101, { membershipNumber: '100042' })} />)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('100042')).toBeInTheDocument()
      expect(within(dialog).queryByText(/no membership number/i)).not.toBeInTheDocument()
    })
  })

  describe('R2-F3, the one write-bearing dialog it missed — no way out while the letter is sending', () => {
    /*
     * 🔴 FOUND BY P10's COMPONENT INVENTORY, NOT BY P9's REVIEW. R2-F3 gave `Modal` a `busy` prop so a dialog
     * cannot be closed while its write is in flight -- otherwise the result lands on a surface the user has
     * already left, and they cannot tell whether it happened. `ConfirmDialog`, `AcbDebits` and `BankBranchModal`
     * all pass it. This dialog holds `sendState === 'sending'` and did not, so Escape, the scrim and the X all
     * closed it mid-send.
     *
     * ⚠️ AND `busy` ALONE WOULD NOT HAVE BEEN THE FIX, which is why the second assertion is here. The footer has
     * its own Close button calling `onClose` directly; `Modal` cannot intercept that, so it has to be disabled
     * by the caller while sending -- exactly what `ConfirmDialog` does with its Cancel.
     *
     * The send is HELD until the test releases it, so "while sending" is a state the test is in, not a race.
     */
    function held() {
      let release
      const answered = new Promise((resolve) => {
        release = resolve
      })
      return {
        handler: http.post('*/api/members/:id/send-welcome', async () => {
          await answered
          return new HttpResponse(null, { status: 200 })
        }),
        release: () => release(),
      }
    }

    it('while sending, Escape does not close it and the footer Close is disabled', async () => {
      const send = held()
      server.use(send.handler)
      const onClose = vi.fn()
      const user = setupUser()
      renderWithProviders(<WelcomeLetter open onClose={onClose} member={person(101)} />)

      try {
        await user.click(screen.getByRole('button', { name: /send welcome letter/i }))
        await screen.findByRole('button', { name: /sending/i })

        await user.keyboard('{Escape}')
        expect(onClose, 'Escape closed the dialog while the letter was still sending').not.toHaveBeenCalled()

        const dialog = screen.getByRole('dialog')
        // BOTH ways out named Close -- the header's X (held by `busy`) and the footer's own button (which `busy`
        // cannot reach, so the dialog disables it) -- and there must be two, or one of them went missing.
        const closes = within(dialog).getAllByRole('button', { name: /^Close$/ })
        expect(closes).toHaveLength(2)
        closes.forEach((button) => expect(button).toBeDisabled())
      } finally {
        send.release()
      }
    })

    it('the must-pass: once the send has answered, Escape closes it again', async () => {
      // 🔑 Without this, a dialog that could NEVER be closed would pass the test above.
      server.use(sent())
      const onClose = vi.fn()
      const user = setupUser()
      renderWithProviders(<WelcomeLetter open onClose={onClose} member={person(101)} />)

      await user.click(screen.getByRole('button', { name: /send welcome letter/i }))
      await screen.findByText('Welcome Letter Sent')
      await user.keyboard('{Escape}')

      expect(onClose).toHaveBeenCalled()
    })
  })
})
