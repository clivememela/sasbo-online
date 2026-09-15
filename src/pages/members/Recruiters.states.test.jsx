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
})
