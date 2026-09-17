// @vitest-environment jsdom -- renders the member record's SASBO structures tab
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'

import MembersPage from './Members'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * EDIT MEMBER · SASBO STRUCTURES — the stakeholder's shape, 2026-09-17.
 *
 *   Shop Steward?
 *   BEC Member?
 *     └ COSATU Member?                       only under BEC = Yes
 *         └ Sits on a COSATU Local structure?     only under COSATU = Yes
 *         └ Sits on a COSATU Regional structure?
 *
 * 🗣️ Where each line comes from:
 * - the owner, earlier in this arc: Structures holds only Shop Steward?, COSATU Member? and BEC Member?,
 *   and "Specialized Assignments" goes;
 * - the stakeholder, relayed 2026-09-17: "For a member to participate in COSATU structures, they have to
 *   be within the BEC structure", and a COSATU Local / Region is a structure a member SITS ON.
 *
 * 🔴 THIS FILE REPLACES `Members.cosatu.test.jsx`, AND TWO OF ITS PREMISES WERE OVERTURNED, NOT BROKEN.
 * - N5 / BR-15 asserted COSATU was PARALLEL to BEC ("a COSATU member who is not a BEC member can still
 *   see and edit their record"), on a 2026-09-09 reading that there was no eligibility gate. The
 *   stakeholder has since said there is. The server refuses COSATU without BEC.
 * - BR-14 asserted COSATU Local and Region were two labelled TEXT fields. They are yes/no questions
 *   (V29 `is_cosatu_local`, `is_cosatu_regional`). BR-14's real subject, no control without a name,
 *   survives below as a class test.
 * - A37 / A38 (a list field arriving as "PEC,CEC" throwing on `.join`) are fixed at the source:
 *   `memberService.normalizeMember`. The render-level half stays here, so a string-shaped record still opens.
 */

const MEMBER = {
  id: 1,
  membershipNumber: 'M0001',
  firstNames: 'Synthetic',
  surname: 'Testperson',
  identityType: 'I.D. Number',
  identityNumber: '9001010000080',
  status: 'Active',
  paymentType: 'Payroll',
  isShopSteward: false,
  isBec: false,
  isCosatu: 'N',
}

const membersRespond = (body) => http.get('*/api/members', () => HttpResponse.json(body))
const panel = () => within(screen.getByTestId('member-panel'))

async function openStructures(user, { edit = false } = {}) {
  await user.click(await screen.findByRole('button', { name: /open the record for/i }))
  if (edit) await user.click(await screen.findByRole('button', { name: /Edit Member/i }))
  await user.click(await screen.findByRole('button', { name: /Sasbo Structures/i }))
}

/** The labels of every control on the panel, in order, so a test can say "exactly these". */
const controlLabels = () =>
  [...screen.getByTestId('member-panel').querySelectorAll('input, select, button[role="combobox"], [role="combobox"]')]
    .map((el) => el.labels?.[0]?.textContent?.replace(/\*/g, '').trim() || el.getAttribute('aria-label') || '')
    .filter(Boolean)

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // Two `use` calls: the catch-all first, then the specific handler, which prepends.
  server.use(...pageFixtures)
})

describe('editing: only the questions the stakeholder asked, nested as they said', () => {
  it('a member who is not BEC is asked two questions -- COSATU is not offered at all', async () => {
    server.use(membersRespond([MEMBER]))
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructures(user, { edit: true })

    expect(await panel().findByLabelText(/^Shop Steward\?/)).toBeInTheDocument()
    expect(panel().getByLabelText(/^BEC \(Branch Executive Committee\) Member\?/)).toBeInTheDocument()
    expect(panel().queryByLabelText(/^COSATU Member\?/), 'COSATU requires BEC membership').not.toBeInTheDocument()
  })

  it('BEC = Yes offers COSATU; COSATU = Yes offers the Local and Regional structures, as yes/no', async () => {
    server.use(membersRespond([MEMBER]))
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructures(user, { edit: true })

    await user.selectOptions(await panel().findByLabelText(/^BEC \(Branch Executive Committee\) Member\?/), 'Yes')
    const cosatu = await panel().findByLabelText(/^COSATU Member\?/)
    expect(panel().queryByLabelText(/COSATU Local structure\?/), 'Local only under COSATU = Yes').not.toBeInTheDocument()

    await user.selectOptions(cosatu, 'Yes')
    const local = await panel().findByLabelText(/^Sits on a COSATU Local structure\?/)
    const regional = panel().getByLabelText(/^Sits on a COSATU Regional structure\?/)
    // A yes/no, not a name: the options are exactly Yes and No.
    for (const control of [local, regional]) {
      expect([...control.querySelectorAll('option')].map((o) => o.textContent).filter((t) => t !== 'Select...')).toEqual(['Yes', 'No'])
    }
  })

  it('none of the removed questions is still on the tab', async () => {
    // The must-pass half of "these questions are here": a tab that rendered everything would pass that.
    server.use(membersRespond([{ ...MEMBER, isBec: true, isCosatu: 'Y', isShopSteward: true }]))
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructures(user, { edit: true })
    await panel().findByLabelText(/^COSATU Member\?/)

    for (const gone of [/BEC Committee/i, /BEC Recruiter/i, /Structure Representative/i, /BEC Executive/i,
      /Election Date/i, /COSATU Positions/i, /^COSATU Local$/i, /Region within Local/i]) {
      expect(panel().queryByLabelText(gone), `${gone} was removed from Structures`).not.toBeInTheDocument()
    }
    expect(controlLabels().filter((l) => /Steward|BEC|COSATU/.test(l))).toEqual([
      'Shop Steward?',
      'BEC (Branch Executive Committee) Member?',
      'COSATU Member?',
      'Sits on a COSATU Local structure?',
      'Sits on a COSATU Regional structure?',
    ])
  })

  it('leaving BEC clears COSATU and both structures, and that is what is saved', async () => {
    let saved
    server.use(
      membersRespond([{ ...MEMBER, isBec: true, isCosatu: 'Y', isCosatuLocal: true, isCosatuRegional: true }]),
      http.put('*/api/members/:id', async ({ request }) => {
        saved = await request.json()
        return HttpResponse.json(saved)
      }),
    )
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructures(user, { edit: true })

    await user.selectOptions(await panel().findByLabelText(/^BEC \(Branch Executive Committee\) Member\?/), 'No')
    expect(panel().queryByLabelText(/^COSATU Member\?/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Save changes$/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Save these changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(saved).toBeDefined())
    expect(saved).toMatchObject({ isBec: false, isCosatu: 'N', isCosatuLocal: false, isCosatuRegional: false })
  })

  it('the answers reach the server as the fields V29 stores', async () => {
    let saved
    server.use(
      membersRespond([MEMBER]),
      http.put('*/api/members/:id', async ({ request }) => {
        saved = await request.json()
        return HttpResponse.json(saved)
      }),
    )
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructures(user, { edit: true })

    await user.selectOptions(await panel().findByLabelText(/^Shop Steward\?/), 'Yes')
    await user.selectOptions(panel().getByLabelText(/^BEC \(Branch Executive Committee\) Member\?/), 'Yes')
    await user.selectOptions(await panel().findByLabelText(/^COSATU Member\?/), 'Yes')
    await user.selectOptions(await panel().findByLabelText(/^Sits on a COSATU Local structure\?/), 'Yes')
    await user.selectOptions(panel().getByLabelText(/^Sits on a COSATU Regional structure\?/), 'No')

    await user.click(screen.getByRole('button', { name: /^Save changes$/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Save these changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(saved).toBeDefined())
    expect(saved).toMatchObject({
      isShopSteward: true, isBec: true, isCosatu: 'Y', isCosatuLocal: true, isCosatuRegional: false,
    })
  })

  it('leaves no control on the panel without an accessible name (BR-14, the class)', async () => {
    server.use(membersRespond([{ ...MEMBER, isBec: true, isCosatu: 'Y' }]))
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructures(user, { edit: true })
    await panel().findByLabelText(/^Sits on a COSATU Local structure\?/)

    const nameless = [...screen.getByTestId('member-panel').querySelectorAll('input, select')].filter(
      (el) => el.type !== 'hidden' && !(el.labels?.[0]?.textContent || el.getAttribute('aria-label') || '').trim(),
    )
    expect(nameless.length, 'a control on the member panel has no accessible name').toBe(0)
  })
})

describe('reading: one column, and an unanswered question says so', () => {
  it('shows the three answers and no "Specialized Assignments"', async () => {
    server.use(membersRespond([{ ...MEMBER, isShopSteward: true, isBec: true, isCosatu: 'Y', isCosatuLocal: true, isCosatuRegional: false }]))
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructures(user)

    expect(await screen.findByText('Core Appointments')).toBeInTheDocument()
    expect(screen.queryByText(/Specialized Assignments/i)).not.toBeInTheDocument()
    expect(screen.getByText('COSATU Local structure')).toBeInTheDocument()
    expect(screen.getByText('COSATU Regional structure')).toBeInTheDocument()
  })

  it('a member saved before V29 reads "Not recorded", not "No" -- nobody was ever asked', async () => {
    // CM-05: Shop Steward and BEC had no column, so for every earlier member the answer is absent.
    const legacy = { ...MEMBER }
    delete legacy.isShopSteward
    delete legacy.isBec
    server.use(membersRespond([legacy]))
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructures(user)

    expect(await screen.findAllByText('Not recorded')).toHaveLength(2)
  })
})

describe('A37 / A38 -- a list field that arrives as the server\'s delimited string', () => {
  it('a record whose COSATU positions and BEC structures are strings opens, reads and edits without throwing', async () => {
    // The shape that threw "cosatuPositions.join is not a function" on open. memberService unfolds it now;
    // this is the render-level proof that nothing on the page still receives the string.
    server.use(membersRespond([{ ...MEMBER, isBec: true, isCosatu: 'Y', cosatuPositions: 'PEC,CEC', becStructures: 'BEC A,BEC B' }]))
    const user = setupUser()
    renderWithProviders(<MembersPage />)

    await openStructures(user)
    expect(await screen.findByText('Core Appointments')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Edit Member/i }))
    expect(await panel().findByLabelText(/^COSATU Member\?/)).toBeInTheDocument()
  })
})
