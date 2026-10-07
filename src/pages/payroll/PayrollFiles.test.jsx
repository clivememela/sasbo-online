// @vitest-environment jsdom -- the Files list, the Admin page's card and the rail, as an administrator reaches and reads them
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import App from '../../App'
import Admin from '../admin/Admin'
import PayrollFiles from './PayrollFiles'
import { PERMISSIONS } from '../../auth/permissions'
import { navItems } from '../../config/navigation'
import { TestAuthProvider } from '../../test/authTestUtils'
import { expectErrorState, expectNoA11yViolations } from '../../test/assertions'
import { deferred } from '../../test/deferred'
import { server } from '../../test/msw/server'
import { smokeHandlers } from '../../test/msw/smokeLayer'
import { FILES, pageOf, payrollHandlers } from '../../test/msw/payrollExamples'
import { renderWithProviders } from '../../test/renderWithProviders'
import { setupUser } from '../../test/user'

/**
 * PAYROLL DEDUCTIONS AND RECONCILIATION -- the Files list: every employer's file in one place (Stephne, PAY-32), each
 * opening by a press or by its own address; the choices kept in the address; and no request at all for someone who may
 * not read it -- organisers never see payroll discrepancies (PAY-33).
 */

const VIEW = [PERMISSIONS.PAYROLL_VIEW]
const PROCESS = [PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_PROCESS]

const openFiles = (permissions = VIEW, initialEntries = ['/admin/payroll']) =>
  renderWithProviders(<TestAuthProvider permissions={permissions}><PayrollFiles /></TestAuthProvider>, { initialEntries })

/** Every request the page makes, by method and address -- the listener removed after the test. */
let stopWatching = () => {}
const watchRequests = () => {
  const seen = []
  const listener = ({ request }) => {
    const url = new URL(request.url)
    seen.push(`${request.method} ${url.pathname}${url.search}`)
  }
  server.events.on('request:start', listener)
  stopWatching = () => server.events.removeListener('request:start', listener)
  return seen
}

afterEach(() => {
  stopWatching()
  stopWatching = () => {}
})

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  server.use(...payrollHandlers())
})

describe('where it is -- the Admin page, the rail and the route agree', () => {
  it('Admin Membership offers it after A.C.B., at /admin/payroll', () => {
    renderWithProviders(<Admin />)
    const card = screen.getByRole('link', { name: /^Payroll Deductions and Reconciliation/ })
    expect(card).toHaveAttribute('href', '/admin/payroll')
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(hrefs.indexOf('/admin/payroll')).toBe(hrefs.indexOf('/admin/acb') + 1)
  })

  it('the rail holds it as a leaf of Admin Menu, with the data the rail reads to hide it from those without it', () => {
    const admin = navItems.find((item) => item.title === 'Admin Menu')
    const entry = admin.subItems.find((item) => item.href === '/admin/payroll')
    expect(entry).toMatchObject({ title: 'Payroll Deductions', permission: 'PAYROLL_VIEW', hideWithout: true })
    expect(entry.subItems).toBeUndefined()
    const titles = admin.subItems.map((item) => item.title)
    expect(titles.indexOf('Payroll Deductions')).toBe(titles.indexOf('A.C.B') + 1)
  })

  it('🔑 the route renders the page, and says what is needed to anyone not signed in', async () => {
    server.use(...smokeHandlers)
    renderWithProviders(<App />, { initialEntries: ['/admin/payroll'] })
    expect(await screen.findByRole('heading', { level: 1, name: 'Payroll Deductions and Reconciliation' })).toBeInTheDocument()
    expect(screen.getByText(/Sign in to read payroll reconciliation\./)).toBeInTheDocument()
  })
})

describe('who may read it', () => {
  it('🔒 nobody signed in: the sign-in notice, and not one request', async () => {
    const seen = watchRequests()
    openFiles([])
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Payroll Deductions and Reconciliation')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?next=%2Fadmin%2Fpayroll')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(seen).toEqual([])
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('🔒 an organiser, signed in without it, is told it needs a permission -- and nothing is read', async () => {
    const seen = watchRequests()
    openFiles([PERMISSIONS.MEMBERS_VIEW, PERMISSIONS.VISITS_CAPTURE])
    expect(screen.getByRole('status')).toHaveTextContent('You need permission to read payroll reconciliation.')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(seen).toEqual([])
  })

  it('reading needs PAYROLL_VIEW or PAYROLL_PROCESS; only processing offers Load a file', async () => {
    const view = openFiles(VIEW)
    await screen.findByRole('link', { name: 'Open Absa — September 2026' })
    expect(screen.queryByRole('link', { name: 'Load a file' })).not.toBeInTheDocument()
    view.unmount()

    openFiles([PERMISSIONS.PAYROLL_PROCESS])
    await screen.findByRole('link', { name: 'Open Absa — September 2026' })
    expect(screen.getByRole('link', { name: 'Load a file' })).toHaveAttribute('href', '/admin/payroll/load')
  })
})

describe('the list', () => {
  it('says it is loading until the server answers -- never "no files"', async () => {
    const answer = deferred()
    server.use(http.get('*/api/payroll/files', () => answer.promise))
    openFiles()
    expect(await screen.findByText('Loading files…')).toBeInTheDocument()
    expect(screen.queryByText('No payroll file loaded yet')).not.toBeInTheDocument()
    answer.resolve(HttpResponse.json(pageOf(FILES)))
    expect(await screen.findByRole('link', { name: 'Open Absa — September 2026' })).toBeInTheDocument()
  })

  it('every file by month and employer, what is still to follow up, and the payment check -- each opening by its own address', async () => {
    openFiles()
    const table = await screen.findByRole('table', { name: 'Payroll files, newest month first' })
    const absa = within(table).getByRole('link', { name: 'Open Absa — September 2026' }).closest('tr')
    expect(within(absa).getByText('September 2026')).toBeInTheDocument()
    expect(within(absa).getByText('9 open')).toBeInTheDocument()
    expect(within(absa).getByText('As expected')).toBeInTheDocument()
    expect(within(table).getByRole('link', { name: 'Open Absa — September 2026' })).toHaveAttribute('href', '/admin/payroll/files/12')

    const nedbank = within(table).getByRole('link', { name: 'Open Nedbank — September 2026' }).closest('tr')
    expect(within(nedbank).getByText('All resolved')).toBeInTheDocument()
    expect(within(nedbank).getByText('No payment recorded yet')).toBeInTheDocument()

    const gbs = within(table).getByRole('link', { name: 'Open GBS — September 2026' }).closest('tr')
    expect(within(gbs).getByText(/typed in/i)).toBeInTheDocument()
    expect(within(gbs).getByText('Short')).toBeInTheDocument()

    expect(within(table).getByRole('link', { name: 'Open Absa — August 2026' }).closest('tr')).toHaveTextContent('Replaced by a later file')
    expect(document.querySelector('footer')).toHaveTextContent('Showing 1–4 of 4')
  })

  it('an empty list says no file is loaded yet, and what to do about it', async () => {
    server.use(http.get('*/api/payroll/files', () => HttpResponse.json(pageOf([]))))
    openFiles(PROCESS)
    expect(await screen.findByText('No payroll file loaded yet')).toBeInTheDocument()
    expect(screen.getByText('Load an employer’s file to compare it with SASBO’s members.')).toBeInTheDocument()
  })

  it('a list that could not be read says so, with a retry -- never as an empty list', async () => {
    let reads = 0
    server.use(http.get('*/api/payroll/files', () => {
      reads += 1
      return reads === 1 ? HttpResponse.json({ message: 'boom' }, { status: 500 }) : HttpResponse.json(pageOf(FILES))
    }))
    openFiles()
    await screen.findByText('The payroll files could not be loaded.')
    await expectErrorState({ emptyText: 'No payroll file loaded yet' })
    await setupUser().click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('link', { name: 'Open Absa — September 2026' })).toBeInTheDocument()
    expect(reads).toBe(2)
  })
})

describe('the choices', () => {
  it('🔑 choosing an employer, a month and a file reads the list again, from the first page, with each choice sent', async () => {
    const asked = []
    server.use(http.get('*/api/payroll/files', ({ request }) => {
      asked.push(Object.fromEntries(new URL(request.url).searchParams))
      return HttpResponse.json(pageOf(FILES, { totalElements: 45 }))
    }))
    const user = setupUser()
    openFiles()
    await screen.findByRole('link', { name: 'Open Absa — September 2026' })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(asked.at(-1)).toMatchObject({ page: '1' }))

    // Last month, as the control offers it -- read from the control, never from this test's own clock.
    const month = within(screen.getByLabelText('Month')).getAllByRole('option')[2]
    await screen.findByRole('option', { name: 'Absa' })
    await user.selectOptions(screen.getByLabelText('Employer'), 'Absa')
    await user.selectOptions(screen.getByLabelText('Month'), month)
    await user.selectOptions(screen.getByLabelText('File'), 'Replaced')

    await waitFor(() => expect(asked.at(-1)).toEqual({ employerId: '1', period: month.value, status: 'SUPERSEDED', page: '0', size: '20' }))
    expect(month.value).toMatch(/^\d{4}-\d{2}$/)
    expect(asked[0]).toEqual({ page: '0', size: '20' })
  })

  it('choices arriving in the address are read as given, and an address that is not a choice is left out', async () => {
    const asked = []
    server.use(http.get('*/api/payroll/files', ({ request }) => {
      asked.push(Object.fromEntries(new URL(request.url).searchParams))
      return HttpResponse.json(pageOf([]))
    }))
    openFiles(VIEW, ['/admin/payroll?employer=2&month=2026-09&status=NONSENSE'])
    expect(await screen.findByText('No file matches these choices')).toBeInTheDocument()
    expect(asked).toEqual([{ employerId: '2', period: '2026-09', page: '0', size: '20' }])
  })

  it('the employers that could not be read say so under their control, and the list still reads', async () => {
    server.use(http.get('*/api/payroll/employers', () => HttpResponse.error()))
    openFiles()
    expect(await screen.findByText('Employer could not be loaded.')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Open Absa — September 2026' })).toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('the list, with its files, has no violations', async () => {
    const { container } = openFiles(PROCESS)
    await screen.findByRole('link', { name: 'Open Absa — September 2026' })
    await expectNoA11yViolations(container)
  })
})
