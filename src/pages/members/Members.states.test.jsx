// @vitest-environment jsdom -- renders the member register in each of its three states
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import MembersPage from './Members'
import { renderWithProviders } from '../../test/renderWithProviders'
import { expectErrorState } from '../../test/assertions'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * THE THREE-STATE RULE, TESTED WHERE IT IS CLAIMED.
 *
 * Loading, empty, failed-with-retry. The rule exists because an error rendered
 * as an empty table is a CONFIDENT WRONG ANSWER: it tells an administrator
 * there are no members when the backend is down. Those are different facts and
 * only a test can tell them apart -- from the outside they are the same
 * screen, which is exactly why nobody notices.
 *
 * This is the flagship list page of the application, so it is where the rule
 * matters most.
 *
 * ✅ **A27 IS CLOSED, by `04.2`.** When these were written the page had NEITHER a loading
 * state nor an error state: the mount effect's entire failure handling was `console.error`
 * and `membersList` simply stayed `[]`. The register now renders through the `Table`
 * primitive, whose four data states are separate branches by construction. The three pins
 * that recorded the defect are deleted, the two standard-facing tests below are un-skipped,
 * and the "cannot be told apart" case is INVERTED rather than removed -- it is the
 * assertion that would notice the day someone reintroduced the old shape.
 *
 * Every assertion about the failed state goes through `expectErrorState` from
 * `src/test/assertions.js` rather than being hand-rolled here. A second
 * bespoke error-state assertion is the thing that helper exists to prevent:
 * the contract holds because one function enforces it, not because every
 * author remembered both halves of it.
 */

/** The empty state's own words. The whole defect turned on this string. */
const EMPTY_TEXT = /No Sasbo members match the specified query definitions/i

const MEMBERS = [
  {
    id: 1,
    firstNames: 'Synthetic',
    surname: 'Testperson',
    identityNumber: '9001010000080',
    status: 'Active',
  },
]

const membersRespond = (body, status = 200) =>
  http.get('*/api/members', () => HttpResponse.json(body, { status }))

/** A slow answer, so the loading state is observable rather than a race. */
const membersRespondSlowly = () =>
  http.get('*/api/members', async () => {
    await new Promise((r) => setTimeout(r, 50))
    return HttpResponse.json(MEMBERS)
  })

let consoleError

describe('the Members list', () => {
  beforeEach(() => {
    // Still spied: the page logs the failure as well as showing it, and an unmocked
    // console.error would be real noise on a green run.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(...pageFixtures)
  })

  describe('the EMPTY state', () => {
    it('says so plainly when the server genuinely has no members', async () => {
      server.use(membersRespond([]))
      renderWithProviders(<MembersPage />)

      expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument()
    })
  })

  describe('the LOADED state', () => {
    it('renders the members the server returned', async () => {
      server.use(membersRespond(MEMBERS))
      renderWithProviders(<MembersPage />)

      expect(await screen.findByText(/Testperson/)).toBeInTheDocument()
      // The empty text must be gone. Asserted because a table that renders
      // both its rows and its empty message is a real bug that reads as fine.
      expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument()
    })
  })

  describe('the LOADING state', () => {
    it('says it is loading before it says it is empty', async () => {
      // A request that has not answered yet is not an answer. The page used to render
      // its empty table synchronously on mount, so the FIRST thing every user saw,
      // every time, was "no members" -- which then flickered into data.
      server.use(membersRespondSlowly())
      renderWithProviders(<MembersPage />)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument()

      // ...and it does eventually finish. Without this the test above would also pass
      // against a page that renders a spinner and never anything else -- which is A22's
      // shape, one row over.
      expect(await screen.findByText(/Testperson/)).toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('the FAILED state', () => {
    it('shows an error with a retry, not "no members"', async () => {
      server.use(membersRespond({ status: 500, error: 'Internal Server Error' }, 500))
      renderWithProviders(<MembersPage />)

      // 🔑 WAIT FIRST. `expectErrorState` queries SYNCHRONOUSLY -- it checks both halves
      // of the rule at the instant it is called, which is what makes it a rule and not a
      // poll. Called straight after render it asserts about the LOADING screen, where
      // there is legitimately no error affordance yet, and reports the confident-wrong-
      // answer failure for a page that is behaving perfectly.
      await screen.findByRole('alert')

      // Both halves, through the shared helper: the error affordance is
      // present AND the empty-state text is absent.
      const { retry } = await expectErrorState({ emptyText: EMPTY_TEXT })
      expect(retry, 'a failed list must offer a way to try again').not.toBeNull()
    })

    it('the retry actually re-runs the request, and recovers', async () => {
      // 🔑 AN ERROR STATE WITH A DEAD BUTTON IS STILL A DEAD END, and that is invisible
      // from the outside: the affordance is there, it has the right name, and pressing
      // it does nothing. The assertion above cannot tell those apart -- this can.
      const user = setupUser()
      server.use(membersRespond({ status: 500 }, 500))
      renderWithProviders(<MembersPage />)

      await screen.findByRole('alert')
      const { retry } = await expectErrorState({ emptyText: EMPTY_TEXT })

      server.use(membersRespond(MEMBERS))
      await user.click(retry)

      expect(await screen.findByText(/Testperson/)).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('CAN be told apart from a genuinely empty list', async () => {
      // 🔴 THE INVERSION. This case used to assert the two screens were IDENTICAL, with a
      // message saying "if these now differ, check A27". They differ. It is kept, the
      // right way round, because it is the one assertion that compares the two screens
      // against each other rather than each against a fixture -- so it is what would
      // notice the day a well-meaning change made a failed fetch fall back to `[]` again.
      server.use(membersRespond({ status: 500 }, 500))
      const failed = renderWithProviders(<MembersPage />)
      await screen.findByRole('alert')
      await expectErrorState({ emptyText: EMPTY_TEXT })
      const whenDown = failed.container.textContent
      failed.unmount()

      server.resetHandlers()
      server.use(...pageFixtures, membersRespond([]))
      const empty = renderWithProviders(<MembersPage />)
      await screen.findByText(EMPTY_TEXT)
      const whenEmpty = empty.container.textContent

      expect(
        whenDown,
        'The backend being down and the union having no members render the same screen ' +
          'again. That is A27 exactly: an administrator reads "no members" as a fact ' +
          'about the union rather than a fact about the server.',
      ).not.toBe(whenEmpty)
    })
  })

  describe('the network never being reached at all', () => {
    it('is reported as a failure too, not as "no members"', async () => {
      // A rejected fetch and a 500 arrive at the page by different paths -- one throws
      // before there is a response to read -- and only one of them was ever exercised.
      server.use(http.get('*/api/members', () => HttpResponse.error()))
      renderWithProviders(<MembersPage />)

      await screen.findByRole('alert')
      const { retry } = await expectErrorState({ emptyText: EMPTY_TEXT })
      expect(retry).not.toBeNull()

      await waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining('Failed fetching records array'),
          expect.anything(),
        ),
      )
    })
  })
})
