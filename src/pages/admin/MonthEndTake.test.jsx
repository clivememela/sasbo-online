// @vitest-environment jsdom -- taking the month, and taking it again with a reason, on the Month end page
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import MonthlyMenu from './MonthlyMenu'
import { TAKE_NEEDS_PERMISSION, TAKE_WAITS } from './monthEndRules'
import { PERMISSIONS } from '../../auth/permissions'
import { TestAuthProvider } from '../../test/authTestUtils'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { monthEndBody, monthEndExamples, monthEndRefusal } from '../../test/msw/monthEndExamples'
import { setupUser } from '../../test/user'

/**
 * TAKING THE MONTH -- `contracts/monthend-api.md` R4; Stephne, MEN-09 to MEN-11, MEN-14.
 *
 * Held by `MONTH_END_TAKE`. The open month is taken in one POST, the dialog saying first what follows; a taken month is
 * taken again only with a reason, naming the take it replaces -- refused at the field before anything is asked, and in
 * the server's words where it refuses. Afterwards the months are read again, so the page says who took it, when, why
 * and what it counts. Answered as the server answers (MD48): the golden months, and the golden refusals.
 */

const MONTHS = monthEndBody('GET /api/month-end/months')

let takes
let monthReads

/** The months, answered as `months` (the golden answer unless a test says otherwise), counting each read. */
const monthsAnswer = (months = MONTHS) => http.get('*/api/month-end/months', () => {
  monthReads += 1
  return HttpResponse.json(typeof months === 'function' ? months(monthReads) : months)
})

/** The take, answered by `answer`, recording each body it was sent. */
const takeAnswer = (answer) => http.post('*/api/month-end/:month/take', async ({ params, request }) => {
  takes.push({ month: params.month, body: await request.json() })
  return answer(params.month)
})

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  takes = []
  monthReads = 0
  // The figures are another stream's; here they answer the shared fixture's [] -- not available -- and nothing more.
  server.use(monthsAnswer(), http.get('*/api/members/summary', () => HttpResponse.json([])))
})

afterEach(async () => {
  // The figures read once the page knows its month: a test ends only once they have answered.
  const figures = screen.queryByRole('region', { name: 'The month’s figures' })
  if (figures) await waitFor(() => expect(figures).not.toHaveAttribute('data-figures', 'loading'))
})

const openPage = ({ permissions = [PERMISSIONS.MONTH_END_TAKE], path = '/admin/monthly-menu' } = {}) =>
  renderWithProviders(<TestAuthProvider permissions={permissions}><MonthlyMenu /></TestAuthProvider>,
    { initialEntries: [path] })

const monthsRead = () => waitFor(() => expect(screen.getByLabelText(/^Month/)).toBeEnabled())

describe('who may take a month', () => {
  it('🔒 nobody signed in: the take is shut, saying why -- and never asked', async () => {
    const user = setupUser()
    openPage({ permissions: [], path: '/admin/monthly-menu?month=2026-09' })
    await monthsRead()

    const take = screen.getByRole('button', { name: 'Take September 2026' })
    expect(take).toBeDisabled()
    expect(take).toHaveAccessibleDescription(TAKE_WAITS)
    await user.click(take)
    expect(takes).toEqual([])
  })

  it('🔒 signed in without MONTH_END_TAKE: shut, saying whom to ask', async () => {
    openPage({ permissions: [PERMISSIONS.MONTH_END_VIEW], path: '/admin/monthly-menu?month=2026-09' })
    await monthsRead()

    expect(screen.getByRole('button', { name: 'Take September 2026' })).toHaveAccessibleDescription(TAKE_NEEDS_PERMISSION)
  })
})

describe('taking the open month', () => {
  it('🔑 the dialog says what follows (MEN-14); one POST takes it, and the months are read again', async () => {
    const august = MONTHS.taken[0]
    const september = { ...august, month: '2026-09', takenAt: '2026-09-30T05:10:00Z', takenBy: 'Head Office Administrator (demo.headoffice)', takeId: 2 }
    server.use(
      monthsAnswer((read) => (read === 1 ? MONTHS : { openMonth: '2026-10', taken: [september, august] })),
      takeAnswer(() => HttpResponse.json(september)),
    )
    const user = setupUser()
    openPage({ path: '/admin/monthly-menu?month=2026-09' })
    await monthsRead()

    // Held by the permission, the take is open: no sentence says why it is shut.
    expect(document.getElementById('month-end-take-why')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Take September 2026' }))
    const dialog = await screen.findByRole('dialog', { name: 'Take September 2026' })
    expect(dialog).toHaveAccessibleDescription('Its figures are frozen for good. Everything captured or changed after this counts in October 2026.')
    await user.click(within(dialog).getByRole('button', { name: 'Take September 2026' }))

    expect(await screen.findByText('September 2026 is taken.')).toBeInTheDocument()
    expect(takes).toEqual([{ month: '2026-09', body: {} }])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(monthReads).toBe(2))
    expect(await screen.findByText(/^September 2026: Taken on 30 September 2026 at 07:10 by Head Office Administrator/)).toBeInTheDocument()
  })

  it('MONTH_ALREADY_TAKEN: somebody took it first -- said in the server\'s words, and the months read again', async () => {
    server.use(monthEndRefusal('MONTH_ALREADY_TAKEN', 'POST /api/month-end/{month}/take'))
    const user = setupUser()
    openPage({ path: '/admin/monthly-menu?month=2026-09' })
    await monthsRead()

    await user.click(screen.getByRole('button', { name: 'Take September 2026' }))
    const dialog = await screen.findByRole('dialog', { name: 'Take September 2026' })
    await user.click(within(dialog).getByRole('button', { name: 'Take September 2026' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(monthEndExamples.refusals.MONTH_ALREADY_TAKEN.body.message)
    await waitFor(() => expect(monthReads).toBe(2))
  })
})

describe('taking a month again -- with a reason (MEN-10, MEN-11)', () => {
  it('🔴 the reason is asked for first: nothing is sent without one', async () => {
    const user = setupUser()
    openPage()
    await monthsRead()

    await user.click(screen.getByRole('button', { name: 'Take August 2026 again' }))
    const dialog = await screen.findByRole('dialog', { name: 'Take August 2026 again' })
    const reason = within(dialog).getByRole('textbox', { name: /^Why it is taken again/ })
    await waitFor(() => expect(reason).toHaveFocus())
    expect(reason).toHaveAttribute('maxlength', '500')
    expect(reason).toHaveAccessibleDescription(/0 of 500 characters\. Kept with the take, and shown with the month\./)
    await user.click(within(dialog).getByRole('button', { name: 'Take August 2026 again' }))
    expect(reason).toHaveAccessibleDescription(/Say why the month is taken again: the reason is kept with the take\./)
    expect(takes).toEqual([])
  })

  it('🔑 with a reason: one POST naming the take it replaces, and the reason -- then the month shows why', async () => {
    const again = { ...MONTHS.taken[0], takenAt: '2026-10-01T08:00:00Z', takenBy: 'Head Office Administrator (demo.headoffice)',
      takeId: 2, takeNumber: 2, reason: 'Corrected the workplaces of 12 members', firstTakenAt: '2026-09-29T08:00:00Z', firstTakenBy: 'seed' }
    server.use(
      monthsAnswer((read) => (read === 1 ? MONTHS : { ...MONTHS, taken: [again] })),
      takeAnswer(() => HttpResponse.json(again)),
    )
    const user = setupUser()
    openPage()
    await monthsRead()

    await user.click(screen.getByRole('button', { name: 'Take August 2026 again' }))
    const dialog = await screen.findByRole('dialog', { name: 'Take August 2026 again' })
    await user.type(within(dialog).getByRole('textbox', { name: /^Why it is taken again/ }), '  Corrected the workplaces of 12 members ')
    await user.click(within(dialog).getByRole('button', { name: 'Take August 2026 again' }))

    expect(await screen.findByText('August 2026 is taken again.')).toBeInTheDocument()
    expect(takes).toEqual([{ month: '2026-08', body: { replaces: 1, reason: 'Corrected the workplaces of 12 members' } }])
    expect(await screen.findByText('Why it was taken again: “Corrected the workplaces of 12 members”')).toHaveAttribute('data-take-reason')
  })

  it('a reason the server will not keep is said at the field, in its words (TAKE_REASON_INVALID)', async () => {
    server.use(monthEndRefusal('TAKE_REASON_INVALID', 'POST /api/month-end/{month}/take'))
    const user = setupUser()
    openPage()
    await monthsRead()

    await user.click(screen.getByRole('button', { name: 'Take August 2026 again' }))
    const dialog = await screen.findByRole('dialog', { name: 'Take August 2026 again' })
    const reason = within(dialog).getByRole('textbox', { name: /^Why it is taken again/ })
    await user.type(reason, 'A reason')
    await user.click(within(dialog).getByRole('button', { name: 'Take August 2026 again' }))
    await waitFor(() => expect(reason).toHaveAccessibleDescription(new RegExp(monthEndExamples.refusals.TAKE_REASON_INVALID.body.message.slice(0, 40))))
    expect(screen.getByRole('dialog', { name: 'Take August 2026 again' })).toBeInTheDocument()
  })

  it('MONTH_TAKEN_SINCE: somebody took it again first -- said, and the months read again to show their take', async () => {
    server.use(monthEndRefusal('MONTH_TAKEN_SINCE', 'POST /api/month-end/{month}/take'))
    const user = setupUser()
    openPage()
    await monthsRead()

    await user.click(screen.getByRole('button', { name: 'Take August 2026 again' }))
    const dialog = await screen.findByRole('dialog', { name: 'Take August 2026 again' })
    await user.type(within(dialog).getByRole('textbox', { name: /^Why it is taken again/ }), 'A late capture')
    await user.click(within(dialog).getByRole('button', { name: 'Take August 2026 again' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(monthEndExamples.refusals.MONTH_TAKEN_SINCE.body.message)
    await waitFor(() => expect(monthReads).toBe(2))
  })
})

describe('the month, as the take left it (R4)', () => {
  it('🔑 a month taken again shows why, in the taker\'s words, and what it counts', async () => {
    const again = { ...MONTHS.taken[0], takeNumber: 2, reason: 'Corrected the workplaces of 12 members',
      firstTakenAt: '2026-09-29T08:00:00Z', firstTakenBy: 'seed', takenAt: '2026-10-01T08:00:00Z', takenBy: 'corrected',
      countsFrom: '2026-07-31T05:10:00Z', countsUntil: '2026-10-01T08:00:00Z' }
    server.use(monthsAnswer({ ...MONTHS, taken: [again] }))
    openPage({ permissions: [] })
    await monthsRead()

    expect(screen.getByText('Why it was taken again: “Corrected the workplaces of 12 members”')).toBeInTheDocument()
    expect(screen.getByText('It counts everything captured or changed from 31 July 2026 at 07:10 to 1 October 2026 at 10:00.'))
      .toHaveAttribute('data-counts')
  })

  it('the open month says from when it counts -- since the month before it was taken (MEN-14)', async () => {
    const august = { ...MONTHS.taken[0], countsFrom: '2026-07-31T05:10:00Z', countsUntil: '2026-09-29T08:00:00Z' }
    server.use(monthsAnswer({ ...MONTHS, taken: [august] }))
    openPage({ permissions: [], path: '/admin/monthly-menu?month=2026-09' })
    await monthsRead()

    expect(screen.getByText('Everything captured or changed since 29 September 2026 at 10:00, when August 2026 was taken, '
      + 'counts in September 2026.')).toBeInTheDocument()
  })

  it('the must-pass: a take the server kept no reason or window for says neither', async () => {
    // A take made before the window was kept (V79): the server's own August carries one, so it is taken away here.
    const before = { ...MONTHS.taken[0], reason: null, countsFrom: null, countsUntil: null }
    server.use(monthsAnswer({ ...MONTHS, taken: [before] }))
    openPage({ permissions: [] })
    await monthsRead()

    expect(document.querySelector('[data-take-reason]')).toBeNull()
    expect(document.querySelector('[data-counts]')).toBeNull()
  })
})
