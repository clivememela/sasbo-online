// @vitest-environment jsdom -- renders the member register in each of its three states
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import MembersPage from './Members'
import { renderWithProviders } from '../../test/renderWithProviders'
import { expectErrorState } from '../../test/assertions'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { DEFECTS, disabled, pin } from '../../test/knownDefects'

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
 * matters most. Measured 2026-09-05: it has NEITHER a loading state nor an
 * error state (register A27). The mount effect's entire failure handling is
 * `console.error`, and `membersList` simply stays `[]`.
 *
 * Every assertion about the failed state goes through `expectErrorState` from
 * `src/test/assertions.js` rather than being hand-rolled here. A second
 * bespoke error-state assertion is the thing that helper exists to prevent:
 * the contract holds because one function enforces it, not because every
 * author remembered both halves of it.
 */

/** The empty state's own words. The whole defect turns on this string. */
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


/**
 * The page's ENTIRE failure handling is `console.error`, so it is also the
 * only observable signal that a rejection has been processed. The pins below
 * wait on it before asserting, which is what stops them asserting the loading
 * render by accident.
 */
let consoleError

describe('the Members list', () => {
  beforeEach(() => {
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
    it.skip(
      disabled(DEFECTS.A27, 'the list must say it is loading before it says it is empty'),
      async () => {
        // Written to the standard: a request that has not answered yet is not
        // an answer. Today the page renders its empty table synchronously on
        // mount, so the FIRST thing every user sees, every time, is "no
        // members" -- which then flickers into data.
        server.use(
          http.get('*/api/members', async () => {
            await new Promise((r) => setTimeout(r, 50))
            return HttpResponse.json(MEMBERS)
          }),
        )
        renderWithProviders(<MembersPage />)

        expect(screen.getByRole('status')).toBeInTheDocument()
        expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument()
      },
    )

    it(pin(DEFECTS.A27, 'the list still shows "no members" before the request answers'), () => {
      server.use(
        http.get('*/api/members', async () => {
          await new Promise((r) => setTimeout(r, 50))
          return HttpResponse.json(MEMBERS)
        }),
      )
      renderWithProviders(<MembersPage />)

      // Synchronously, before anything has answered.
      expect(
        screen.queryByText(EMPTY_TEXT),
        'A27 has been fixed at the loading state -- the page no longer claims to be empty ' +
          'while it is still fetching. Delete this pin and un-skip the test above.',
      ).toBeInTheDocument()
    })
  })

  describe('the FAILED state', () => {
    it.skip(
      disabled(DEFECTS.A27, 'a failed fetch must show an error with a retry, not "no members"'),
      async () => {
        server.use(membersRespond({ status: 500, error: 'Internal Server Error' }, 500))
        renderWithProviders(<MembersPage />)

        // Both halves, through the shared helper: the error affordance is
        // present AND the empty-state text is absent.
        const { retry } = await expectErrorState({ emptyText: EMPTY_TEXT })
        expect(retry, 'a failed list must offer a way to try again').not.toBeNull()
      },
    )

    it(
      pin(DEFECTS.A27, 'a failed fetch still renders as "there are no members"'),
      async () => {
        server.use(membersRespond({ status: 500, error: 'Internal Server Error' }, 500))
        renderWithProviders(<MembersPage />)

        // WAIT FOR THE FAILURE TO HAVE BEEN HANDLED FIRST.
        //
        // An earlier version of this pin asserted the empty text immediately.
        // It passed -- and it would have passed against a page with a perfect
        // error state, because the empty table is ALSO what renders at t=0
        // before any request has answered. The assertion was true of the
        // loading render, not of the failed one, so it could not fail.
        //
        // Found by running this phase's second reddening change: an error
        // state was added to the page on purpose, and this pin stayed green.
        // That is the "assertion that cannot fail" the plans warn about, and
        // the only reason it was caught is that the change was actually RUN
        // rather than reasoned about.
        //
        // `console.error` is the page's entire failure handling, so it is also
        // the only observable signal that the rejection has been processed.
        await waitFor(() =>
          expect(consoleError).toHaveBeenCalledWith(
            expect.stringContaining('Failed fetching records array'),
            expect.anything(),
          ),
        )

        // NOW the assertion means something: the failure has been handled, and
        // the screen still states a fact about the union.
        expect(
          screen.getByText(EMPTY_TEXT),
          'A27 has been fixed at the failed state. Delete this pin, un-skip the test ' +
            'above, and close the row.',
        ).toBeInTheDocument()

        // And there is nothing at all to distinguish it.
        expect(screen.queryByRole('alert')).toBeNull()
        expect(screen.queryByRole('button', { name: /retry|try again|reload/i })).toBeNull()
      },
    )

    it('CANNOT be told apart from a genuinely empty list', async () => {
      // The register row in one assertion, and the reason this is a defect
      // rather than a missing nicety: the two screens are identical.
      server.use(membersRespond({ status: 500 }, 500))
      const failed = renderWithProviders(<MembersPage />)
      await screen.findByText(EMPTY_TEXT)
      const whenDown = failed.container.textContent
      failed.unmount()

      server.resetHandlers()
      server.use(...pageFixtures, membersRespond([]))
      const empty = renderWithProviders(<MembersPage />)
      await screen.findByText(EMPTY_TEXT)
      const whenEmpty = empty.container.textContent

      expect(
        whenDown,
        'The two screens now differ, which means the application has started ' +
          'distinguishing "the backend is down" from "there are no members". Check A27.',
      ).toBe(whenEmpty)
    })
  })

  describe('the network never being reached at all', () => {
    it(pin(DEFECTS.A27, 'a network failure is also reported as "no members"'), async () => {
      server.use(http.get('*/api/members', () => HttpResponse.error()))
      renderWithProviders(<MembersPage />)

      // Same discipline as the pin above: wait until the rejection has
      // actually been handled, or this asserts the loading render instead.
      await waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining('Failed fetching records array'),
          expect.anything(),
        ),
      )

      expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })
})
