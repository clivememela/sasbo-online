// @vitest-environment jsdom -- the queries to an employer: the add / delete / correct lists, raised and downloaded
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'

import PayrollQueries from './PayrollQueries'
import { PERMISSIONS } from '../../auth/permissions'
import { formatZar } from '../../lib/format'
import { TestAuthProvider } from '../../test/authTestUtils'
import { expectErrorState, expectNoA11yViolations } from '../../test/assertions'
import { deferred } from '../../test/deferred'
import { server } from '../../test/msw/server'
import { QUERIES, payrollHandlers, refusal } from '../../test/msw/payrollExamples'
import { renderWithProviders } from '../../test/renderWithProviders'
import { setupUser } from '../../test/user'

/**
 * QUERIES TO THE EMPLOYER -- what SASBO asks an employer to change after its file is compared: add a member to its
 * deductions, delete a person from them, or correct an amount (PAY-21: "We send them the discrepancy queries - To add or
 * delete."). Raised from the file's open discrepancies; downloaded for the employer protected by a password the
 * administrator types, which is sent once and kept nowhere, because the list leaves SASBO (POPIA).
 */

const VIEW = [PERMISSIONS.PAYROLL_VIEW]
const PROCESS = [PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_PROCESS]

const openQueries = (permissions = PROCESS, entry = '/admin/payroll/files/12/queries') => renderWithProviders(
  <TestAuthProvider permissions={permissions}>
    <Routes>
      <Route path="/admin/payroll/files/:fileId/queries" element={<PayrollQueries />} />
    </Routes>
  </TestAuthProvider>,
  { initialEntries: [entry] },
)

const ready = () => screen.findByRole('heading', { level: 1, name: 'Queries to Absa — September 2026' })
const money = (amount) => formatZar(amount).replace(/\s/g, ' ')

/** The query lists' reads, counted. */
const queryReads = (answer = () => HttpResponse.json(QUERIES)) => {
  const reads = { count: 0 }
  server.use(http.get('*/api/payroll/files/:id/queries', () => {
    reads.count += 1
    return answer(reads.count)
  }))
  return reads
}

let stopWatching = () => {}
const originals = { create: URL.createObjectURL ?? (() => 'blob:none'), revoke: URL.revokeObjectURL ?? (() => {}) }
let saved

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  saved = []
  URL.createObjectURL = () => 'blob:synthetic/1'
  URL.revokeObjectURL = () => {}
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function press() {
    if (this.download) saved.push(this.download)
  })
  server.use(...payrollHandlers())
})

afterEach(() => {
  stopWatching()
  stopWatching = () => {}
  URL.createObjectURL = originals.create
  URL.revokeObjectURL = originals.revoke
})

describe('reading the query lists', () => {
  it('🔒 nobody signed in is asked to sign in, and nothing is read', async () => {
    const seen = []
    const listener = ({ request }) => seen.push(request.url)
    server.events.on('request:start', listener)
    stopWatching = () => server.events.removeListener('request:start', listener)
    openQueries([])
    expect(screen.getByRole('heading', { level: 1, name: 'Queries to the employer' })).toBeInTheDocument()
    expect(screen.getByText(/Sign in to read payroll reconciliation\./)).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(seen).toEqual([])
  })

  it('says it is reading until the server answers', async () => {
    const held = deferred()
    queryReads(() => held.promise)
    openQueries()
    expect(await screen.findByText('Reading the query lists…')).toBeInTheDocument()
    held.resolve(HttpResponse.json(QUERIES))
    expect(await ready()).toBeInTheDocument()
  })

  it('lists that could not be read say so, with a retry -- never "no query list"', async () => {
    const reads = queryReads((n) => (n === 1 ? HttpResponse.json({ message: 'boom' }, { status: 500 }) : HttpResponse.json(QUERIES)))
    openQueries()
    await screen.findByText('The query lists could not be loaded.')
    await expectErrorState({ emptyText: 'No query list raised yet' })
    await setupUser().click(screen.getByRole('button', { name: /try again/i }))
    expect(await ready()).toBeInTheDocument()
    expect(reads.count).toBe(2)
  })

  it('a file the server does not have is not found, in its own words', async () => {
    openQueries(PROCESS, '/admin/payroll/files/99/queries')
    expect(await screen.findByText('There is no payroll file with that number.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All files' })).toHaveAttribute('href', '/admin/payroll')
  })

  it('🔑 each list, with every line: what the employer is asked to do, for whom, the amounts, and why', async () => {
    openQueries()
    await ready()
    expect(screen.getByRole('heading', { level: 2, name: 'Query list raised on 29 September 2026 at 11:00' })).toBeInTheDocument()
    expect(screen.getByText(/^By system\. 1 to add, 1 to delete, 1 to correct\.$/)).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Query list raised on 29 September 2026 at 11:00' })
    const rowOf = (name) => within(table).getByText(name).closest('tr')

    expect(rowOf('C. Sample')).toHaveTextContent('AddStart or resume deducting')
    expect(rowOf('C. Sample')).toHaveTextContent('Staff number EMP-40020 · M-095102')
    expect(rowOf('C. Sample')).toHaveTextContent('Missing from the file')
    expect(rowOf('C. Sample')).toHaveTextContent(money(174))
    expect(rowOf('Z. Invented')).toHaveTextContent('DeleteStop deducting')
    expect(rowOf('Z. Invented')).toHaveTextContent('Not a member of SASBO: please stop this deduction.')
    expect(rowOf('B.K. Testerson')).toHaveTextContent('CorrectCorrect the amount')
    expect(rowOf('B.K. Testerson')).toHaveTextContent(`${money(150)}${money(174)}`)
    expect(screen.getByRole('link', { name: 'Back to the file' })).toHaveAttribute('href', '/admin/payroll/files/12')
  })

  it('a file with no list yet says so, and who raises one', async () => {
    queryReads(() => HttpResponse.json([]))
    const view = openQueries(VIEW)
    expect(await screen.findByText('No query list raised yet')).toBeInTheDocument()
    expect(screen.getByText('An administrator who processes payroll files raises them.')).toBeInTheDocument()
    view.unmount()
    openQueries(PROCESS)
    expect(await screen.findByText('Raise one from the file’s open discrepancies.')).toBeInTheDocument()
  })
})

describe('raising a list', () => {
  it('raises one from the open discrepancies and reads the lists again', async () => {
    const reads = queryReads()
    const raises = []
    server.use(http.post('*/api/payroll/files/:id/queries', () => {
      raises.push(1)
      return HttpResponse.json(QUERIES[0], { status: 201 })
    }))
    const user = setupUser()
    openQueries()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Raise a query list' }))
    expect(await screen.findByText('The query list was raised. Download it below for the employer.')).toBeInTheDocument()
    await waitFor(() => expect(reads.count).toBe(2))
    expect(raises).toHaveLength(1)
  })

  it('nothing left to query is said in the server\'s words', async () => {
    server.use(http.post('*/api/payroll/files/:id/queries', () =>
      refusal(409, 'NOTHING_TO_QUERY', 'Every discrepancy that needs the employer is already on a query list.')))
    const user = setupUser()
    openQueries()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Raise a query list' }))
    expect(await screen.findByText('Every discrepancy that needs the employer is already on a query list.')).toBeInTheDocument()
  })

  it('arriving from the file page after raising one says it was raised', async () => {
    openQueries(PROCESS, { pathname: '/admin/payroll/files/12/queries', state: { raised: 3 } })
    await ready()
    expect(screen.getByText('The query list was raised. Download it below for the employer.')).toBeInTheDocument()
  })

  it('🔒 reading alone: no raising, no downloading for the employer', async () => {
    openQueries(VIEW)
    await ready()
    expect(screen.queryByRole('button', { name: 'Raise a query list' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download for the employer' })).not.toBeInTheDocument()
  })
})

describe('downloading a list for the employer -- protected by a password (POPIA)', () => {
  const downloads = () => {
    const seen = []
    server.use(http.post('*/api/payroll/queries/:id/download', async ({ request }) => {
      seen.push(await request.json())
      return new HttpResponse('synthetic bytes', {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="Payroll queries - Absa - September 2026.pdf"' },
      })
    }))
    return seen
  }

  it('🔑 needs a password of 8 to 64 characters, typed twice, then sends it once in the body and saves the file', async () => {
    const seen = downloads()
    const user = setupUser()
    openQueries()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Download for the employer' }))
    const dialog = screen.getByRole('dialog', { name: 'Download the query list for the employer' })
    expect(dialog).toHaveAccessibleDescription('Raised on 29 September 2026 at 11:00. It leaves SASBO, so it is protected by a password.')

    await user.click(within(dialog).getByRole('button', { name: 'Download' }))
    expect(within(dialog).getByLabelText(/^Password for the file/)).toHaveAccessibleDescription('Choose a password of at least 8 characters.')
    expect(seen).toEqual([])

    await user.type(within(dialog).getByLabelText(/^Password for the file/), 'placeholder')
    await user.type(within(dialog).getByLabelText(/^The same password again/), 'xxxxxxxxxx')
    await user.click(within(dialog).getByRole('button', { name: 'Download' }))
    expect(within(dialog).getByLabelText(/^The same password again/)).toHaveAccessibleDescription('The two passwords differ.')
    expect(seen).toEqual([])

    await user.clear(within(dialog).getByLabelText(/^The same password again/))
    await user.type(within(dialog).getByLabelText(/^The same password again/), 'placeholder')
    await user.selectOptions(within(dialog).getByLabelText('Format'), 'PDF')
    await user.click(within(dialog).getByRole('button', { name: 'Download' }))

    expect(await screen.findByText('The query list is downloading. Send the password to the employer separately.')).toBeInTheDocument()
    expect(seen).toEqual([{ format: 'pdf', password: 'placeholder' }])
    expect(saved).toEqual(['Payroll queries - Absa - September 2026.pdf'])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a list that did not arrive says so inside the dialog', async () => {
    server.use(http.post('*/api/payroll/queries/:id/download', () =>
      refusal(400, 'PASSWORD_INVALID', 'The password must be 8 to 64 characters.')))
    const user = setupUser()
    openQueries()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Download for the employer' }))
    const dialog = screen.getByRole('dialog', { name: 'Download the query list for the employer' })
    await user.type(within(dialog).getByLabelText(/^Password for the file/), 'placeholder')
    await user.type(within(dialog).getByLabelText(/^The same password again/), 'placeholder')
    await user.click(within(dialog).getByRole('button', { name: 'Download' }))
    expect(await within(dialog).findByText('The query list could not be downloaded. The password must be 8 to 64 characters.')).toBeInTheDocument()
    expect(saved).toEqual([])
  })
})

describe('accessibility', () => {
  it('the lists, and the download dialog, have no violations', async () => {
    const user = setupUser()
    const { container } = openQueries()
    await ready()
    await expectNoA11yViolations(container)
    await user.click(screen.getByRole('button', { name: 'Download for the employer' }))
    const dialog = screen.getByRole('dialog', { name: 'Download the query list for the employer' })
    await expectNoA11yViolations(dialog, { rules: { region: { enabled: false } } })
  })
})
