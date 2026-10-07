// @vitest-environment jsdom -- a payroll file's own page: its summary, the payment check, its discrepancies and its lines
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'

import PayrollFile from './PayrollFile'
import { PERMISSIONS } from '../../auth/permissions'
import { formatZar } from '../../lib/format'
import { TestAuthProvider } from '../../test/authTestUtils'
import { expectErrorState, expectNoA11yViolations } from '../../test/assertions'
import { deferred } from '../../test/deferred'
import { server } from '../../test/msw/server'
import { ABSA_SEPTEMBER, DISCREPANCIES, WHAT_TO_DO, pageOf, payrollHandlers, refusal } from '../../test/msw/payrollExamples'
import { renderWithProviders } from '../../test/renderWithProviders'
import { setupUser } from '../../test/user'
import { discrepancyLabel } from './payrollRules'

/**
 * A PAYROLL FILE, BY ITS OWN ADDRESS -- read with GETs only (the deck photographs it from a seeded stack): the summary
 * first, the payment check (Absa short of the lines' total by its 3% fee alone is AS EXPECTED -- PAY-27, PAY-28), every
 * kind of discrepancy with what happened and what SASBO does about it, every line with its match; then, for an
 * administrator who processes payroll, compare again, raise the query list, and the reports.
 */

const VIEW = [PERMISSIONS.PAYROLL_VIEW]
const PROCESS = [PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_PROCESS]

const openFile = (permissions = PROCESS, address = '/admin/payroll/files/12') => renderWithProviders(
  <TestAuthProvider permissions={permissions}>
    <Routes>
      <Route path="/admin/payroll/files/:fileId" element={<PayrollFile />} />
      <Route path="/admin/payroll/files/:fileId/queries" element={<p>The queries page</p>} />
    </Routes>
  </TestAuthProvider>,
  { initialEntries: [address] },
)

/**
 * The file's page, read -- and its list's first read settled too. A read still in flight when a test ends meets a
 * server whose handlers were reset, which MSW reports as unhandled (seen 7 Oct on the strip's test, which ends at once).
 */
const ready = async () => {
  const heading = await screen.findByRole('heading', { level: 1, name: 'Absa — September 2026' })
  await waitFor(() => expect(screen.queryByText(/^Loading (discrepancies|lines)…$/)).not.toBeInTheDocument())
  return heading
}

/** Rands as the page prints them, with the no-break spaces jest-dom's text matching reads as plain ones. */
const money = (amount) => formatZar(amount).replace(/\s/g, ' ')

/** Requests to a route, by their query strings. */
const asked = (method, path, respond) => {
  const seen = []
  server.use(http[method](path, async ({ request }) => {
    const url = new URL(request.url)
    const text = method === 'get' ? '' : await request.text()
    seen.push({ query: Object.fromEntries(url.searchParams), body: text ? JSON.parse(text) : null })
    return respond(request)
  }))
  return seen
}

let stopWatching = () => {}
const watchRequests = () => {
  const seen = []
  const listener = ({ request }) => seen.push(`${request.method} ${new URL(request.url).pathname}`)
  server.events.on('request:start', listener)
  stopWatching = () => server.events.removeListener('request:start', listener)
  return seen
}

/*
 * jsdom has no object URLs. They are stood in for and NEVER put back to `undefined`: `saveFile` lets each URL go 30 s
 * after the press, and a timer finding no function would throw into whichever test is running then.
 */
const originals = { create: URL.createObjectURL ?? (() => 'blob:none'), revoke: URL.revokeObjectURL ?? (() => {}) }
let saved

beforeEach(() => {
  // Every test starts on an empty document: a tree outliving its test is named by the next one, never seen twice.
  expect(document.body.innerHTML, 'a tree from an earlier test is still mounted').toBe('')
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

describe('reading the file', () => {
  it('says it is reading until the server answers', async () => {
    const held = deferred()
    server.use(http.get('*/api/payroll/files/:id', () => held.promise))
    openFile()
    expect(await screen.findByText('Reading the file’s results…')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Payroll file' })).toBeInTheDocument()
    held.resolve(HttpResponse.json(ABSA_SEPTEMBER))
    expect(await ready()).toBeInTheDocument()
  })

  it('a file that could not be read says so, with a retry that reads it again', async () => {
    let reads = 0
    server.use(http.get('*/api/payroll/files/:id', () => {
      reads += 1
      return reads === 1 ? HttpResponse.json({ message: 'boom' }, { status: 500 }) : HttpResponse.json(ABSA_SEPTEMBER)
    }))
    openFile()
    await screen.findByText('This payroll file could not be loaded.')
    await expectErrorState({ emptyText: 'There is no payroll file at this address.' })
    await setupUser().click(screen.getByRole('button', { name: /try again/i }))
    expect(await ready()).toBeInTheDocument()
  })

  it('a file the server does not have is not found, in its own words', async () => {
    openFile(PROCESS, '/admin/payroll/files/99')
    expect(await screen.findByRole('heading', { level: 1, name: 'Payroll file not found' })).toBeInTheDocument()
    expect(screen.getByText('There is no payroll file with that number.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All files' })).toHaveAttribute('href', '/admin/payroll')
  })

  it('🔒 an address that is no file is not found -- and nothing is asked of the server', async () => {
    const seen = watchRequests()
    openFile(PROCESS, '/admin/payroll/files/not-a-number')
    expect(screen.getByRole('heading', { level: 1, name: 'Payroll file not found' })).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(seen.filter((request) => request.includes('/files/'))).toEqual([])
  })

  it('🔒 nobody signed in is asked to sign in, and nothing is read', async () => {
    const seen = watchRequests()
    openFile([])
    expect(screen.getByRole('heading', { level: 1, name: 'Payroll file' })).toBeInTheDocument()
    expect(screen.getByText(/Sign in to read payroll reconciliation\./)).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(seen).toEqual([])
  })
})

describe('the summary first', () => {
  it('the lines, the matches and the discrepancies, as a ruled strip -- with how each was matched', async () => {
    openFile()
    await ready()
    const strip = screen.getByTestId('figure-strip')
    expect(strip).toHaveAccessibleName('Summary of Absa — September 2026')
    expect(strip).toHaveTextContent('Lines on the file34')
    expect(strip).toHaveTextContent('1 could not be read')
    expect(strip).toHaveTextContent('Matched to members32')
    expect(strip).toHaveTextContent('28 by staff number · 3 by ID number · 1 by name')
    expect(strip).toHaveTextContent('Discrepancies13')
    expect(strip).toHaveTextContent('9 still to resolve')
    expect(screen.getByText(/Loaded from the employer’s file: Absa payroll September 2026\.xlsx\. Loaded on 28 September 2026 at 10:15 by system; kept until 28 September 2027\./)).toBeInTheDocument()
  })

  it('each kind found is a way into the list, filtered to it', async () => {
    const reads = asked('get', '*/api/payroll/files/:id/discrepancies', () => HttpResponse.json(pageOf(DISCREPANCIES)))
    const user = setupUser()
    openFile()
    await ready()
    const kinds = screen.getByRole('list', { name: 'Discrepancies by kind' })
    expect(within(kinds).getByText('Amount differs').closest('li')).toHaveTextContent('1 open · 0 queried · 0 resolved')
    await user.click(within(kinds).getByRole('button', { name: 'Amount differs' }))
    await waitFor(() => expect(reads.at(-1).query).toMatchObject({ type: 'AMOUNT_DIFFERS' }))
  })
})

describe('the payment check (PAY-28)', () => {
  const ledger = () => screen.getByRole('heading', { name: 'The payment check' }).closest('div').parentElement

  it('🔑 Absa short of the lines\' total by its 3% fee alone is as expected', async () => {
    openFile()
    await ready()
    const check = ledger()
    expect(within(check).getByText('As expected')).toBeInTheDocument()
    expect(within(check).getByText('Total of the lines on the file').closest('div')).toHaveTextContent(money(5916))
    expect(within(check).getByText('Absa’s admin fee, 3%').closest('div')).toHaveTextContent(`− ${money(177.48)}`)
    expect(within(check).getByText('Payment expected').closest('div')).toHaveTextContent(money(5738.52))
    expect(within(check).getByText('Received').closest('div')).toHaveTextContent(money(5738.52))
    expect(within(check).getByText(/on 29 September 2026, EFT 0923; R 174,00 on 1 October 2026, EFT 1001$/)).toBeInTheDocument()
    expect(within(check).getByText('Difference').closest('div')).toHaveTextContent('None')
    expect(within(check).getByText('Short of the file’s total by the fee alone, which is as expected.')).toBeInTheDocument()
    expect(within(check).getByText(/R 174,00 a member, from 1 January 2026\./)).toBeInTheDocument()
  })

  it('a payment that is short says by how much, and is never called as expected', async () => {
    server.use(http.get('*/api/payroll/files/:id', () => HttpResponse.json({
      ...ABSA_SEPTEMBER,
      paymentStatus: 'SHORT',
      payments: [ABSA_SEPTEMBER.payments[0]],
      totals: { ...ABSA_SEPTEMBER.totals, received: '5564.52', paymentDifference: '-174.00', paymentStatus: 'SHORT' },
    })))
    openFile()
    await ready()
    const check = ledger()
    expect(within(check).getByText('Short')).toBeInTheDocument()
    expect(within(check).getByText('Difference').closest('div')).toHaveTextContent(`${money(174)} short`)
    expect(within(check).queryByText(/which is as expected/)).not.toBeInTheDocument()
  })

  it('no payment recorded yet says so, rather than a nought', async () => {
    server.use(http.get('*/api/payroll/files/:id', () => HttpResponse.json({
      ...ABSA_SEPTEMBER, payments: [],
      totals: { ...ABSA_SEPTEMBER.totals, received: null, paymentDifference: null, paymentStatus: 'NOT_RECORDED' },
    })))
    openFile()
    await ready()
    expect(within(ledger()).getByText('No payment recorded yet')).toBeInTheDocument()
    expect(within(ledger()).getByText('Nothing recorded yet')).toBeInTheDocument()
    expect(within(ledger()).queryByText('Difference')).not.toBeInTheDocument()
  })
})

describe('the discrepancies -- what happened, and what SASBO does about it', () => {
  it('🔑 every kind is listed with its name, its reason in plain words and the action from Stephne\'s answers', async () => {
    openFile()
    await ready()
    const table = await screen.findByRole('table', { name: 'The file’s discrepancies' })
    for (const discrepancy of DISCREPANCIES) {
      const row = within(table).getByText(discrepancy.detail).closest('tr')
      expect(row, discrepancy.type).toHaveTextContent(discrepancyLabel(discrepancy.type))
      expect(row, discrepancy.type).toHaveTextContent(WHAT_TO_DO[discrepancy.type])
    }
    // A resigned member still deducted carries the member's own status (PAY-13).
    const ended = within(table).getByText(DISCREPANCIES.find((d) => d.type === 'MEMBERSHIP_ENDED').detail).closest('tr')
    expect(within(ended).getByText('Resigned')).toBeInTheDocument()
    // Resolved ones say how.
    const updated = within(table).getByText(DISCREPANCIES.find((d) => d.type === 'EMPLOYEE_NUMBER_DIFFERS').detail).closest('tr')
    expect(updated).toHaveTextContent('Resolved')
    expect(updated).toHaveTextContent('SASBO’s record was updated')
  })

  it('the kind and the status filters are each sent, from the first page', async () => {
    const reads = asked('get', '*/api/payroll/files/:id/discrepancies', () => HttpResponse.json(pageOf(DISCREPANCIES)))
    const user = setupUser()
    openFile()
    await screen.findByRole('table', { name: 'The file’s discrepancies' })
    await user.selectOptions(screen.getByLabelText('Kind'), 'Amount differs (1)')
    await waitFor(() => expect(reads.at(-1).query).toEqual({ type: 'AMOUNT_DIFFERS', page: '0', size: '20' }))
    await user.selectOptions(screen.getByLabelText('Status'), 'Resolved')
    await waitFor(() => expect(reads.at(-1).query).toEqual({ type: 'AMOUNT_DIFFERS', status: 'RESOLVED', page: '0', size: '20' }))
    await user.selectOptions(screen.getByLabelText('Status'), 'All, resolved too')
    await waitFor(() => expect(reads.at(-1).query).toEqual({ type: 'AMOUNT_DIFFERS', status: 'ALL', page: '0', size: '20' }))
    expect(reads[0].query).toEqual({ page: '0', size: '20' })
  })

  it('🔒 filters typed into the address that the list does not offer are never sent', async () => {
    const reads = asked('get', '*/api/payroll/files/:id/discrepancies', () => HttpResponse.json(pageOf([])))
    openFile(PROCESS, '/admin/payroll/files/12?type=DROP_TABLE&status=EVERYTHING')
    expect(await screen.findByText('Nothing to follow up')).toBeInTheDocument()
    expect(reads.map((read) => read.query)).toEqual([{ page: '0', size: '20' }])
  })

  it('a list that could not be read says so -- never "nothing to follow up"', async () => {
    server.use(http.get('*/api/payroll/files/:id/discrepancies', () => HttpResponse.error()))
    openFile()
    await screen.findByText('The discrepancies could not be loaded.')
    await expectErrorState({ emptyText: 'Nothing to follow up' })
  })
})

describe('every line, with its match (PAY-10)', () => {
  it('🔑 a match by each rule, a catch-up, a month with no rate, no match, a blank ID and a line that could not be read', async () => {
    const user = setupUser()
    openFile()
    await ready()
    await user.click(screen.getByRole('link', { name: 'Every line (34)' }))
    const table = await screen.findByRole('table', { name: 'The file’s lines and what each matched' })
    const rowOf = (staffNumber) => within(table).getByText(staffNumber).closest('tr')

    expect(rowOf('EMP-40001')).toHaveTextContent('By staff number: Staff number and ID number agree')
    expect(rowOf('EMP-40002')).toHaveTextContent('By ID number: ID number agrees; no staff number on record')
    expect(rowOf('EMP-40003')).toHaveTextContent('By initials and surname')
    expect(rowOf('EMP-40003')).toHaveTextContent('Catch-up of 2 months')
    // A blank ID number is the one absence mark, never an empty cell.
    expect(within(rowOf('EMP-40003')).getAllByText('—').length).toBeGreaterThan(0)
    expect(rowOf('EMP-40004')).toHaveTextContent('No subscription on record for December 2025')
    expect(rowOf('EMP-40231')).toHaveTextContent(money(150))
    expect(rowOf('EMP-40231')).toHaveTextContent('Differs')
    expect(rowOf('EMP-77001')).toHaveTextContent('No member fits')
    expect(rowOf('EMP-40999')).toHaveTextContent('The amount is not a number.')
  })

  it('the lines filter is sent as chosen', async () => {
    const reads = asked('get', '*/api/payroll/files/:id/rows', () => HttpResponse.json(pageOf([])))
    const user = setupUser()
    openFile(PROCESS, '/admin/payroll/files/12?view=lines')
    await screen.findByText('No lines to show')
    await user.selectOptions(screen.getByLabelText('Show'), 'Not matched')
    await waitFor(() => expect(reads.at(-1).query).toEqual({ show: 'NOT_MATCHED', page: '0', size: '20' }))
    expect(reads[0].query).toEqual({ page: '0', size: '20' })
  })

  it('a file whose contents were deleted after a year offers no lines, and keeps its discrepancies', async () => {
    server.use(http.get('*/api/payroll/files/:id', () => HttpResponse.json({ ...ABSA_SEPTEMBER, status: 'PURGED' })))
    openFile(PROCESS, '/admin/payroll/files/12?view=lines')
    await ready()
    expect(screen.getByText(/Its lines were deleted a year after it was loaded/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Every line/ })).not.toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'The file’s discrepancies' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compare again' })).not.toBeInTheDocument()
  })
})

describe('the reports -- the discrepancies list and the full report, Excel and PDF (PAY-35, PAY-37)', () => {
  it('each is fetched and saved under the name the server gave it', async () => {
    const attachment = (name) => () => new HttpResponse('synthetic bytes', {
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${name}"` },
    })
    const list = asked('get', '*/api/payroll/files/:id/reports/discrepancies', attachment('Payroll discrepancies - Absa - September 2026.xlsx'))
    const full = asked('get', '*/api/payroll/files/:id/reports/full', attachment('Payroll reconciliation - Absa - September 2026.pdf'))
    const user = setupUser()
    openFile(VIEW)
    await ready()
    const reports = screen.getByRole('heading', { name: 'Reports' }).parentElement

    await user.click(within(reports).getByRole('button', { name: 'Discrepancies (Excel)' }))
    await waitFor(() => expect(saved).toEqual(['Payroll discrepancies - Absa - September 2026.xlsx']))
    await user.click(within(reports).getByRole('button', { name: 'Full report (PDF)' }))
    await waitFor(() => expect(saved).toHaveLength(2))

    expect(list[0].query).toEqual({ format: 'xlsx' })
    expect(full[0].query).toEqual({ format: 'pdf' })
    expect(saved[1]).toBe('Payroll reconciliation - Absa - September 2026.pdf')
    expect(within(reports).getByRole('button', { name: 'Discrepancies (PDF)' })).toBeEnabled()
    expect(within(reports).getByRole('button', { name: 'Full report (Excel)' })).toBeEnabled()
  })

  it('🔑 the employer\'s file, as it arrived, is saved under its own name (PAY-32) -- and a typed or year-old file offers none', async () => {
    const reads = asked('get', '*/api/payroll/files/:id/content', () => new HttpResponse('synthetic workbook', {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="Absa payroll September 2026.xlsx"' },
    }))
    const user = setupUser()
    const view = openFile(VIEW)
    await ready()
    await user.click(screen.getByRole('button', { name: 'The employer’s file, as it arrived' }))
    await waitFor(() => expect(saved).toEqual(['Absa payroll September 2026.xlsx']))
    expect(reads).toHaveLength(1)
    view.unmount()

    for (const changed of [{ entry: 'TYPED' }, { status: 'PURGED' }]) {
      server.use(http.get('*/api/payroll/files/:id', () => HttpResponse.json({ ...ABSA_SEPTEMBER, ...changed })))
      const again = openFile(VIEW)
      await ready()
      expect(screen.queryByRole('button', { name: 'The employer’s file, as it arrived' }), JSON.stringify(changed)).not.toBeInTheDocument()
      again.unmount()
    }
  })

  it('a report that did not arrive says so, and nothing is saved', async () => {
    server.use(http.get('*/api/payroll/files/:id/reports/discrepancies', () => HttpResponse.json({ message: 'The report could not be made.' }, { status: 500 })))
    const user = setupUser()
    openFile(VIEW)
    await ready()
    await user.click(screen.getByRole('button', { name: 'Discrepancies (PDF)' }))
    expect(await screen.findByText('Payroll discrepancies - Absa - September 2026.pdf could not be downloaded. The report could not be made.')).toBeInTheDocument()
    expect(saved).toEqual([])
  })
})

describe('for an administrator who processes payroll', () => {
  it('reading alone offers no write: no compare, no columns, no query list, no payment', async () => {
    openFile(VIEW)
    await ready()
    for (const name of ['Compare again', 'Change the columns', 'Raise a query list', 'Record a payment received']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Open the queries' })).toHaveAttribute('href', '/admin/payroll/files/12/queries')
  })

  it('compare again sends the version read, and says what is still open', async () => {
    const posts = asked('post', '*/api/payroll/files/:id/reconcile', () => HttpResponse.json({ ...ABSA_SEPTEMBER, openDiscrepancies: 8, version: 2 }))
    const user = setupUser()
    openFile()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Compare again' }))
    expect(await screen.findByText(/Compared again: 8 discrepancies still open\./)).toBeInTheDocument()
    expect(posts[0].body).toEqual({ version: 1, columnMapping: null })
  })

  it('a file changed since it was read is read again, and said so', async () => {
    asked('post', '*/api/payroll/files/:id/reconcile', () => refusal(409, 'FILE_CHANGED_SINCE', 'Someone compared this file again since you opened it.'))
    const user = setupUser()
    openFile()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Compare again' }))
    expect(await screen.findByText('Someone compared this file again since you opened it. The file has been read again.')).toBeInTheDocument()
  })

  it('raising the query list opens the queries; nothing to query is said in the server\'s words', async () => {
    let n = 0
    asked('post', '*/api/payroll/files/:id/queries', () => {
      n += 1
      return n === 1
        ? refusal(409, 'NOTHING_TO_QUERY', 'Every discrepancy that needs the employer is already on a query list.')
        : HttpResponse.json({ id: 3 }, { status: 201 })
    })
    const user = setupUser()
    openFile()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Raise a query list' }))
    expect(await screen.findByText('Every discrepancy that needs the employer is already on a query list.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Raise a query list' }))
    expect(await screen.findByText('The queries page')).toBeInTheDocument()
  })

  it('a replaced file offers no write -- its discrepancies were closed as replaced', async () => {
    server.use(http.get('*/api/payroll/files/:id', () => HttpResponse.json({ ...ABSA_SEPTEMBER, status: 'SUPERSEDED' })))
    openFile()
    await ready()
    expect(screen.getByText(/A later file for Absa, September 2026 replaced this one/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compare again' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record a payment received' })).not.toBeInTheDocument()
  })
})

// One scan a test: axe over a whole page is the slowest thing here, and two in one test outran the 20 s ceiling on a
// contended box (7 Oct). The work is split, never the ceiling raised.
describe('accessibility', () => {
  it('the summary, the payment check and the discrepancies have no violations', async () => {
    const { container } = openFile()
    await screen.findByRole('table', { name: 'The file’s discrepancies' })
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(5))
    await expectNoA11yViolations(container)
  })

  it('every line, with its matches, has no violations', async () => {
    const { container } = openFile(PROCESS, '/admin/payroll/files/12?view=lines')
    await screen.findByRole('table', { name: 'The file’s lines and what each matched' })
    await waitFor(() => expect(screen.getByText('EMP-40999')).toBeInTheDocument())
    await expectNoA11yViolations(container)
  })
})
