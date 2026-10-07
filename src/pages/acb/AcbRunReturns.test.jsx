// @vitest-environment jsdom -- the bank's returns by debit day, and one day's report typed in as a batch
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import AcbRunReturns from './AcbRunReturns'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TestAuthProvider } from '../../test/authTestUtils'
import { PERMISSIONS } from '../../auth/permissions'
import { server } from '../../test/msw/server'
import { dodHandlers, refusal, runOf } from '../../test/msw/dodApi'
import { setupUser } from '../../test/user'
import { expectNoA11yViolations } from '../../test/assertions'

/**
 * One returns report per debit day (Stephne, DOD-05, DOD-06), recorded by an administrator (DOD-12) as one batch, all
 * or nothing (dod-api §3). The code's meaning and whether it may be re-debited show beside the line as it is typed,
 * and Present again is offered only for a code that may be (DOD-03, DOD-04).
 */

const SENT_RUN = runOf({ id: 40, actionMonth: '2026-09', status: 'SUBMITTED' })

let posted
const listener = async ({ request }) => {
  if (request.method === 'POST') posted.push(await request.clone().json())
}
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  posted = []
  server.use(...dodHandlers({ run: SENT_RUN }))
  server.events.on('request:start', listener)
})
afterEach(() => server.events.removeListener('request:start', listener))

const renderReturns = (permissions = [PERMISSIONS.DOD_PREPARE]) => {
  const onChanged = vi.fn()
  renderWithProviders(
    <TestAuthProvider permissions={permissions}><AcbRunReturns run={SENT_RUN} onChanged={onChanged} /></TestAuthProvider>,
  )
  return onChanged
}

const openDay = async (user, day = '26 Oct 2026') => {
  await user.click(await screen.findByRole('button', { name: `Record the returns for ${day}` }))
  return screen.findByRole('dialog', { name: `Returns for ${day}` })
}

describe('the debit days', () => {
  it('lists each day with its debits, its unpaids and its reports, and offers the administrator a day\'s report', async () => {
    const { container } = renderWithProviders(
      <TestAuthProvider permissions={[PERMISSIONS.DOD_PREPARE]}><AcbRunReturns run={SENT_RUN} onChanged={() => {}} /></TestAuthProvider>,
    )
    const table = await screen.findByRole('table', { name: 'Debit days and their returns' })
    expect(await within(table).findByText('20 Oct 2026')).toBeInTheDocument()
    expect(within(table).getByText('None yet')).toBeInTheDocument()
    expect(within(table).getAllByRole('button', { name: /^Record the returns for/ })).toHaveLength(2)
    await expectNoA11yViolations(container)
  })

  it('the CFO reads them, and records nothing (DOD-12: an administrator records the returns)', async () => {
    renderReturns([PERMISSIONS.DOD_FILE])
    expect(await screen.findByText('20 Oct 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Record the returns/ })).not.toBeInTheDocument()
  })

  it('days that cannot be read say so, with a retry', async () => {
    server.use(http.get('*/api/acb/runs/:id/debit-days', () => HttpResponse.json({ message: 'boom' }, { status: 500 })))
    renderReturns()
    expect(await screen.findByText('We could not load the debit days.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})

describe('recording a day\'s report', () => {
  it('shows each code\'s meaning and re-debit rule as it is typed, keeps Present again to a code that allows it, and records the batch', async () => {
    const user = setupUser()
    const onChanged = renderReturns()
    const dialog = await openDay(user)

    await user.type(within(dialog).getByLabelText('Trace no. 1'), '4')
    await user.type(within(dialog).getByLabelText('Unpaid code'), '2')
    expect(await within(dialog).findByText('Code 2: Not Provided For · May be re-debited (Stephne, DOD-03)')).toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText('Decision'), 'RE_PRESENT')
    // Enter on the last line's decision adds the next line, and the caret goes to it.
    await user.keyboard('{Enter}')
    const second = within(dialog).getByLabelText('Trace no. 2')
    expect(second).toHaveFocus()
    await user.type(second, '5')
    await user.type(within(dialog).getAllByLabelText('Unpaid code')[1], '4')
    expect(within(dialog).getByText('Code 4: Payment Stopped · Never re-debited (Stephne, DOD-03)')).toBeInTheDocument()
    const choices = within(within(dialog).getAllByLabelText('Decision')[1]).getAllByRole('option')
    expect(choices.find((o) => o.textContent === 'Present again')).toBeDisabled()
    await expectNoA11yViolations(dialog, { rules: { region: { enabled: false } } })

    await user.click(within(dialog).getByRole('button', { name: 'Record 2 unpaids' }))
    expect(await within(dialog).findByText(/^Recorded 2 unpaids for 26 Oct 2026\./)).toBeInTheDocument()
    expect(within(dialog).getByRole('list', { name: 'Members recorded' })).toHaveTextContent('SYN-0007 · S Testperson · code 2')
    expect(posted).toEqual([{ actionDate: '2026-10-26', entries: [
      { fileSequence: 4, code: '2', decision: 'RE_PRESENT' },
      { fileSequence: 5, code: '4' },
    ] }])

    await user.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1))
    expect(onChanged).toHaveBeenCalled()
  })

  it('a code nobody has listed is said to be recorded as unrecognised, and never re-debited', async () => {
    const user = setupUser()
    renderReturns()
    const dialog = await openDay(user)
    await user.type(within(dialog).getByLabelText('Trace no. 1'), '4')
    await user.type(within(dialog).getByLabelText('Unpaid code'), '9')
    expect(await within(dialog).findByText(/^Code 9 is not on the bank codes list/)).toBeInTheDocument()
  })

  it('refuses to send a line typed twice or a code that is not a number, and says how many need correcting', async () => {
    const user = setupUser()
    renderReturns()
    const dialog = await openDay(user)
    await user.type(within(dialog).getByLabelText('Trace no. 1'), '4')
    await user.type(within(dialog).getByLabelText('Unpaid code'), '2')
    await user.click(within(dialog).getByRole('button', { name: 'Add a line' }))
    await user.type(within(dialog).getByLabelText('Trace no. 2'), '4')
    await user.type(within(dialog).getAllByLabelText('Unpaid code')[1], 'x')

    expect(within(dialog).getByText('Trace number 4 is typed twice.')).toBeInTheDocument()
    expect(within(dialog).getByText('The unpaid code is the bank’s number, up to three digits.')).toBeInTheDocument()
    const recordIt = within(dialog).getByRole('button', { name: /^Record/ })
    expect(recordIt).toBeDisabled()
    expect(recordIt).toHaveAccessibleDescription('2 lines need correcting first.')
    expect(posted).toEqual([])
  })

  it('a batch the server refuses records nothing, and lists every problem it names', async () => {
    server.use(http.post('*/api/acb/runs/:id/returns', () => refusal(422, 'RETURNS_BATCH_INVALID', 'The report has problems.',
      { problems: '2', 'problem.1': 'entry 1: line 4 is not on 26 Oct 2026', 'problem.2': 'entry 2: line 991 is not in this run' })))
    const user = setupUser()
    renderReturns()
    const dialog = await openDay(user)
    await user.type(within(dialog).getByLabelText('Trace no. 1'), '4')
    await user.type(within(dialog).getByLabelText('Unpaid code'), '2')
    await user.click(within(dialog).getByRole('button', { name: 'Record 1 unpaid' }))

    expect(await within(dialog).findByText('Nothing was recorded. Correct these lines and record the report again:')).toBeInTheDocument()
    expect(within(dialog).getByText('entry 1: line 4 is not on 26 Oct 2026')).toBeInTheDocument()
    expect(within(dialog).getByText('entry 2: line 991 is not in this run')).toBeInTheDocument()
    // The lines stay as typed, to be corrected.
    expect(within(dialog).getByLabelText('Trace no. 1')).toHaveValue('4')
  })
})
