// @vitest-environment jsdom -- drives the sign-in form and reads what it announces
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'

import Auth from './Auth'
import { expectNoA11yViolations } from '../../test/assertions'
import { renderWithProviders } from '../../test/renderWithProviders'
import { setupUser } from '../../test/user'

/**
 * The sign-in screen. `04.1`.
 *
 * 🔴 THE FIRST DESCRIBE IS R-SEC-C AND IT IS THE REASON THIS FILE EXISTS. The screen
 * used to `console.log` the typed email and password on every submit. A source scan
 * would have caught that one spelling of it; this catches the BEHAVIOUR, wherever it
 * comes from -- a `console.info` added later, a debug line inside a helper, a logging
 * library. What must never happen is a credential reaching any console sink.
 */

const PASSWORD = 'correct-horse-battery-staple'
const EMAIL = 'synthetic.member@example.invalid'
const SUMMARY_HEADING = /There is a problem with this form/i

/**
 * The error summary, found by its ACCESSIBLE NAME rather than by `role="alert"`.
 *
 * 🔴 THE FIRST DRAFT ASKED FOR `role="alert"` AND FOUND FIVE. `Field` gives every error
 * message that role, so an empty submit produces one live region per bad field plus the
 * summary -- five simultaneous announcements for one mistake. The summary is focused
 * instead, which is what announces it, and this looks it up the way a user meets it.
 */
const errorSummary = () =>
  screen.getByText(SUMMARY_HEADING).closest('[aria-labelledby]')

/**
 * One console argument, flattened to text a search can actually find a secret in.
 *
 * 🔴 THIS FUNCTION IS THE WHOLE GUARD, AND THE FIRST VERSION OF IT WAS BLIND. It was
 * `String(arg)`, which turns `{ email, password }` into the literal text
 * `[object Object]` — so the defect this file exists to catch,
 * `console.log('Login attempt:', { email, password })`, produced console output with no
 * password in it and the test reported GREEN.
 *
 * 🔑 IT WAS NOT FOUND BY READING. It was found by putting the original defect back and
 * running the guard, which is the only thing that distinguishes a guard from a guard
 * that cannot see. Credentials are almost always logged as a FIELD of an object, so a
 * stringifier that stops at the top level is exactly the wrong one here.
 */
const flatten = (value, depth = 0) => {
  if (depth > 6) return ''
  if (value === null || value === undefined) return String(value)
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return String(value)
  if (value instanceof Error) return `${value.message} ${value.stack ?? ''}`
  // Own keys AND values: a password can arrive as either, and `JSON.stringify` would
  // drop functions, symbols and anything that throws in a getter.
  return Object.entries(value)
    .map(([key, nested]) => `${key} ${flatten(nested, depth + 1)}`)
    .join(' ')
}

/** Every console sink, spied together. A guard that watches only `log` is half a guard. */
const spyOnConsole = () => {
  const sinks = ['log', 'info', 'debug', 'warn', 'error', 'trace']
  const spies = sinks.map((sink) => vi.spyOn(console, sink).mockImplementation(() => {}))
  return {
    everythingWritten: () =>
      spies.flatMap((spy) => spy.mock.calls).map((call) => call.map((arg) => flatten(arg)).join(' ')),
  }
}

describe('the credential guard can actually see a credential', () => {
  afterEach(() => vi.restoreAllMocks())

  // 🔴 THE CANARY, and it is here because the guard failed it once. Everything in the
  // next describe is satisfied by a flattener that returns '' — no password found, in an
  // empty string. This drives the exact shape the defect had.
  it('finds a secret logged as a field of an object, not just as a bare string', () => {
    const console_ = spyOnConsole()

    console.log('Login attempt:', { email: EMAIL, password: PASSWORD })
    console.warn({ nested: { deeper: { credential: PASSWORD } } })
    console.error(`bare ${PASSWORD}`)

    const written = console_.everythingWritten().join('\n')
    const occurrences = written.split(PASSWORD).length - 1

    expect(
      occurrences,
      'The console flattener cannot see a secret in the shape this application logged ' +
        'it in. Every assertion below would pass while the defect was present.',
    ).toBe(3)
    expect(written).toContain(EMAIL)
  })
})

describe('Auth — R-SEC-C, nothing typed here reaches a console', () => {
  afterEach(() => vi.restoreAllMocks())

  it('logs neither the password nor the email, on either mode', async () => {
    const user = setupUser()
    const console_ = spyOnConsole()
    renderWithProviders(<Auth />, { initialEntries: ['/login'] })

    await user.type(screen.getByLabelText(/Email Address/i), EMAIL)
    await user.type(screen.getByLabelText(/^Password/i), PASSWORD)
    await user.click(screen.getByRole('button', { name: /Log In/i }))

    // 🔑 THE MUST-PASS HALF, and without it this test is worthless. Everything below is
    // satisfied by a form that was never filled in -- an empty console proves nothing if
    // nothing happened. This asserts the credentials actually went in.
    expect(
      screen.getByLabelText(/Email Address/i),
      'The form was never actually filled in, so an empty console proves nothing.',
    ).toHaveValue(EMAIL)

    const written = console_.everythingWritten().join('\n')

    expect(
      written.includes(PASSWORD),
      `A password reached the console. It survives in a saved HAR, a screen share and ` +
        `any extension that reads the console. Console output was:\n${written}`,
    ).toBe(false)

    expect(written.includes(EMAIL), 'An email address reached the console.').toBe(false)
  })

  it('logs nothing from the sign-up form either', async () => {
    const user = setupUser()
    const console_ = spyOnConsole()
    renderWithProviders(<Auth />, { initialEntries: ['/login'] })

    await user.click(screen.getByRole('tab', { name: 'Sign Up' }))
    await user.type(screen.getByLabelText(/Full Name/i), 'Synthetic Testperson')
    await user.type(screen.getByLabelText(/Email Address/i), EMAIL)
    await user.type(screen.getByLabelText(/^Password/i), PASSWORD)
    await user.type(screen.getByLabelText(/Confirm Password/i), PASSWORD)
    await user.click(screen.getByRole('button', { name: /Sign up/i }))

    expect(screen.getByLabelText(/Confirm Password/i)).toHaveValue(PASSWORD)

    const written = console_.everythingWritten().join('\n')
    expect(written.includes(PASSWORD), `A password reached the console:\n${written}`).toBe(false)
  })
})

describe('Auth — validation is inline, and never a native dialog', () => {
  beforeEach(() => {
    // 🔴 THE DEFECT THIS REPLACES. `alert()` stole focus, could not be styled, named no
    // field, and left the member facing an unchanged form. jsdom's `window.alert` throws
    // "not implemented" rather than being callable, so a spy is what makes a regression
    // legible instead of an unattributed crash.
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  it('mismatched passwords are reported on the field, in a summary, with no alert', async () => {
    const user = setupUser()
    renderWithProviders(<Auth />, { initialEntries: ['/login'] })

    await user.click(screen.getByRole('tab', { name: 'Sign Up' }))
    await user.type(screen.getByLabelText(/Full Name/i), 'Synthetic Testperson')
    await user.type(screen.getByLabelText(/Email Address/i), EMAIL)
    await user.type(screen.getByLabelText(/^Password/i), PASSWORD)
    await user.type(screen.getByLabelText(/Confirm Password/i), 'something-else')
    await user.click(screen.getByRole('button', { name: /Sign up/i }))

    expect(window.alert, 'A native alert() is back. It names no field and steals focus.')
      .not.toHaveBeenCalled()

    const summary = errorSummary()
    expect(within(summary).getByText(/do not match/i)).toBeInTheDocument()

    // ⚠️ THE SUMMARY IS NOT ENOUGH ON ITS OWN. A member reading the form rather than the
    // top of the page needs the error ON the control -- and `aria-invalid` is what tells
    // a screen reader which one is wrong.
    const confirm = screen.getByLabelText(/Confirm Password/i)
    expect(confirm).toHaveAttribute('aria-invalid', 'true')
    expect(
      document.getElementById(confirm.getAttribute('aria-describedby')),
      'aria-describedby names an element that is not in the document, which makes the ' +
        'whole description silently empty in several screen readers.',
    ).toHaveTextContent(/do not match/i)

    // The summary takes focus, so the next thing announced says what went wrong.
    expect(summary).toHaveFocus()
  })

  it('an empty form reports every missing field at once, not one at a time', async () => {
    const user = setupUser()
    renderWithProviders(<Auth />, { initialEntries: ['/login'] })

    await user.click(screen.getByRole('tab', { name: 'Sign Up' }))
    await user.click(screen.getByRole('button', { name: /Sign up/i }))

    const problems = within(errorSummary()).getAllByRole('listitem')

    // Name, email, password, confirm -- four empty required fields, four messages. A
    // form that reports them one submit at a time is four round trips for one mistake.
    expect(problems).toHaveLength(4)
  })

  it('switching mode clears errors that describe fields no longer on screen', async () => {
    const user = setupUser()
    renderWithProviders(<Auth />, { initialEntries: ['/login'] })

    await user.click(screen.getByRole('tab', { name: 'Sign Up' }))
    await user.click(screen.getByRole('button', { name: /Sign up/i }))
    expect(errorSummary()).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Login' }))

    expect(
      screen.queryByText(SUMMARY_HEADING),
      'A summary survived the mode switch, so it now points at inputs that are not on ' +
        'the screen -- "Enter your full name" over a form with no name field.',
    ).not.toBeInTheDocument()
  })

  it('a complete form is accepted, and says nothing is wrong', async () => {
    // 🔑 THE NON-VACUITY CASE. Every assertion above is satisfied by a form that
    // ALWAYS refuses. This is the one that catches a validator stuck on "no".
    const user = setupUser()
    renderWithProviders(<Auth />, { initialEntries: ['/login'] })

    await user.type(screen.getByLabelText(/Email Address/i), EMAIL)
    await user.type(screen.getByLabelText(/^Password/i), PASSWORD)
    await user.click(screen.getByRole('button', { name: /Log In/i }))

    expect(
      screen.queryByText(SUMMARY_HEADING),
      'A valid submission was refused. The form cannot be completed at all.',
    ).not.toBeInTheDocument()
  })
})

describe('Auth — the screen says what it actually does', () => {
  it('states that sign-in is not active, without hiding it behind a dismissal', async () => {
    renderWithProviders(<Auth />, { initialEntries: ['/login'] })

    // 🗣️ Authentication is DEFERRED (the owner, 2026-09-09). The screen navigates
    // because it is the only door into the application, so it has to SAY so -- a login
    // that silently accepts anything is the thing this wave was told not to paint.
    expect(screen.getByText(/not active yet/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /dismiss|close|got it/i }),
      'The notice can be dismissed, so a member can be looking at a form that behaves ' +
        'nothing like it appears to with nothing on screen saying so.',
    ).not.toBeInTheDocument()
  })

  it('password fields ask a password manager for the right thing', async () => {
    const user = setupUser()
    renderWithProviders(<Auth />, { initialEntries: ['/login'] })

    expect(screen.getByLabelText(/^Password/i)).toHaveAttribute('autocomplete', 'current-password')

    await user.click(screen.getByRole('tab', { name: 'Sign Up' }))

    // 🔴 NOT THE SAME ANSWER. `current-password` on a sign-up form asks the manager to
    // fill in the password being replaced, which is how a new account silently gets the
    // old credential.
    expect(screen.getByLabelText(/^Password/i)).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText(/Confirm Password/i)).toHaveAttribute(
      'autocomplete',
      'new-password',
    )
  })

  it('renders exactly one <h1>, and it names the screen', async () => {
    renderWithProviders(<Auth />, { initialEntries: ['/login'] })

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent(/Welcome Back/i)
  })
})

describe('Auth — accessibility, both themes', () => {
  it('has no violations in light or dark, including while showing errors', async () => {
    const user = setupUser()
    const { container } = renderWithProviders(<Auth />, { initialEntries: ['/login'] })

    await expectNoA11yViolations(container)

    // The error state is different DOM -- a summary, `aria-invalid`, a described-by.
    // Scanning only the resting form would never see it.
    await user.click(screen.getByRole('button', { name: /Log In/i }))
    await expectNoA11yViolations(container)

    document.documentElement.classList.add('dark')
    await expectNoA11yViolations(container)
    document.documentElement.classList.remove('dark')
  })
})
