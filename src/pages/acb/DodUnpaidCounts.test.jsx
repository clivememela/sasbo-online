// @vitest-environment jsdom -- unpaid counts captured by hand: fast entry, validation, batches, and the opening position
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import DodUnpaidCounts, { rowsFromPaste } from './DodUnpaidCounts'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TestAuthProvider } from '../../test/authTestUtils'
import { PERMISSIONS } from '../../auth/permissions'
import { server } from '../../test/msw/server'
import { OPENING_POSITION, dodHandlers, refusal } from '../../test/msw/dodApi'
import { setupUser } from '../../test/user'
import { expectNoA11yViolations } from '../../test/assertions'

/**
 * DOD-28: each member's number of unpaids, captured by hand -- at switch-over, or whenever a count must be set (it may
 * be monthly: Friday item 15), so nothing here says "switch-over only". A count is 0 to 3 (DOD-03), saved in batches of
 * at most 2,000 (dod-api §5), all or nothing per batch. Every red case has its must-pass beside it.
 */

let captured
const listener = async ({ request }) => {
  if (request.method === 'PUT') captured.push(await request.clone().json())
}
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  captured = []
  server.use(...dodHandlers())
  server.events.on('request:start', listener)
})
afterEach(() => server.events.removeListener('request:start', listener))

const renderCounts = (permissions = [PERMISSIONS.DOD_PREPARE]) =>
  renderWithProviders(<TestAuthProvider permissions={permissions}><DodUnpaidCounts /></TestAuthProvider>)

describe('who may capture counts', () => {
  it('a signed-in user without DOD_PREPARE is told whom to ask, and nothing is read', () => {
    renderCounts([PERMISSIONS.DOD_FILE])
    expect(screen.getByRole('heading', { level: 1, name: 'Unpaid counts' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('You need permission to prepare debit order runs.')
  })

  it('the administrator sees the capture, the counts on record and the opening position -- with no violations', async () => {
    const { container } = renderCounts()
    expect(screen.getByRole('heading', { name: 'Capture counts' })).toBeInTheDocument()
    const onRecord = await screen.findByRole('table', { name: 'Unpaid counts captured by hand' })
    expect(await within(onRecord).findByText('2 of 3')).toBeInTheDocument()
    expect(await screen.findByText('No opening position has been stored.')).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})

describe('capturing', () => {
  it('fast entry: Enter on a count adds the next line and puts the caret in it; the save sends every line with its source', async () => {
    const user = setupUser()
    renderCounts()
    await user.type(screen.getByLabelText('Where the counts come from'), 'The old system’s re-debit list, October 2026')
    await user.type(screen.getByLabelText('Membership no. 1'), 'SYN-0001')
    await user.type(screen.getByLabelText('Unpaids'), '2{Enter}')
    expect(screen.getByLabelText('Membership no. 2')).toHaveFocus()
    await user.keyboard('SYN-0002')
    await user.type(screen.getAllByLabelText('Unpaids')[1], '3')
    await user.click(screen.getByRole('button', { name: 'Save 2 counts' }))

    expect(await screen.findByText(/^Captured 2 counts, counted on 07 Oct 2026\. 1 member is at three/)).toBeInTheDocument()
    expect(captured).toEqual([{ source: 'The old system’s re-debit list, October 2026', entries: [
      { membershipNumber: 'SYN-0001', unpaidCount: 2 }, { membershipNumber: 'SYN-0002', unpaidCount: 3 },
    ] }])
    // The grid starts again, ready for the next list.
    expect(screen.getByLabelText('Membership no. 1')).toHaveValue('')
  })

  it('refuses a count outside 0 to 3, a number typed twice, and a missing source -- saying how many need correcting', async () => {
    const user = setupUser()
    renderCounts()
    const save = () => screen.getByRole('button', { name: /^Save/ })
    await user.type(screen.getByLabelText('Membership no. 1'), 'SYN-0001')
    await user.type(screen.getByLabelText('Unpaids'), '4{Enter}')
    await user.keyboard('syn-0001')
    await user.type(screen.getAllByLabelText('Unpaids')[1], '1')

    expect(screen.getByText('The count is a whole number from 0 to 3.')).toBeInTheDocument()
    expect(screen.getByText('syn-0001 is typed twice.')).toBeInTheDocument()
    expect(save()).toBeDisabled()
    expect(save()).toHaveAccessibleDescription('Say where the counts come from first.')
    await user.type(screen.getByLabelText('Where the counts come from'), 'Invented list')
    expect(save()).toHaveAccessibleDescription('2 lines need correcting first.')
    expect(captured).toEqual([])
  })

  it('a list pasted into a membership number fills a line for each member', async () => {
    const user = setupUser()
    renderCounts()
    await user.type(screen.getByLabelText('Where the counts come from'), 'Invented list')
    fireEvent.paste(screen.getByLabelText('Membership no. 1'), {
      clipboardData: { getData: () => 'SYN-0001\t2\nSYN-0002, 0\nSYN-0003 3\n' },
    })
    expect(screen.getByLabelText('Membership no. 3')).toHaveValue('SYN-0003')
    expect(screen.getAllByLabelText('Unpaids').map((field) => field.value)).toEqual(['2', '0', '3'])
    await user.click(screen.getByRole('button', { name: 'Save 3 counts' }))
    await vi.waitFor(() => expect(captured[0].entries).toHaveLength(3))
  })

  it('a list the server refuses saves nothing, and lists each problem by row', async () => {
    server.use(http.put('*/api/acb/unpaid-counts', () => refusal(422, 'UNPAID_COUNTS_INVALID', 'The list has problems.',
      { problems: '1', 'problem.1': 'row 1: no member has membership number SYN-9999' })))
    const user = setupUser()
    renderCounts()
    await user.type(screen.getByLabelText('Where the counts come from'), 'Invented list')
    await user.type(screen.getByLabelText('Membership no. 1'), 'SYN-9999')
    await user.type(screen.getByLabelText('Unpaids'), '1')
    await user.click(screen.getByRole('button', { name: 'Save 1 count' }))
    expect(await screen.findByText('Nothing more was saved. Correct these and save again:')).toBeInTheDocument()
    expect(screen.getByText('row 1: no member has membership number SYN-9999')).toBeInTheDocument()
    expect(screen.getByLabelText('Membership no. 1')).toHaveValue('SYN-9999')
  })

  it('an answer that never came is not called unsaved: it may have gone through', async () => {
    server.use(http.put('*/api/acb/unpaid-counts', () => HttpResponse.error()))
    const user = setupUser()
    renderCounts()
    await user.type(screen.getByLabelText('Where the counts come from'), 'Invented list')
    await user.type(screen.getByLabelText('Membership no. 1'), 'SYN-0001')
    await user.type(screen.getByLabelText('Unpaids'), '1')
    await user.click(screen.getByRole('button', { name: 'Save 1 count' }))
    expect(await screen.findByText(/^The counts could not be confirmed\. It may have gone through/)).toBeInTheDocument()
  })
})

describe('rowsFromPaste', () => {
  it('reads one member a line, split by tabs, commas or spaces, and keeps a line it cannot read as typed', () => {
    let key = 0
    const next = () => ++key
    expect(rowsFromPaste('SYN-1\t2\r\nSYN-2,1\n\nSYN-3', next)).toEqual([
      { key: 1, number: 'SYN-1', count: '2' }, { key: 2, number: 'SYN-2', count: '1' }, { key: 3, number: 'SYN-3', count: '' },
    ])
  })
})

describe('the opening arrears position (D24)', () => {
  it('refuses a file that is not an .xlsx before sending it', async () => {
    const user = setupUser()
    renderCounts()
    await screen.findByText('No opening position has been stored.')
    await user.upload(screen.getByLabelText(/^The sheet/), new File(['x'], 'position.csv', { type: 'text/csv' }), { applyAccept: false })
    expect(screen.getByText('Choose the position as an .xlsx sheet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload the position' })).toBeDisabled()
  })

  it('uploads the sheet as it is, and says how many members it holds', async () => {
    const user = setupUser()
    renderCounts()
    await screen.findByText('No opening position has been stored.')
    await user.upload(screen.getByLabelText(/^The sheet/), new File(['invented'], 'position.xlsx'))
    await user.click(screen.getByRole('button', { name: 'Upload the position' }))
    expect(await screen.findByText('The opening position is stored: 30 members.')).toBeInTheDocument()
  })

  it('a position locked since the first returns offers no upload', async () => {
    server.use(http.get('*/api/acb/opening-position', () => HttpResponse.json({ ...OPENING_POSITION, members: 30, enteredBy: 'Invented', locked: true, lockedSince: '2026-10-27T08:00:00Z' })))
    renderCounts()
    expect(await screen.findByText(/Locked since 27 Oct 2026/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /position$/ })).not.toBeInTheDocument()
  })
})
