// @vitest-environment jsdom -- the Month end page's October sections: sending the month, and the lapsed suspensions
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import MonthEndSending from './MonthEndSending'
import { SUSPENDED_HREF } from './monthEndRules'
import { PERMISSIONS } from '../../auth/permissions'
import { TestAuthProvider } from '../../test/authTestUtils'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { suspended, suspendedPage } from '../../test/msw/monthEndSendExamples'
import { deferred } from '../../test/deferred'

/**
 * SENDING THE MONTH, AND THE LAPSED SUSPENSIONS -- the Month end page's October sections.
 *
 * The three sending screens as links, each for a taken month only; and Stephne's reminder (MEN-18: "The system should
 * also remind us when the suspension period for a member have lapsed, so we can delete") -- the first few and how many,
 * from the lapsed list's own count (R5), asked only of someone holding MEMBERS_VIEW and MONTH_END_VIEW both.
 */

const BOTH = [PERMISSIONS.MEMBERS_VIEW, PERMISSIONS.MONTH_END_VIEW]

let asked
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  asked = []
})

const lapsedAnswer = (answer) => http.get('*/api/month-end/suspensions/lapsed', ({ request }) => {
  asked.push(new URL(request.url).search)
  return typeof answer === 'function' ? answer() : HttpResponse.json(answer)
})

const open = ({ permissions = BOTH, month = '2026-08', taken = true } = {}) =>
  renderWithProviders(<TestAuthProvider permissions={permissions}><MonthEndSending month={month} taken={taken} /></TestAuthProvider>,
    { initialEntries: ['/admin/monthly-menu'] })

describe('Sending the month', () => {
  it('🔑 three screens, each for the month chosen where it is a taken one', () => {
    open({ permissions: [PERMISSIONS.MONTH_END_SEND] })

    expect(screen.getByRole('link', { name: /^The regions’ packs/ })).toHaveAttribute('href', '/admin/monthly-menu/region-packs?month=2026-08')
    expect(screen.getByRole('link', { name: /^Files for the banks and providers/ })).toHaveAttribute('href', '/admin/monthly-menu/files?month=2026-08')
    expect(screen.getByRole('link', { name: /^What was sent/ })).toHaveAttribute('href', '/admin/monthly-menu/sent?month=2026-08')
  })

  it('for the open month, each opens on the newest month taken -- a pack is made from a take', () => {
    open({ permissions: [PERMISSIONS.MONTH_END_SEND], month: '2026-09', taken: false })

    expect(screen.getByRole('link', { name: /^The regions’ packs/ })).toHaveAttribute('href', '/admin/monthly-menu/region-packs')
  })
})

describe('the lapsed suspensions (MEN-18)', () => {
  it('🔒 nobody signed in: asked to sign in, and nothing is asked of the server', () => {
    server.use(lapsedAnswer(suspendedPage()))
    open({ permissions: [] })

    expect(screen.getByText(/^Sign in to see members\./)).toBeInTheDocument()
    expect(asked).toEqual([])
  })

  it('🔒 MEMBERS_VIEW without MONTH_END_VIEW is not enough -- organisers do not see suspensions (DOD-14)', () => {
    server.use(lapsedAnswer(suspendedPage()))
    open({ permissions: [PERMISSIONS.MEMBERS_VIEW] })

    expect(screen.getByText(/^You need permission to read month end\./)).toBeInTheDocument()
    expect(asked).toEqual([])
  })

  it('🔑 the first five and how many -- the members can be deleted -- with the way to the whole list', async () => {
    const items = [
      suspended(),
      suspended({ memberId: 813, membershipNumber: 'M-095991', name: 'R Invented', bank: 'INVENTED INSURER', lapsesOn: '2026-09-20' }),
    ]
    server.use(lapsedAnswer(suspendedPage(items, { total: 7 })))
    open()

    expect(await screen.findByText('7 suspensions have lapsed. The members can be deleted.')).toBeInTheDocument()
    expect(asked).toEqual(['?page=0&size=5'])
    expect(within(screen.getByRole('list', { name: 'Suspensions that have lapsed' })).getAllByRole('listitem').map((item) => item.textContent))
      .toEqual(['M-095990 · T Invented · INVENTED BANK · lapsed on 2 September 2026', 'M-095991 · R Invented · INVENTED INSURER · lapsed on 20 September 2026'])
    expect(screen.getByText(/^5 more\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See every lapsed suspension' })).toHaveAttribute('href', `${SUSPENDED_HREF}?lapsed=1`)
    expect(screen.getByRole('link', { name: 'See every suspended member' })).toHaveAttribute('href', SUSPENDED_HREF)
  })

  it('none lapsed: said as none', async () => {
    server.use(lapsedAnswer(suspendedPage([])))
    open()

    expect(await screen.findByText('No suspension has lapsed.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Suspensions that have lapsed' })).not.toBeInTheDocument()
  })

  it('loading, then a failure said in words -- never as none lapsed', async () => {
    const held = deferred()
    server.use(lapsedAnswer(async () => {
      await held.promise
      return HttpResponse.json({ status: 503, error: 'Service Unavailable' }, { status: 503 })
    }))
    open()

    expect(screen.getByText('Reading the lapsed suspensions…')).toBeInTheDocument()
    held.resolve()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.queryByText('No suspension has lapsed.')).not.toBeInTheDocument()
  })

  it('MV-36: an answer of another shape is not available', async () => {
    server.use(lapsedAnswer([]))
    open()

    expect(await screen.findByText('The lapsed suspensions are not available from this server yet.')).toBeInTheDocument()
  })
})
