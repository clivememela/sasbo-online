// @vitest-environment jsdom -- the suspended members by name, and the lapsed: held, filtered, paged, in every state
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { http, HttpResponse } from 'msw'

import MonthEndSuspended from './MonthEndSuspended'
import { PERMISSIONS } from '../../auth/permissions'
import { TestAuthProvider } from '../../test/authTestUtils'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { monthEndAnswer, monthEndRefusal, monthEndExamples } from '../../test/msw/monthEndExamples'
import { suspended, suspendedPage } from '../../test/msw/monthEndSendExamples'
import { setupUser } from '../../test/user'
import { deferred } from '../../test/deferred'
import { expectNoA11yViolations } from '../../test/assertions'

/**
 * THE SUSPENDED MEMBERS, BY NAME -- `contracts/monthend-rules-api.md` R5; Stephne, MEN-18.
 *
 * Everyone suspended now, the oldest first, or only the lapsed (`?lapsed=1`) -- the members who can be deleted --
 * narrowed by bank and by code, a page of the server's at a time. Held by MEMBERS_VIEW and MONTH_END_VIEW both, so
 * nothing is asked before both are held. Every request recorded, so "nothing was asked" is a measurement.
 */

const BOTH = [PERMISSIONS.MEMBERS_VIEW, PERMISSIONS.MONTH_END_VIEW]

let asked
const record = ({ request }) => {
  const url = new URL(request.url)
  if (url.pathname.includes('/suspensions/')) asked.push(`${url.pathname.split('/').pop()} ${url.search}`)
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  asked = []
  server.events.on('request:start', record)
})

afterEach(() => {
  server.events.removeListener('request:start', record)
})

/** The two lists, answered by `answer(kind, url)` -- a body, or a response, or a promise of either. */
const lists = (answer) => http.get('*/api/month-end/suspensions/:kind', async ({ params, request }) => {
  const reply = await answer(params.kind, new URL(request.url))
  return reply instanceof Response ? reply : HttpResponse.json(reply)
})

const TWO = [
  suspended(),
  suspended({ memberId: 813, membershipNumber: 'M-095989', name: 'S Synthetic', bank: 'INVENTED INSURER', suspensionCode: 13,
    suspensionName: 'DEBIT RETURNED', noDeductionReason: null, suspendedOn: '2026-09-15', lapsesOn: '2026-12-15', lapsed: false }),
]

function Where() {
  const { search } = useLocation()
  return <output data-testid="where">{search}</output>
}

const openPage = ({ permissions = BOTH, path = '/admin/monthly-menu/suspended-members' } = {}) =>
  renderWithProviders(
    <TestAuthProvider permissions={permissions}><MonthEndSuspended /><Where /></TestAuthProvider>,
    { initialEntries: [path] },
  )

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
const cells = (row) => within(row).getAllByRole('cell').filter((cell) => !cell.hasAttribute('data-expander'))

describe('who may see them (DOD-14: organisers do not see suspensions)', () => {
  it.each([
    ['nobody signed in', [], /^Sign in to see members\./],
    ['MEMBERS_VIEW alone', [PERMISSIONS.MEMBERS_VIEW], /^You need permission to read month end\./],
    ['MONTH_END_VIEW alone', [PERMISSIONS.MONTH_END_VIEW], /^You need permission to see members\./],
  ])('🔒 %s: told what is needed, and nothing is asked', async (_, permissions, sentence) => {
    server.use(lists(() => suspendedPage(TWO)))
    openPage({ permissions })

    expect(await screen.findByText(sentence)).toBeInTheDocument()
    expect(asked).toEqual([])
  })
})

describe('the list', () => {
  it('🔑 each member: the number (to the register), name, bank, code, reason, and when it began and lapses -- the reminder above', async () => {
    server.use(lists(() => suspendedPage(TWO, { total: 2 })))
    openPage()

    expect(await screen.findByRole('table', { name: 'Members suspended now' })).toBeInTheDocument()
    await screen.findByText('T Invented')
    expect(asked).toEqual(['members ?page=0&size=50'])
    expect(screen.getByText('1 suspension has lapsed. The member can be deleted.')).toBeInTheDocument()
    expect(screen.getByText(/^As at 7 October 2026: 2 suspended\. A suspension lapses 3 months after the day it began\.$/)).toBeInTheDocument()
    const [first, second] = bodyRows()
    expect(cells(first).map((cell) => cell.textContent)).toEqual(['M-095990', 'T Invented', 'INVENTED BANK',
      '11 · NOT ON PAYROLL', 'Unpaid leave', 'R/A 900001 INVENTED BRANCH', '2 June 2026', '2 September 2026lapsed: can be deleted'])
    expect(cells(second).at(-1).textContent).toBe('15 December 2026')
    expect(within(first).getByRole('link', { name: 'Open M-095990 in the register' })).toHaveAttribute('href', '/members?q=M-095990')
  })

  it('🔑 only the lapsed: asked of the lapsed list, kept in the address', async () => {
    server.use(lists((kind) => suspendedPage(kind === 'lapsed' ? TWO.slice(0, 1) : TWO)))
    const user = setupUser()
    openPage()

    await screen.findByText('S Synthetic')
    // By its role and whole name: each row's "Show details" is a label that begins with it too.
    await user.selectOptions(screen.getByRole('combobox', { name: /^Show$/ }), 'lapsed')
    expect(await screen.findByRole('table', { name: 'Suspensions that have lapsed' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('S Synthetic')).not.toBeInTheDocument())
    expect(asked).toEqual(['members ?page=0&size=50', 'lapsed ?page=0&size=50'])
    expect(screen.getByTestId('where')).toHaveTextContent('?lapsed=1')
  })

  it('narrowed by bank and by code -- SASBO\'s own lists, asked for when each control is opened', async () => {
    server.use(lists(() => suspendedPage(TWO)), monthEndAnswer('GET /api/reference/employers'),
      monthEndAnswer('GET /api/reference/suspension-codes'))
    const user = setupUser()
    openPage()

    await screen.findByText('T Invented')
    const bank = screen.getByLabelText(/^Bank/)
    await user.click(bank)
    await waitFor(() => expect(within(bank).getByRole('option', { name: 'INVENTED BANK' })).toBeInTheDocument())
    await user.selectOptions(bank, 'INVENTED BANK')
    await waitFor(() => expect(asked.at(-1)).toBe('members ?page=0&size=50&employer=1'))

    const code = screen.getByLabelText(/^Code/)
    await user.click(code)
    await waitFor(() => expect(within(code).getByRole('option', { name: '11 · NOT ON PAYROLL' })).toBeInTheDocument())
    await user.selectOptions(code, '11')
    await waitFor(() => expect(asked.at(-1)).toBe('members ?page=0&size=50&employer=1&code=11'))
    expect(screen.getByTestId('where')).toHaveTextContent('?employer=1&code=11')
  })

  it('a page at a time, as the server pages it', async () => {
    const many = Array.from({ length: 50 }, (_, index) => suspended({ memberId: 1000 + index, membershipNumber: `M-09${5800 + index}` }))
    server.use(lists((kind, url) => (url.searchParams.get('page') === '1'
      ? suspendedPage([suspended({ memberId: 2, name: 'Z Last' })], { page: 1, total: 51, totalPages: 2 })
      : suspendedPage(many, { total: 51, totalPages: 2 }))))
    const user = setupUser()
    openPage()

    await waitFor(() => expect(bodyRows()).toHaveLength(50))
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText('Z Last')).toBeInTheDocument()
    expect(asked).toEqual(['members ?page=0&size=50', 'members ?page=1&size=50'])
  })
})

describe('the states', () => {
  it('loading, then nobody suspended -- said as none', async () => {
    const held = deferred()
    server.use(lists(async () => {
      await held.promise
      return suspendedPage([], { total: 0, lapsed: 0 })
    }))
    openPage()

    expect(await screen.findByRole('table', { name: 'Members suspended now' })).toBeInTheDocument()
    held.resolve()
    expect(await screen.findByText('No member is suspended.')).toBeInTheDocument()
    expect(screen.getByText('No suspension has lapsed.')).toBeInTheDocument()
  })

  it('a failed read is said, with Try again -- never as none', async () => {
    let reads = 0
    server.use(lists(() => {
      reads += 1
      return reads === 1 ? HttpResponse.json({ status: 503, error: 'Service Unavailable', code: 'SUMMARY_UNAVAILABLE',
        message: 'The list is taking too long. Nothing is wrong with the records; try again.' }, { status: 503 }) : suspendedPage(TWO)
    }))
    const user = setupUser()
    openPage()

    expect(await screen.findByText('The list is taking too long. Nothing is wrong with the records; try again.')).toBeInTheDocument()
    expect(screen.queryByText('No member is suspended.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('T Invented')).toBeInTheDocument()
  })

  it('a page the server refuses is said in its words (SUSPENDED_PAGE_INVALID)', async () => {
    server.use(monthEndRefusal('SUSPENDED_PAGE_INVALID', 'GET /api/month-end/suspensions/members'))
    openPage({ path: '/admin/monthly-menu/suspended-members?page=9' })

    expect(await screen.findByText(monthEndExamples.refusals.SUSPENDED_PAGE_INVALID.body.message)).toBeInTheDocument()
  })

  it('MV-36: an answer of another shape is not available', async () => {
    server.use(lists(() => []))
    openPage()

    expect(await screen.findByText('The suspended members are not available from this server yet.')).toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('the list, its filters and the reminder have no violations (MR-ROB-37)', async () => {
    server.use(lists(() => suspendedPage(TWO, { total: 2 })))
    const { container } = openPage()

    await screen.findByText('S Synthetic')
    await expectNoA11yViolations(container)
  })
})
