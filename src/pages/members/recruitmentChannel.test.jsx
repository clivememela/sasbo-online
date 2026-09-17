// @vitest-environment jsdom -- the Recruitment Channel tab on both member screens
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import CaptureMember from './CaptureMember'
import MembersPage from './Members'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * 03.3 / 03.8 / 03.9 -- THE THREE THINGS THE STAKEHOLDER ASKED THIS TAB TO CAPTURE.
 *
 * Their words, 2026-09-09: "1. How the member was recruited. 2. The area where the member was recruited.
 * 3. Who recruited the member, where applicable." Those three, in that order, and nothing else.
 *
 * 🗣️ S6, settled by the owner the same day. The older spec asks for a tab called "Recruiter Type"; the
 * stakeholder calls the tab "Recruitment Channel", twice, on both screens. Both are right about different
 * things -- "Recruiter Type" was never the TAB, it names the KIND of recruitment, which is what field (1)
 * holds. So the tab keeps the stakeholder's name and the FIELD takes the spec's. Nothing was renamed to
 * satisfy a checker; the reconciliation was put to the owner and this is his answer.
 *
 * 🔑 R2 / RE-3 IS A CHANGE OF MEANING, NOT A RENAME, and it is the reason this file exists rather than a
 * label edit. The field was "Area's Recruiter", fed from the list of recruiter PEOPLE, so it captured a
 * person under an area-shaped name. Three separate documents (28 Aug, §11, RE-3) ask for an AREA. Renaming
 * the label alone would have left the screen collecting the wrong KIND of thing behind a corrected word --
 * worse than leaving it obviously wrong, because nothing about it would ever look wrong again.
 *
 * S6/R5/RE-3's last piece: the drop-down and the member's stored recruiter read DIFFERENT TABLES on main.
 * `/api/representatives` administers representatives -- people who sit on structures with a role and an
 * election date, which is Edit Member's business and stays there. `GET /api/recruiters` is the capture
 * screen's list, it is read-only by design (a typo must not become a permanent option in everybody's
 * drop-down), and it landed on server main at 829f252.
 */

const CHANNELS = [{ id: 1, name: 'Website' }, { id: 2, name: 'BEC' }, { id: 3, name: 'EORO' }]
const AREAS = [{ id: 1, name: 'Gauteng South' }, { id: 2, name: 'Western Cape Metro' }]
const RECRUITERS = [{ id: 1, name: 'Achmat Adams' }, { id: 2, name: 'Hanri Maritz' }]
/** Deliberately DIFFERENT people: a screen reading the wrong endpoint offers these instead. */
const REPRESENTATIVES = [{ id: 9, name: 'Zelda Representative' }]

let requested

beforeEach(() => {
  requested = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
  server.events.removeAllListeners('request:start')
  server.events.on('request:start', ({ request }) => requested.push(new URL(request.url).pathname))
  server.use(
    http.get('*/api/recruitment-channels', () => HttpResponse.json(CHANNELS)),
    http.get('*/api/areas', () => HttpResponse.json(AREAS)),
    http.get('*/api/recruiters', () => HttpResponse.json(RECRUITERS)),
    http.get('*/api/representatives', () => HttpResponse.json(REPRESENTATIVES)),
    ...pageFixtures,
  )
})

const openChannel = async (user) =>
  user.click(await screen.findByRole('button', { name: /^Recruitment Channel/ }))

/** Open a searchable Field's listbox and read its options. */
async function optionsOf(user, labelText) {
  const label = await screen.findByText(new RegExp(`^${labelText}`))
  const input = label.closest('div').querySelector('input')
  await user.click(input)
  const listbox = await screen.findByRole('listbox')
  const names = within(listbox).getAllByRole('option').map((o) => o.textContent.trim())
  await user.keyboard('{Escape}')
  return names
}

async function chooseFrom(user, labelText, typed, optionName) {
  const label = await screen.findByText(new RegExp(`^${labelText}`))
  const input = label.closest('div').querySelector('input')
  await user.type(input, typed)
  await user.click(await screen.findByRole('option', { name: optionName }))
}

describe('Capture Member · the three fields, in the stakeholder order', () => {
  it('🔴 offers Recruiter Type, Area Recruited and Recruiter -- and no "Area\'s Recruiter"', async () => {
    const user = setupUser()
    renderWithProviders(<CaptureMember />)
    await openChannel(user)

    const type = await screen.findByText(/^Recruiter Type/)
    const area = screen.getByText(/^Area Recruited/)
    const who = screen.getByText(/^Recruiter$/)

    expect(type.compareDocumentPosition(area) & Node.DOCUMENT_POSITION_FOLLOWING, 'Area Recruited follows Recruiter Type').toBeTruthy()
    expect(area.compareDocumentPosition(who) & Node.DOCUMENT_POSITION_FOLLOWING, 'Recruiter follows Area Recruited').toBeTruthy()

    // R2/RE-3: the person-capturing field under an area-shaped name is GONE, not relabelled.
    expect(screen.queryByText(/Area's Recruiter/)).not.toBeInTheDocument()
  })

  it('🔑 R2/RE-3: Area Recruited offers AREAS, not people', async () => {
    // The assertion that a rename alone would have failed. Both lists are loaded and they are disjoint,
    // so a field reading the recruiter list shows names rather than areas and this reddens.
    const user = setupUser()
    renderWithProviders(<CaptureMember />)
    await openChannel(user)

    await waitFor(async () => expect(await optionsOf(user, 'Area Recruited')).toEqual(['Gauteng South', 'Western Cape Metro']))
  })

  it('🔴 S6/R5: Recruiter comes from /api/recruiters, not /api/representatives', async () => {
    const user = setupUser()
    renderWithProviders(<CaptureMember />)
    await openChannel(user)

    await waitFor(() => expect(requested).toContain('/api/recruiters'))
    // The must-pass beside it: the two endpoints serve different people, so reading the wrong one shows.
    expect(await optionsOf(user, 'Recruiter$')).toEqual(['Achmat Adams', 'Hanri Maritz'])
  })

  it('Recruiter Type comes from the recruitment channels', async () => {
    const user = setupUser()
    renderWithProviders(<CaptureMember />)
    await openChannel(user)

    expect(await optionsOf(user, 'Recruiter Type')).toEqual(['Website', 'BEC', 'EORO'])
  })

  it('all three reach the request body under the names the DTO declares', async () => {
    let posted
    server.use(http.post('*/api/members', async ({ request }) => {
      posted = await request.json()
      return HttpResponse.json({ id: 1, ...posted })
    }))

    const user = setupUser()
    renderWithProviders(<CaptureMember />)
    const field = (text) => screen.getByLabelText(new RegExp(`^${text}`))
    await screen.findByLabelText(/^First Name\(s\)/)
    await user.type(field('First Name\\(s\\)'), 'Synthetic')
    await user.type(field('Surname'), 'Testperson')
    await user.selectOptions(field('Identity Type'), 'I.D. Number')
    await user.type(field('I.D. Number'), '9001010000080')

    // Payroll Deduction so no bank account, bank or branch is required -- this test is about the channel.
    await user.click(screen.getByRole('button', { name: /^Employment & Bank/ }))
    await user.selectOptions(field('Payment Type'), 'Payroll Deduction')

    await openChannel(user)
    await chooseFrom(user, 'Recruiter Type', 'Web', 'Website')
    await chooseFrom(user, 'Area Recruited', 'Gauteng', 'Gauteng South')
    await chooseFrom(user, 'Recruiter$', 'Achmat', 'Achmat Adams')

    await user.click(screen.getByRole('button', { name: /save member/i }))
    await waitFor(() => expect(posted).toBeDefined())

    // 🔑 The names MemberDto declares. R5 is the defect where the recruiter was dropped on every save,
    // and a field posted under a name the DTO does not carry is dropped in exactly the same silence.
    expect(posted.recruitedHow).toBe('Website')
    expect(posted.areaRecruited).toBe('Gauteng South')
    expect(posted.recruitmentRep).toBe('Achmat Adams')
  })

  it('🗑️ R3-OBS-2a: the elected-recruiter block is gone, not merely unreachable', async () => {
    // It was guarded by `form.electedRep === 'Y'` against a form that has no `electedRep` key, so it
    // could never render. Dead code that LOOKS live is how a removed field keeps being reasoned about.
    const user = setupUser()
    renderWithProviders(<CaptureMember />)
    await openChannel(user)

    expect(screen.queryByText(/Position \/ Structure/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Election Date/)).not.toBeInTheDocument()
  })
})

describe('Edit Member · 03.9, the same three, read-only', () => {
  const MEMBER = {
    id: 7, membershipNumber: 'M0007', firstNames: 'Synthetic', surname: 'Alpha', initials: 'S',
    identityType: 'I.D. Number', identityNumber: '9001010000080', status: 'Active',
    paymentType: 'Payroll Deduction',
    recruitedHow: 'EORO', areaRecruited: 'Western Cape Metro', recruitmentRepresentativeName: 'Hanri Maritz',
  }

  beforeEach(() => {
    server.use(http.get('*/api/members', () => HttpResponse.json([MEMBER])))
  })

  it('🗣️ shows all three and offers no control to change them', async () => {
    // The stakeholder: recruitment "should only show ... should not be editable from there". It showed
    // two, because the third had no field anywhere until 03.8.
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await user.click(await screen.findByRole('button', { name: /open the record for/i }))
    await user.click(await screen.findByRole('button', { name: /Edit Member/i }))
    await user.click(await screen.findByRole('button', { name: /^Recruitment/ }))

    const panel = within(screen.getByTestId('member-panel'))
    expect(panel.getByText('EORO')).toBeInTheDocument()
    expect(panel.getByText('Western Cape Metro')).toBeInTheDocument()
    expect(panel.getByText('Hanri Maritz')).toBeInTheDocument()

    // Read-only EVEN WHILE EDITING -- which is the whole instruction. Asserted over the tab's own
    // region rather than the page, so an unrelated control elsewhere cannot make this pass or fail.
    const region = panel.getByText('EORO').closest('[data-tab-panel]') ?? screen.getByTestId('member-panel')
    expect(within(region).queryAllByRole('combobox')).toHaveLength(0)
    expect(within(region).queryAllByRole('textbox')).toHaveLength(0)
  })
})
