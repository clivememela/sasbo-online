// @vitest-environment jsdom -- Recruiters: its reference lists failing, and a count of zero
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { Recruiters } from './Recruiters'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * WHAT RECRUITERS SAID WITHOUT CHECKING. `06.4`.
 *
 *   ① a bank list that failed left four filters reading as empty, and the only word of it was a
 *     sentence at the top of the page;
 *   ② that sentence ended "Everything else on this page is up to date." whatever the recruiter list had
 *     done -- including when it had failed too -- and began in lowercase;
 *   ③ a channel that has recruited nobody showed "—" for Members Recruited, which reads as "unknown".
 *
 * Each has its must-pass, because each has a wrong fix that satisfies the guard alone.
 */

const boom = () => HttpResponse.json({ status: 500, error: 'boom' }, { status: 500 })
const CHANNEL = { id: 5, name: 'Synthetic Channel', enabled: true }

describe('Recruiters', () => {
  beforeEach(() => {
    // Failures are reported through the sink as well as shown.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(...pageFixtures)
  })

  describe('① a reference list that failed', () => {
    it('says so AT the filter it feeds', async () => {
      server.use(http.get('*/api/banks/branches', boom))
      renderWithProviders(<Recruiters />)

      expect(await screen.findByText('Bank could not be loaded.')).toBeInTheDocument()
    })

    it('the must-pass: lists that loaded say nothing of the kind', async () => {
      renderWithProviders(<Recruiters />)

      await waitFor(() => expect(screen.getByLabelText('Bank')).not.toHaveAttribute('aria-busy', 'true'))
      expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument()
    })
  })

  describe('② the notice', () => {
    it('does not call the page up to date when the recruiter list failed too', async () => {
      server.use(http.get('*/api/banks/branches', boom), http.get('*/api/members', boom))
      renderWithProviders(<Recruiters />)

      expect(await screen.findByText('Banks did not load.')).toBeInTheDocument()
      expect(screen.queryByText(/up to date|below is complete/i)).not.toBeInTheDocument()
    })

    it('the must-pass: with the recruiter list loaded, it says that list is complete', async () => {
      server.use(http.get('*/api/banks/branches', boom))
      renderWithProviders(<Recruiters />)

      expect(await screen.findByText('Banks did not load. The recruiter list below is complete.')).toBeInTheDocument()
    })
  })

  describe('③ a count of zero', () => {
    it('reads 0 -- and a field with nothing in it still reads as a dash', async () => {
      server.use(http.get('*/api/recruitment-channels', () => HttpResponse.json([CHANNEL])))
      const user = setupUser()
      renderWithProviders(<Recruiters />)

      const [open] = await screen.findAllByRole('button', { name: /Synthetic Channel — show the members recruited/ })
      await user.click(open)
      await user.click(await screen.findByRole('button', { name: 'View recruiter details' }))

      const count = await screen.findByText('Members Recruited')
      expect(count.nextElementSibling, 'a count of zero printed as a dash, which reads as "unknown"').toHaveTextContent(/^0$/)
      // The must-pass, in the same record: an absent value is still a dash, not "0" or blank.
      expect(within(count.parentElement.parentElement).getByText('Phone').nextElementSibling).toHaveTextContent('—')
    })
  })

  describe('④ a failure inside a dialog', () => {
    const CANDIDATE = { id: 21, membershipNumber: 'M0021', initials: 'S', surname: 'Candidate', status: 'Active', bankName: 'Synthetic Bank' }
    const REFUSAL = 'Choose a recruiter type before making this member a recruiter.'

    async function refuseInAddRecruiter(user) {
      server.use(http.get('*/api/members', () => HttpResponse.json([CANDIDATE])))
      renderWithProviders(<Recruiters />)
      await user.click(await screen.findByRole('button', { name: /Add Recruiter/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Add Recruiter' })
      await user.type(within(dialog).getByLabelText('Search members'), 'Candidate')
      const [choose] = await within(dialog).findAllByRole('button', { name: /^Choose .* as the recruiter$/ })
      await user.click(choose)
      await user.click(within(dialog).getByRole('button', { name: /Make Recruiter/ }))
      return dialog
    }

    it('is said in the dialog -- not on the page behind its scrim', async () => {
      // 🔴 `fail()` set the page's notice, which rendered under the open dialog: the refusal happened and
      // the dialog in front of the user said nothing.
      const user = setupUser()
      const dialog = await refuseInAddRecruiter(user)

      expect(within(dialog).getByRole('alert')).toHaveTextContent(REFUSAL)
    })

    it('the must-pass: close the dialog, and the notice is still on the page', async () => {
      const user = setupUser()
      const dialog = await refuseInAddRecruiter(user)
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

      expect(await screen.findByText(REFUSAL)).toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Add Recruiter' })).not.toBeInTheDocument()
    })
  })

  describe('⑤ who recruited a member', () => {
    it('reads the recruiter the API names -- not a dash for every member', async () => {
      // 🔴 The row read `recruitmentRep`, which `MemberDto` does not carry; the API sends
      // `recruitmentRepresentativeName`. The Remarks row is the must-pass: an absent value is still a dash.
      const RECRUITED = {
        id: 31,
        membershipNumber: 'M0031',
        initials: 'S',
        surname: 'Recruited',
        status: 'Active',
        recruitmentRepresentativeId: 5,
        recruitmentRepresentativeName: 'Synthetic Channel',
      }
      server.use(
        http.get('*/api/recruitment-channels', () => HttpResponse.json([CHANNEL])),
        http.get('*/api/members', () => HttpResponse.json([RECRUITED])),
      )
      const user = setupUser()
      renderWithProviders(<Recruiters />)

      const [channel] = await screen.findAllByRole('button', { name: /Synthetic Channel — show the members recruited/ })
      await user.click(channel)
      const [member] = await screen.findAllByRole('button', { name: /M0031 — open the record for/ })
      await user.click(member)

      const rep = await screen.findByText('Recruitment Rep')
      expect(rep.nextElementSibling).toHaveTextContent('Synthetic Channel')
      expect(within(rep.parentElement.parentElement).getByText('Remarks').nextElementSibling).toHaveTextContent('—')
    })
  })

  describe('⑥ an action that worked says so', () => {
    // 🔴 `06.5`, F-P55: adding a member to a recruiter changed the list behind the dialog and said nothing. The failure
    // case is the must-pass -- a confirmation that replaced the failure notice would pass the first case alone.
    const CANDIDATE = { id: 41, membershipNumber: 'M0041', initials: 'S', surname: 'Candidate', status: 'Active', bankName: 'Synthetic Bank' }

    async function addTheCandidate(user) {
      server.use(
        http.get('*/api/recruitment-channels', () => HttpResponse.json([CHANNEL])),
        http.get('*/api/members', () => HttpResponse.json([CANDIDATE])),
      )
      renderWithProviders(<Recruiters />)
      const [channel] = await screen.findAllByRole('button', { name: /Synthetic Channel — show the members recruited/ })
      await user.click(channel)
      await user.click(await screen.findByRole('button', { name: /Add Member/ }))
      const [add] = await screen.findAllByRole('button', { name: 'Add S Candidate to this recruiter' })
      await user.click(add)
      return screen.findByRole('dialog', { name: 'Synthetic Channel' })
    }

    it('adding a member to a recruiter says who was added', async () => {
      server.use(http.put('*/api/members/:id', async ({ request }) => HttpResponse.json(await request.json())))
      const dialog = await addTheCandidate(setupUser())

      const said = await within(dialog).findByText('S Candidate was added to Synthetic Channel.')
      expect(said.closest('[role="status"]')).not.toBeNull()
    })

    it('🔒 00.2: the PUT carries no money it would write back as R 0,00 -- an omitted key keeps what is on file', async () => {
      // `|| 0` wrote a member with no subscription or balance on file back as a real zero. Server 0cf00e1's
      // IGNORE strategy keeps an omitted key, so the three amounts are not sent at all.
      let sent
      server.use(http.put('*/api/members/:id', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(sent)
      }))
      await addTheCandidate(setupUser())

      await waitFor(() => expect(sent).toBeDefined())
      for (const money of ['monthlySubscription', 'currentBalance', 'arrearsBalance']) {
        expect(sent, money).not.toHaveProperty(money)
      }
      // The must-pass: the builder still sends the record it was given.
      expect(sent).toMatchObject({ id: 41, membershipNumber: 'M0041', surname: 'Candidate' })
    })

    it('the must-pass: an add that failed still says so, as a failure', async () => {
      server.use(http.put('*/api/members/:id', boom))
      const dialog = await addTheCandidate(setupUser())

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/could not be assigned/)
      expect(within(dialog).queryByText(/was added to/)).not.toBeInTheDocument()
    })
  })
})
