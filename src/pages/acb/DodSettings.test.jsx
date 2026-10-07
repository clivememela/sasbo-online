// @vitest-environment jsdom -- Debit order Settings: the codes, the non-working days, the rates and a bank's debit day
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import DodSettings from './DodSettings'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TestAuthProvider } from '../../test/authTestUtils'
import { PERMISSIONS } from '../../auth/permissions'
import { server } from '../../test/msw/server'
import { calendarOf, dodHandlers, moveOf, refusal } from '../../test/msw/dodApi'
import { setupUser } from '../../test/user'
import { expectNoA11yViolations } from '../../test/assertions'
import { MONTHS } from '../../lib/format'

/**
 * DOD_SETTINGS (dod-api §7): the bank's return codes, changed with a reason (the four SASBO has not ruled on stay
 * "not yet confirmed", Friday item 9); the non-working days, a list WE keep (DOD-17, DOD-18) with the open choice
 * whether bank closures count; the dated rates; and moving a bank's members to a new debit day in one step (DOD-19),
 * previewed first and refused if the bank's members changed since. Every red case has its must-pass beside it.
 */

const CFO = [PERMISSIONS.DOD_FILE, PERMISSIONS.DOD_SETTINGS]

let writes
const listener = async ({ request }) => {
  if (request.method !== 'GET') {
    const body = await request.clone().text()
    writes.push({ method: request.method, path: new URL(request.url).pathname, body: body ? JSON.parse(body) : null })
  }
}
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  writes = []
  server.use(...dodHandlers())
  server.events.on('request:start', listener)
})
afterEach(() => server.events.removeListener('request:start', listener))

const renderSettings = (permissions = CFO) =>
  renderWithProviders(<TestAuthProvider permissions={permissions}><DodSettings /></TestAuthProvider>)

/**
 * The 28th of the month the calendar opens on -- this month, whenever the suite runs -- chosen from the calendar, since
 * the field is choose-only (the owner, 2026-09-10). Returns the day as the screen says it and as the wire sends it.
 */
const pickThe28th = async (user, dialog) => {
  const now = new Date()
  const said = `28 ${MONTHS[now.getMonth()]} ${now.getFullYear()}`
  await user.click(within(dialog).getByRole('combobox', { name: 'Date' }))
  await user.click(screen.getByRole('gridcell', { name: said }))
  return { said, wire: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-28` }
}

describe('who may change debit order settings', () => {
  it('nobody signed in is asked to sign in; the page head stays', () => {
    renderWithProviders(<DodSettings />, { initialEntries: ['/admin/acb/settings'] })
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Sign in to change debit order settings.')
  })

  it('an administrator who prepares runs is told whom to ask -- settings are the CFO\'s', () => {
    renderSettings([PERMISSIONS.DOD_PREPARE])
    expect(screen.getByRole('status')).toHaveTextContent('You need permission to change debit order settings.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('the CFO sees every section, and the page has no accessibility violations', async () => {
    const { container } = renderSettings()
    expect(await screen.findByRole('table', { name: 'The bank\'s return codes' })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: /^Non-working days in \d{4}$/ })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Subscription rates' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Move a bank’s members to a new debit day' })).toBeInTheDocument()
    await screen.findByText('Christmas Day')
    await expectNoA11yViolations(container)
  })
})

describe('the bank\'s return codes (dod-api §7.1)', () => {
  it('lists each code with SASBO\'s code and its re-debit rule -- "not yet confirmed by SASBO" where she has not said', async () => {
    renderSettings()
    const table = await screen.findByRole('table', { name: 'The bank\'s return codes' })
    const closed = (await within(table).findByText('Account Closed')).closest('tr')
    expect(within(closed).getByText('Re-debit not yet confirmed by SASBO')).toBeInTheDocument()
    expect(within(closed).getByText('provisional')).toBeInTheDocument()
    const funds = within(table).getByText('Not Provided For').closest('tr')
    expect(within(funds).getByText('May be re-debited')).toBeInTheDocument()
    expect(within(funds).getByText('18 Insufficient funds')).toBeInTheDocument()
    expect(within(within(table).getByText('Deceased').closest('tr')).getByText('None on record')).toBeInTheDocument()
  })

  it('a change needs the reason, and carries the version shown', async () => {
    const user = setupUser()
    renderSettings()
    await user.click(await screen.findByRole('button', { name: 'Change bank code 15' }))
    const dialog = await screen.findByRole('dialog', { name: 'Change bank code 15' })
    const save = within(dialog).getByRole('button', { name: 'Save the change' })
    expect(save).toBeDisabled()
    expect(save).toHaveAccessibleDescription('Say why it is set this way, and on whose word.')

    await user.selectOptions(within(dialog).getByLabelText('May it be re-debited?'), 'YES')
    await user.click(within(dialog).getByLabelText(/^Provisional/))
    await user.type(within(dialog).getByLabelText('Why, and on whose word'), 'Stephne, by e-mail, 9 October')
    await user.click(save)

    expect(await screen.findByText('Bank code 15 is saved: May be re-debited.')).toBeInTheDocument()
    expect(writes).toEqual([{ method: 'PUT', path: '/api/acb/codes/15', body: {
      version: 1, reDebit: 'YES', suspensionCode: 15, wording: 'Account Closed', provisional: false, note: 'Stephne, by e-mail, 9 October',
    } }])
  })

  it('someone else changed the code first: it says so, offers only Close, and closing reads the codes again', async () => {
    server.use(http.put('*/api/acb/codes/:bankCode', () => refusal(409, 'CODE_VERSION_CONFLICT', 'Changed first.', { version: '2' })))
    const user = setupUser()
    renderSettings()
    await user.click(await screen.findByRole('button', { name: 'Change bank code 26' }))
    const dialog = await screen.findByRole('dialog', { name: 'Change bank code 26' })
    await user.type(within(dialog).getByLabelText('Why, and on whose word'), 'Stephne, 9 October')
    await user.click(within(dialog).getByRole('button', { name: 'Save the change' }))
    expect(await within(dialog).findByText('Someone else changed bank code 26 first. Nothing was changed. Close this and it shows as it stands.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Save the change' })).not.toBeInTheDocument()
  })

  it('adds a code the bank has started to return, with its reason', async () => {
    const user = setupUser()
    renderSettings()
    await user.click(await screen.findByRole('button', { name: 'Add a bank code' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a bank code' })
    await user.type(within(dialog).getByLabelText('Bank code'), '1000')
    expect(within(dialog).getByRole('button', { name: 'Add the code' })).toHaveAccessibleDescription('The bank code is a number from 1 to 999.')
    await user.clear(within(dialog).getByLabelText('Bank code'))
    await user.type(within(dialog).getByLabelText('Bank code'), '22')
    await user.type(within(dialog).getByLabelText('Meaning'), 'Invented new code')
    await user.type(within(dialog).getByLabelText('Why, and on whose word'), 'The CFO, from the 22 Oct report')
    await user.click(within(dialog).getByRole('button', { name: 'Add the code' }))
    await vi.waitFor(() => expect(writes).toEqual([{ method: 'POST', path: '/api/acb/codes', body: {
      bankCode: '22', reason: 'OTHER', wording: 'Invented new code', reDebit: 'UNKNOWN', suspensionCode: null, note: 'The CFO, from the 22 Oct report',
    } }]))
  })
})

describe('the non-working days (DOD-15, DOD-17, DOD-18)', () => {
  it('a year at a time, each day with its weekday, kind and where it comes from; only a day we added can be removed', async () => {
    renderSettings()
    const table = await screen.findByRole('table', { name: /^Non-working days in/ })
    const closure = (await within(table).findByText('Invented bank closure')).closest('tr')
    expect(within(closure).getByText('Fri 23 Oct 2026')).toBeInTheDocument()
    expect(within(closure).getByText('Bank closed')).toBeInTheDocument()
    expect(within(closure).getByRole('button', { name: /^Remove/ })).toBeInTheDocument()
    expect(within(within(table).getByText('Christmas Day').closest('tr')).queryByRole('button', { name: /^Remove/ })).toBeNull()
    expect(screen.getByText(/The list is complete to 31 Dec 2028/)).toBeInTheDocument()
  })

  it('asks another year from the server when one is chosen', async () => {
    const asked = []
    server.use(http.get('*/api/acb/holidays', ({ request }) => {
      asked.push(new URL(request.url).searchParams.get('year'))
      return HttpResponse.json(calendarOf())
    }))
    const user = setupUser()
    renderSettings()
    await screen.findByRole('table', { name: /^Non-working days in/ })
    const next = String(new Date().getFullYear() + 1)
    await user.selectOptions(screen.getByLabelText('Year'), next)
    await vi.waitFor(() => expect(asked).toContain(next))
    expect(await screen.findByRole('table', { name: `Non-working days in ${next}` })).toBeInTheDocument()
  })

  it('adds a bank closure: the date, its name and its kind', async () => {
    const user = setupUser()
    renderSettings()
    await screen.findByText('Christmas Day')
    await user.click(screen.getByRole('button', { name: 'Add a day' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a non-working day' })
    expect(within(dialog).getByRole('button', { name: 'Add the day' })).toHaveAccessibleDescription('Choose the date first.')
    const day = await pickThe28th(user, dialog)
    await user.type(within(dialog).getByLabelText('Name'), 'Invented systems upgrade')
    await user.click(within(dialog).getByRole('button', { name: 'Add the day' }))
    expect(await screen.findByText(`${day.said} is a non-working day: Invented systems upgrade.`)).toBeInTheDocument()
    expect(writes).toEqual([{ method: 'POST', path: '/api/acb/holidays', body: { date: day.wire, name: 'Invented systems upgrade', kind: 'BANK_CLOSED' } }])
  })

  it('removes a day we added, after asking', async () => {
    const user = setupUser()
    renderSettings()
    await user.click(await screen.findByRole('button', { name: 'Remove 23 Oct 2026, Invented bank closure' }))
    const dialog = await screen.findByRole('dialog', { name: 'Remove 23 Oct 2026?' })
    await user.click(within(dialog).getByRole('button', { name: 'Remove the day' }))
    expect(await screen.findByText('23 Oct 2026 is no longer a non-working day.')).toBeInTheDocument()
    expect(writes).toEqual([{ method: 'DELETE', path: '/api/acb/holidays/2026-10-23', body: null }])
  })

  it('the open choice: bank closures count by default, and the switch turns it off after asking', async () => {
    const user = setupUser()
    renderSettings()
    expect(await screen.findByText(/^Bank closures move the debits on them\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Stop counting bank closures' }))
    const dialog = await screen.findByRole('dialog', { name: 'Stop counting bank closures?' })
    await user.click(within(dialog).getByRole('button', { name: 'Stop counting them' }))
    expect(await screen.findByText('Bank closures no longer move the debits on them.')).toBeInTheDocument()
    expect(writes).toEqual([{ method: 'PUT', path: '/api/acb/calendar/settings', body: { bankClosuresCount: false } }])
  })

  it('a day the server refuses is said inside the dialog, and nothing is added', async () => {
    server.use(http.post('*/api/acb/holidays', () => refusal(409, 'HOLIDAY_ALREADY_LISTED', '28 Dec 2026 is already on the list.')))
    const user = setupUser()
    renderSettings()
    await screen.findByText('Christmas Day')
    await user.click(screen.getByRole('button', { name: 'Add a day' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a non-working day' })
    await pickThe28th(user, dialog)
    await user.type(within(dialog).getByLabelText('Name'), 'Invented')
    await user.click(within(dialog).getByRole('button', { name: 'Add the day' }))
    expect(await within(dialog).findByText('The day was not recorded. Nothing was written: 28 Dec 2026 is already on the list.')).toBeInTheDocument()
  })
})

describe('the subscription rates (Q43, D25)', () => {
  it('lists every rate, the provisional one marked, and adds a future one after asking', async () => {
    const user = setupUser()
    renderSettings()
    const table = await screen.findByRole('table', { name: 'Subscription rates' })
    expect(await within(table).findByText(/166,65/)).toBeInTheDocument()
    expect(within(table).getByText(/· provisional$/)).toBeInTheDocument()

    const add = screen.getByRole('button', { name: 'Add the rate' })
    expect(add).toBeDisabled()
    await user.type(screen.getByLabelText('Amount (R)'), '185.00')
    await user.type(screen.getByLabelText('Source'), 'Invented letter to the banks')
    expect(add).toBeEnabled()
    await user.click(add)
    const dialog = await screen.findByRole('dialog', { name: /^Charge R\s?185,00 from / })
    await user.click(within(dialog).getByRole('button', { name: 'Add the rate' }))
    expect(await screen.findByText(/^R\s?185,00 a member is charged from /)).toBeInTheDocument()
    expect(writes).toEqual([{ method: 'POST', path: '/api/acb/rates', body: {
      effectiveFrom: expect.stringMatching(/^\d{4}-\d{2}-01$/), amount: 185, source: 'Invented letter to the banks',
    } }])
  })

  it('a month already charged is refused in the server\'s words', async () => {
    server.use(http.post('*/api/acb/rates', () => refusal(409, 'RATE_MONTH_CHARGED', 'A live run has already charged that month.')))
    const user = setupUser()
    renderSettings()
    await screen.findByRole('table', { name: 'Subscription rates' })
    await user.type(screen.getByLabelText('Amount (R)'), '185')
    await user.type(screen.getByLabelText('Source'), 'Invented')
    await user.click(screen.getByRole('button', { name: 'Add the rate' }))
    const dialog = await screen.findByRole('dialog', { name: /^Charge / })
    await user.click(within(dialog).getByRole('button', { name: 'Add the rate' }))
    expect(await within(dialog).findByText('The rate was not recorded. Nothing was written: A live run has already charged that month.')).toBeInTheDocument()
  })
})

describe('moving a bank\'s members to a new debit day (DOD-19)', () => {
  const choose = async (user) => {
    await vi.waitFor(() => expect(screen.getByRole('option', { name: 'Synthetic Bank (45 debit-order members)' })).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Bank'), '3')
    await user.selectOptions(screen.getByLabelText('New debit day'), '27')
    await user.click(screen.getByRole('button', { name: 'See what would move' }))
  }

  it('previews -- nothing changes -- then moves every member of the bank in one step, with the count it showed', async () => {
    const user = setupUser()
    renderSettings()
    await choose(user)
    const preview = await screen.findByTestId('dod-move-preview')
    expect(preview).toHaveTextContent('45 members of Synthetic Bank would move to the 27th: 12 on the 20th and 33 on the 25th.')
    expect(preview).toHaveTextContent('The October 2026 run is prepared and keeps the days it was prepared with')
    expect(writes).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Move 45 members' }))
    const dialog = await screen.findByRole('dialog', { name: 'Move 45 members of Synthetic Bank to the 27th?' })
    await user.click(within(dialog).getByRole('button', { name: 'Move them' }))
    expect(await screen.findByText('45 members of Synthetic Bank now have the 27th as their debit day.')).toBeInTheDocument()
    expect(writes).toEqual([{ method: 'POST', path: '/api/acb/banks/3/debit-day-move', body: { newDay: 27, expectedCount: 45 } }])
  })

  it('the members changed since the preview: nothing moved, and it says how and to look again', async () => {
    server.use(http.post('*/api/acb/banks/:bankId/debit-day-move', () =>
      refusal(409, 'MOVE_COUNT_CHANGED', 'Changed.', { expected: '45', actual: '46' })))
    const user = setupUser()
    renderSettings()
    await choose(user)
    await user.click(await screen.findByRole('button', { name: 'Move 45 members' }))
    const dialog = await screen.findByRole('dialog', { name: /^Move 45 members/ })
    await user.click(within(dialog).getByRole('button', { name: 'Move them' }))
    expect(await within(dialog).findByText(/the bank’s members changed since the preview: 45 were to move, 46 would now\. Close this and look again\./)).toBeInTheDocument()
  })

  it('a bank already on the day has nobody to move, and offers no move', async () => {
    server.use(http.get('*/api/acb/banks/:bankId/debit-day-move', () => HttpResponse.json(moveOf({ newDay: 27, toMove: 0, alreadyOnDay: 45, liveRuns: [] }))))
    const user = setupUser()
    renderSettings()
    await choose(user)
    expect(await screen.findByText('Every debit-order member of Synthetic Bank is on the 27th already: nobody would move.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Move \d/ })).not.toBeInTheDocument()
  })
})

describe('one section failing leaves the others', () => {
  it('codes that cannot be read say so with a retry, and the rates still show', async () => {
    server.use(http.get('*/api/acb/codes', () => HttpResponse.json({ message: 'boom' }, { status: 500 })))
    renderSettings()
    expect(await screen.findByText('We could not load the bank codes.')).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Subscription rates' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
