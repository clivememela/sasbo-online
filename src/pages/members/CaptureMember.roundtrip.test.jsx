// @vitest-environment jsdom -- renders the capture form and types into it
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import CaptureMember from './CaptureMember'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { IDENTITY_TYPE_OPTIONS } from '../../config/memberConstants'
import { DEFECTS, disabled, pin } from '../../test/knownDefects'
import { setupUser } from '../../test/user'

/**
 * THE FIELD ROUND-TRIP -- the client half of the standards' worst defect class.
 *
 * The defect being guarded against is not "the form is broken". It is the one
 * where a field is typed into, the form saves, the screen says saved, and the
 * value never reached the request body -- a dropped `name`, a state key that
 * does not match, a field bound to the wrong slice of state. Everything looks
 * right from the outside, which is precisely why only an assertion on the
 * REQUEST BODY catches it.
 *
 * So these tests assert what went ON THE WIRE, not what is in the DOM after
 * typing. Asserting the input's own value only proves React re-rendered.
 *
 * The queries are by LABEL, never by class name or component internals, so a
 * Tailwind refactor cannot redden them. That is the whole reason this layer is
 * cheaper than the browser.
 */

/** Captured request bodies, so an assertion can be made about the wire. */
let posted

const captureCreate = () =>
  http.post('*/api/members', async ({ request }) => {
    posted = await request.json()
    return HttpResponse.json({ id: 1, ...posted })
  })


/**
 * What the form says when it refuses to save.
 *
 * 🔴 IT USED TO BE `window.alert`, AND THESE TESTS SPIED ON IT. `04.2` replaced that
 * with an error summary rendered on the page: a native modal blocks the thread, cannot be
 * styled, is suppressible, and -- on a six-tab form -- leaves the member facing an
 * unchanged screen the moment they dismiss it. The spy is KEPT so a regression to `alert()`
 * is loud rather than silent, and `refusals()` reads the summary the form now shows.
 */
const alerts = []

const refusals = () =>
  [...document.querySelectorAll('[aria-labelledby$="save-notice-title"] li')]
    .map((li) => li.textContent)
    .join('\n')

beforeEach(() => {
  posted = undefined
  alerts.length = 0
  vi.spyOn(window, 'alert').mockImplementation((m) => alerts.push(String(m)))
  server.use(...pageFixtures, captureCreate())
})

/**
 * Query by label, ANCHORED.
 *
 * An unanchored substring match is not good enough on this form: the identity
 * NUMBER field's label is `form.identityType || "Select Identity Type before
 * entering"`, so a loose match for "Identity Type" hits both it and the
 * Identity Type select. Anchoring at the start of the label is what keeps
 * these queries about the field the test means, while still tolerating the
 * trailing required-marker asterisk.
 */
const escapeForRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const labelled = (label) =>
  screen.getByLabelText(new RegExp(`^${escapeForRegex(label)}`))

const fill = async (user, label, value) => {
  const field = labelled(label)
  await user.clear(field)
  await user.type(field, value)
}

const save = async (user) => {
  await user.click(screen.getByRole('button', { name: /save member/i }))
}

/**
 * Switch the capture off Debit Order.
 *
 * The form defaults `paymentType` to "Debit Order", which makes three banking
 * fields required. That is correct behaviour and it agrees with the server's
 * `PaymentType.requiresBankAccount()` -- so a round-trip test that ignored it
 * would be testing an impossible capture.
 *
 * Choosing "Payroll" is also the honest half of register A9: the option is
 * real, the server agrees no bank account is needed, and the client's own
 * `isPayrollDeduction` branch STILL does not fire, because it compares against
 * "Payroll Deduction" (A6). The capture below therefore succeeds for the right
 * reason and the dead branch stays dead -- which is exactly the state
 * `usePaymentTypeValidation.test.jsx` pins.
 *
 * The form is TABBED and renders only the active tab, so Payment Type has to
 * be reached by opening "Employment & Bank" first. That is worth doing through
 * the tab button rather than by reaching into state: a field the user cannot
 * navigate to is a field that does not work, and clicking the tab is what
 * proves the navigation still does.
 */
const openTab = async (user, label) => {
  await user.click(screen.getByRole('button', { name: label }))
}

const choosePayroll = async (user) => {
  await openTab(user, /Employment & Bank/i)
  await user.selectOptions(labelled('Payment Type'), 'Payroll')
  await openTab(user, /Personal Information/i)
}

describe('CaptureMember round-trips its fields', () => {
  it('every value typed in reaches the request body', async () => {
    const user = setupUser()
    renderWithProviders(<CaptureMember />)

    await fill(user, 'First Name(s)', 'Synthetic')
    await fill(user, 'Surname', 'Testperson')
    await choosePayroll(user)

    // Identity type is a select, and its own value gates the identity-number
    // field -- so it must be chosen before the number can be typed.
    await user.selectOptions(labelled('Identity Type'), 'I.D. Number')
    await fill(user, 'I.D. Number', '9001010000080')

    await save(user)

    await waitFor(() =>
      expect(
        posted,
        `Save was clicked and no POST reached /api/members. The form either failed ` +
          `validation silently or never called the service. Alerts raised: ` +
          `${JSON.stringify(alerts)}; refusals shown: ${refusals()}`,
      ).toBeDefined(),
    )

    // THE ACTUAL ASSERTION: the wire, not the DOM.
    expect(posted).toMatchObject({
      firstNames: 'Synthetic',
      surname: 'Testperson',
      identityType: 'I.D. Number',
      identityNumber: '9001010000080',
    })
  })

  it('refuses to submit at all when a required field is empty', async () => {
    const user = setupUser()
    renderWithProviders(<CaptureMember />)

    await fill(user, 'Surname', 'Testperson')
    await save(user)

    expect(
      posted,
      'The form POSTed a member with no first name, which the server would then have to ' +
        'refuse -- or worse, accept. Client-side validation that does not stop the ' +
        'request is decoration.',
    ).toBeUndefined()
    // The refusal names the FIELD, which `alert()` also did -- and it stays on the screen,
    // which `alert()` did not.
    expect(refusals()).toMatch(/First Name/i)
    expect(alerts, 'a native alert() is back').toEqual([])
  })

  it('refuses an identity number that fails the SA ID checksum', async () => {
    const user = setupUser()
    renderWithProviders(<CaptureMember />)

    await fill(user, 'First Name(s)', 'Synthetic')
    await fill(user, 'Surname', 'Testperson')
    await choosePayroll(user)
    await user.selectOptions(labelled('Identity Type'), 'I.D. Number')
    // Correct length, wrong check digit -- the vector named wrongCheckDigit in
    // the validateSAID specification table.
    await fill(user, 'I.D. Number', '9001010000081')

    await save(user)

    expect(
      posted,
      'A member with an invalid SA ID number was POSTed. The server does NOT check the ' +
        'checksum (register A8) -- it accepts any 13 digits -- so this form is the only ' +
        'thing standing between a typo and the database.',
    ).toBeUndefined()
  })

  it('derives date of birth and gender from a valid I.D. Number', async () => {
    const user = setupUser()
    renderWithProviders(<CaptureMember />)

    await user.selectOptions(labelled('Identity Type'), 'I.D. Number')
    await fill(user, 'I.D. Number', '9001010000080')

    // Derived, not typed: the two fields are disabled for I.D. Number exactly
    // because the number already carries the answer.
    await waitFor(() =>
      expect(labelled('Gender')).toHaveValue('Female'),
    )
  })
})

describe('the identity-type vocabulary', () => {
  it('the passport branch compares against a value the dropdown cannot produce', () => {
    // Register A7, asserted rather than described. The validation reads
    // `form.identityType === "Passport"`; the options offer "Passport Number".
    // The rule -- date of birth is required when the identity is a passport --
    // has therefore never once run.
    //
    // This is deliberately NOT a skipped test with a pin. The behaviour lives
    // in a string comparison inside a 858-line component, and the honest,
    // stable assertion is the one about the vocabulary itself: the two sides
    // do not agree. Phase 4's vocabulary guard is what fixes both halves
    // together; this records the client side of the disagreement.
    expect(IDENTITY_TYPE_OPTIONS).toContain('Passport Number')
    expect(
      IDENTITY_TYPE_OPTIONS,
      'A7 has been fixed on the client side -- the dropdown now offers the exact string ' +
        'the validation compares against. Check that the server agrees before closing the ' +
        'row.',
    ).not.toContain('Passport')
  })

  const capturePassportMember = async (user) => {
    renderWithProviders(<CaptureMember />)
    await fill(user, 'First Name(s)', 'Synthetic')
    await fill(user, 'Surname', 'Testperson')
    await choosePayroll(user)
    await user.selectOptions(labelled('Identity Type'), 'Passport Number')
    await fill(user, 'Passport Number', 'A12345678')
    await save(user)
  }

  it.skip(disabled(DEFECTS.A7, 'a passport capture must require a date of birth'), async () => {
    // Written to the standard. Unlike an I.D. Number, a passport number
    // carries no date to derive from -- so if the form does not insist on one,
    // the record is simply incomplete, and nothing downstream can tell that
    // from a member who genuinely has no date on file.
    await capturePassportMember(setupUser())

    expect(posted).toBeUndefined()
    expect(refusals()).toMatch(/date of birth/i)
    expect(alerts, 'a native alert() is back').toEqual([])
  })

  it(pin(DEFECTS.A7, 'a passport capture still saves with no date of birth'), async () => {
    // The consequence of A7, executed rather than described. The rule exists
    // in the code -- `identityType === "Passport" && !dateOfBirth` -- and has
    // never once run, because the dropdown only offers "Passport Number".
    await capturePassportMember(setupUser())

    await waitFor(() => expect(posted).toBeDefined())
    expect(
      posted.dateOfBirth,
      'A7 has been fixed -- the form now refuses a passport capture with no date of ' +
        'birth. Delete this pin, un-skip the test above, and close the row.',
    ).toBeFalsy()
  })

  /**
   * 🔴 THE COSATU LOCAL AND REGION NEVER REACH THE MEMBER RECORD, and the form
   * and the schema do not even agree on what those two fields MEAN.
   *
   * A NEW defect -- the COSATU block is two days old -- and found by writing this
   * test rather than by reading the diff. ⚠️ The first draft of this comment was
   * itself wrong in a way worth keeping: it said the form collects free-text
   * names under mismatched keys. Running it corrected that to something sharper.
   *
   * Two separate mistakes, stacked:
   *
   *   ① THE NAMES DISAGREE. The form's state keys are `isCosatuLocal` and
   *     `isCosatuRegional`; the DTO declares `cosatuLocal` and `cosatuRegion`.
   *     `memberService.createMember` submits the form object verbatim, so both
   *     values arrive under names the server has never heard of, are ignored as
   *     unknown properties, and the capture reports success.
   *
   *   ② THE MEANINGS DISAGREE, which no rename would fix. The form asks two
   *     YES/NO questions -- the fields are labelled "Local?" and "Regional?" and
   *     are fed `YES_NO_OPTIONS`. The columns V19 created are `VARCHAR(255)`
   *     described in that migration as "the Local the member belongs to (free
   *     text)" and "the Region the member belongs to (free text)". So the screen
   *     collects a flag where the database wants a NAME. Align the keys and the
   *     result is `cosatu_local = 'Y'`, which answers a question nobody asked.
   *
   * 🔑 ① IS A31's DEFECT CLASS -- a field that reads but does not write, which the
   * standards name the most expensive kind in a data-capture system. A31 is six
   * fields with no column at all; this is two fields WITH columns, wired to the
   * wrong names. ② is the more interesting half, because it means the fix is a
   * decision about what the form should ask, not an edit.
   *
   * ⚠️ AND THE MISMATCH ALSO BREAKS THE RESET, in the opposite direction. Setting
   * "COSATU Member?" back to "N" clears `cosatuLocal` and `cosatuRegion` -- the
   * DTO names, which no input ever writes -- and leaves `isCosatuLocal` and
   * `isCosatuRegional` holding what the user chose. A member who is NOT in COSATU
   * still submits COSATU answers.
   *
   * NOT FIXED HERE: `CaptureMember.jsx` is the incumbent's runtime code, so this
   * arc asserts rather than repairs. `isCosatu` and `cosatuPositions` ARE named
   * correctly and do persist, which is why this pins two fields and not four.
   * Reported to the owner for a register id rather than allocated one here -- the
   * register is a shared namespace and the arc that owns this screen is mid-flight
   * in it.
   */
  it('🔴 submits the COSATU Local and Regional answers under names the server drops', async () => {
    const user = setupUser()
    renderWithProviders(<CaptureMember />)

    await fill(user, 'First Name(s)', 'Synthetic')
    await fill(user, 'Surname', 'Testperson')
    await choosePayroll(user)
    await user.selectOptions(labelled('Identity Type'), 'I.D. Number')
    await fill(user, 'I.D. Number', '9001010000080')

    // The COSATU panel is gated on the Y/N above it, so the flag is set first.
    await openTab(user, /Sasbo Structures/i)
    await user.selectOptions(labelled('COSATU Member?'), 'Y')
    await user.selectOptions(labelled('Local?'), 'Y')
    await user.selectOptions(labelled('Regional?'), 'Y')

    await openTab(user, /Personal Information/i)
    await save(user)

    await waitFor(() => expect(posted).toBeDefined())

    // The wire, which is the only place either mistake is visible.
    expect(
      posted.cosatuLocal,
      'the COSATU Local now reaches the server under the name the DTO declares. If ' +
        'that was deliberate, check what it CARRIES too -- the column wants the name ' +
        'of a Local, and this form asks a yes/no question. Then close the register row.',
    ).toBeUndefined()
    expect(posted.cosatuRegion).toBeUndefined()

    // And where the two answers actually went, so a failure names the cause
    // rather than only the symptom.
    expect(posted.isCosatuLocal).toBe('Y')
    expect(posted.isCosatuRegional).toBe('Y')

    // The two fields that ARE wired correctly, asserted in the same test so the
    // contrast is visible: this is a two-field defect, not a four-field one.
    expect(posted.isCosatu).toBe('Y')
  })
})
