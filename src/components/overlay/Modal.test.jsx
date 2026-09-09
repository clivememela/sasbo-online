// @vitest-environment jsdom -- opens a real portalled dialog and traps focus in it
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { useState } from 'react'

import Modal, { ConfirmDialog } from './Modal'
import Button from '../form/Button'
import { renderWithProviders } from '../../test/renderWithProviders'
import { expectNoA11yViolations } from '../../test/assertions'
import { setupUser } from '../../test/user'

/**
 * 🔴 THESE ASSERT THE BEHAVIOURS THE EIGHT HAND-ROLLED OVERLAYS DO NOT HAVE.
 * Portal, focus trap, Escape, scroll lock — none of which is present on the surfaces this
 * primitive replaces, and every one of which is invisible until somebody uses a keyboard.
 * A test that only checked "the dialog renders" would pass against all eight of them.
 */

function Harness({ modalProps = {}, children = <p>Body</p> }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open it
      </button>
      <input aria-label="Behind the dialog" />
      <Modal open={open} onOpenChange={setOpen} title="Member details" {...modalProps}>
        {children}
      </Modal>
    </div>
  )
}

describe('Modal — the four things the hand-rolled overlays lack', () => {
  it('is PORTALLED out of its parent, so no page overflow can clip it', async () => {
    const user = setupUser()
    const { container } = renderWithProviders(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open it' }))
    const dialog = screen.getByRole('dialog')

    // 🔑 The single thing all eight got wrong: rendered in place, a dialog is trapped in
    // whatever `overflow` and stacking context its page happens to have.
    expect(container.contains(dialog)).toBe(false)
    expect(document.body.contains(dialog)).toBe(true)
  })

  it('TRAPS FOCUS: Tab cycles inside it and never reaches the page behind', async () => {
    const user = setupUser()
    renderWithProviders(
      <Harness
        modalProps={{ footer: <Button variant="primary">Save</Button> }}
        children={<input aria-label="Inside the dialog" />}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Open it' }))
    const dialog = screen.getByRole('dialog')
    const behind = screen.getByLabelText('Behind the dialog')

    // Ten tabs is more than the dialog holds, so if focus can escape it, it will have.
    for (let i = 0; i < 10; i += 1) {
      await user.tab()
      expect(
        behind,
        'Tab walked out of the dialog and into the page behind it — which the user cannot ' +
          'see, and cannot get back from without a mouse. None of the eight overlays this ' +
          'replaces traps focus, and nothing in the suite noticed until now.',
      ).not.toHaveFocus()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('ESCAPE closes it — seven of the eight it replaces ignore Escape', async () => {
    const user = setupUser()
    renderWithProviders(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open it' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('LOCKS THE PAGE behind it, and gives the scroll back on close', async () => {
    const user = setupUser()
    renderWithProviders(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open it' }))
    expect(document.body).toHaveStyle({ pointerEvents: 'none' })

    await user.keyboard('{Escape}')
    expect(document.body.style.pointerEvents).not.toBe('none')
  })
})

describe('Modal — the accessible name is required, not optional', () => {
  it('throws in development rather than rendering an unnamed dialog', () => {
    // 🔴 Radix WARNS about a missing Dialog.Title and renders anyway. A warning in a
    // console nobody is reading is not a guard: the result ships as a dialog announced as
    // "dialog" and nothing else. MUTATION-CHECKED by deleting the throw in `Modal.jsx`.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() =>
        renderWithProviders(
          <Modal open onOpenChange={() => {}}>
            <p>No title</p>
          </Modal>,
        ),
      ).toThrow(/Modal requires a `title`/)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('titleHidden keeps the NAME and hides only the heading', async () => {
    const user = setupUser()
    renderWithProviders(<Harness modalProps={{ titleHidden: true }} />)
    await user.click(screen.getByRole('button', { name: 'Open it' }))

    // Still named — `sr-only` is a different thing from absent.
    expect(screen.getByRole('dialog', { name: 'Member details' })).toBeInTheDocument()
    expect(screen.getByText('Member details').className).toMatch(/\bsr-only\b/)
  })
})

describe('Modal — the height cap is the primitive\'s, not the call site\'s', () => {
  it('caps in dvh and scrolls the BODY, so the footer stays reachable', async () => {
    const user = setupUser()
    renderWithProviders(
      <Harness modalProps={{ footer: <Button variant="primary">Save</Button> }} />,
    )
    await user.click(screen.getByRole('button', { name: 'Open it' }))

    const dialog = screen.getByRole('dialog')
    // 📱 conventions §6. `100vh` on a phone is the viewport with the URL bar RETRACTED, so
    // a vh-capped dialog puts its Save button under the browser chrome. Baked in here
    // because MobiZone found two call-sites that had "forgotten" it (contract ⑮).
    expect(dialog.className).toMatch(/max-h-\[85dvh\]/)
    expect(dialog.className).not.toMatch(/\bh-\[?\d+vh/)

    // The body scrolls, not the whole dialog — otherwise the actions scroll away.
    const scroller = dialog.querySelector('.overflow-y-auto')
    expect(scroller).not.toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})

describe('Modal — a step you must answer can refuse to be dismissed', () => {
  it('dismissible={false} ignores Escape and has no close button', async () => {
    const user = setupUser()
    renderWithProviders(<Harness modalProps={{ dismissible: false }} />)

    await user.click(screen.getByRole('button', { name: 'Open it' }))
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()

    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('ConfirmDialog — what replaces window.confirm()', () => {
  it('names the action on the button, never "OK"', async () => {
    const user = setupUser()
    const onConfirm = vi.fn()

    renderWithProviders(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Remove recruiter"
        description="This sets 15 members to Inactive and clears their recruiter assignment."
        confirmLabel="Remove recruiter"
        onConfirm={onConfirm}
      />,
    )

    // 🔑 `window.confirm` can only say OK/Cancel. "Remove recruiter" is a sentence a user
    // can check against what they meant; "OK" is not — and the consequence here is fifteen
    // members going inactive.
    expect(screen.queryByRole('button', { name: 'OK' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Remove recruiter' }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('states the consequence, and Cancel does not confirm', async () => {
    const user = setupUser()
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    renderWithProviders(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Remove recruiter"
        description="This sets 15 members to Inactive."
        confirmLabel="Remove recruiter"
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByRole('dialog')).toHaveTextContent('This sets 15 members to Inactive.')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('the destructive action LOOKS destructive', async () => {
    renderWithProviders(
      <ConfirmDialog open onOpenChange={() => {}} title="Delete" confirmLabel="Delete" onConfirm={() => {}} />,
    )
    // The `danger` variant is new in 03.2a: before it, every delete in this application was
    // a neutral button beside a `confirm()`.
    expect(screen.getByRole('button', { name: 'Delete' }).className).toMatch(/status-suspended/)
  })
})

describe('Modal — accessibility, both themes', () => {
  it('has no violations open, in light or dark', async () => {
    const user = setupUser()
    renderWithProviders(
      <Harness modalProps={{ description: 'Everything we hold about this member.', footer: <Button variant="primary">Save</Button> }} />,
    )

    await user.click(screen.getByRole('button', { name: 'Open it' }))
    const dialog = screen.getByRole('dialog')

    // Scoped to the dialog for the reason DateField's is: scanning `document.body` makes a
    // component test's cost depend on whatever else the document holds, and that turned
    // into a 20-second timeout inside the shuffled suite. `region` is off, and only here,
    // because a primitive rendered alone is not a page.
    const rules = { region: { enabled: false } }
    await expectNoA11yViolations(dialog, { rules })

    document.documentElement.classList.add('dark')
    try {
      await expectNoA11yViolations(dialog, { rules })
    } finally {
      document.documentElement.classList.remove('dark')
    }
  })
})
