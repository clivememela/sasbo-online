// @vitest-environment jsdom -- the Month end page, the Admin page and the rail, as a person reaches and reads them
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import App from '../../App'
import Admin from './Admin'
import MonthlyMenu from './MonthlyMenu'
import { navItems } from '../../config/navigation'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { smokeHandlers } from '../../test/msw/smokeLayer'
import { monthEndAnswer, monthEndBody } from '../../test/msw/monthEndExamples'
import { setupUser } from '../../test/user'
import { LISTINGS, LISTING_WAITS, STATISTICS, TAKE_WAITS } from './monthEndRules'

/**
 * MONTH END `04.1` -- THE MONTH END PAGE, WHERE THE MONTHLY MENU WAS (MD38).
 *
 * The page lists what is built and nothing else: the six statistics as links for the month chosen, the statistics
 * pack, and the four listings -- disabled with their reason, never asked for. The month is the server's, chosen once at
 * the top: a taken month says who took it and when, the open month that it is read live. The Admin page, the rail and
 * the route agree about where it is and what it is called, and no row links to the page it is on.
 *
 * Answered as the server answers (MD48): the months are the golden answer's. Every request the page makes is recorded,
 * so "nothing was asked" is a measurement, not an inference.
 */

const MONTHS = monthEndBody('GET /api/month-end/months')
/** The nine rows this page carried, none with a route. Two of their names live on as a built row's legacy title. */
const DEAD_ROWS = ['Key File Setup', 'Flag All Ports', 'Print Log File', 'Merge All Audit Trails',
  'Prepare File for Vari Mail', 'Extract New and Deleted', 'Print Location Listing']

let requests
const record = ({ request }) => {
  requests.push(`${request.method} ${new URL(request.url).pathname}`)
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  requests = []
  server.events.on('request:start', record)
  server.use(monthEndAnswer('GET /api/month-end/months'))
})

afterEach(() => {
  server.events.removeListener('request:start', record)
})

const openPage = (path = '/admin/monthly-menu') =>
  renderWithProviders(<MonthlyMenu />, { initialEntries: [path] })

/** The page has read its months: the month control holds the one it opened on. */
const monthsRead = () => waitFor(() => expect(screen.getByLabelText(/^Month/)).toBeEnabled())

/** The page's own links, by where they go -- the address and its query. */
const pageLinks = (scope = document.body) =>
  within(scope).queryAllByRole('link').map((link) => link.getAttribute('href'))

describe('where the page is -- the Admin page, the rail and the route agree (04.1, MD38)', () => {
  it('Admin Membership offers Month end between Daily and A.C.B., at the Monthly Menu\'s address', () => {
    renderWithProviders(<Admin />)

    const hrefs = pageLinks()
    expect(screen.getByRole('link', { name: /^Month end/ })).toHaveAttribute('href', '/admin/monthly-menu')
    expect(hrefs.indexOf('/admin/monthly-menu')).toBe(hrefs.indexOf('/admin/daily-menu') + 1)
    expect(hrefs.indexOf('/admin/acb')).toBe(hrefs.indexOf('/admin/monthly-menu') + 1)
  })

  it('the rail holds it as a LEAF of Admin Menu, between Daily Menu and A.C.B., with nothing under it (BR8)', () => {
    const admin = navItems.find((item) => item.title === 'Admin Menu')
    const titles = admin.subItems.map((item) => item.title)
    const leaf = admin.subItems.find((item) => item.href === '/admin/monthly-menu')

    expect(leaf?.title).toBe('Month end')
    expect(leaf.subItems).toBeUndefined()
    expect(titles.indexOf('Month end')).toBe(titles.indexOf('Daily Menu') + 1)
    expect(titles.indexOf('A.C.B')).toBe(titles.indexOf('Month end') + 1)
  })

  it('🔑 the route renders the page the rail and the crumb name: Admin Menu › Month end', async () => {
    server.use(...smokeHandlers)
    server.use(monthEndAnswer('GET /api/month-end/months'))
    renderWithProviders(<App />, { initialEntries: ['/admin/monthly-menu'] })

    expect(await screen.findByRole('heading', { level: 1, name: 'Month end' })).toBeInTheDocument()
    const rail = screen.getByRole('navigation', { name: 'Main' })
    expect(within(rail).getByRole('link', { name: 'Month end' })).toHaveAttribute('aria-current', 'page')
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumb).getByRole('link', { name: 'Admin Menu' })).toHaveAttribute('href', '/admin')
    expect(within(crumb).getByText('Month end')).toHaveAttribute('aria-current', 'page')
    expect(crumb).toHaveTextContent(/^Home\s*Admin Menu\s*Month end$/)
  })
})

describe('what the page lists -- what is built, and nothing else', () => {
  it('🔴 no row links to the page it is on', async () => {
    openPage()
    await monthsRead()

    const own = pageLinks().filter((href) => href.split('?')[0] === '/admin/monthly-menu')
    expect(own, 'a row that links to the page it is on is a dead end dressed as a destination').toEqual([])
    expect(pageLinks().length).toBeGreaterThan(0)
  })

  it('🔴 the six statistics are its links, each opening its screen for the month chosen -- and nothing else links', async () => {
    openPage()
    await monthsRead()

    expect(pageLinks()).toEqual(STATISTICS.map((statistic) => `/admin/monthly-menu/${statistic.key}?month=2026-08`))
    for (const statistic of STATISTICS) {
      const link = screen.getByRole('link', { name: new RegExp(`^${statistic.name}`) })
      // Its plain name, and the legacy title as its second line.
      expect(link).toHaveTextContent(statistic.legacy)
    }
  })

  it('🔴 the nine dead rows are gone, and no row says "Not yet available"', async () => {
    openPage()
    await monthsRead()

    for (const title of DEAD_ROWS) expect(screen.queryByText(title), title).not.toBeInTheDocument()
    expect(screen.queryByText('Not yet available')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Month end' })).toBeInTheDocument()
  })

  it('the statistics pack is here, for the month chosen', async () => {
    openPage()
    await monthsRead()

    expect(screen.getByRole('heading', { level: 2, name: 'The statistics pack' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Prepare the pack for August 2026' })).toBeEnabled()
  })
})

describe('the listings -- built refusing, and never asked (MD4)', () => {
  it('🔴 four rows, disabled with their reason -- and not one request for a listing', async () => {
    openPage()
    await monthsRead()

    expect(screen.getByText(LISTING_WAITS)).toBeInTheDocument()
    for (const listing of LISTINGS) {
      const title = screen.getByText(listing.name)
      expect(title.closest('a'), `${listing.name} is a link, and a listing answers nobody until sign-in`).toBeNull()
      const row = title.closest('div')
      expect(row).toHaveTextContent(listing.legacy)
      expect(row).toHaveTextContent('Waits for sign-in')
    }
    expect(requests).toEqual(['GET /api/month-end/months'])
    expect(requests.some((request) => request.includes('/listings/'))).toBe(false)
  })

  it('Take the month: for the open month, disabled with its reason, as A.C.B.\'s Approve is -- and never asked', async () => {
    const user = setupUser()
    openPage()
    await monthsRead()
    expect(screen.queryByRole('button', { name: /^Take / })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/^Month/), '2026-09')
    const take = screen.getByRole('button', { name: 'Take September 2026' })
    expect(take).toBeDisabled()
    expect(take).toHaveAccessibleDescription(TAKE_WAITS)
    await user.click(take)
    expect(requests.some((request) => request.endsWith('/take'))).toBe(false)
  })
})

describe('the month -- chosen once, at the top, from the server\'s months (MD55)', () => {
  it('opens on the month taken, and says who took it and when', async () => {
    openPage()
    await monthsRead()

    expect(screen.getByLabelText(/^Month/)).toHaveValue('2026-08')
    expect(screen.getByText('August 2026: Taken on 29 September 2026 at 10:00 by seed. Its figures are the month as it stood then.'))
      .toHaveAttribute('data-month-state', 'TAKEN')
  })

  it('the open month says its figures are read live -- and every statistic then opens for it', async () => {
    const user = setupUser()
    openPage()
    await monthsRead()

    const month = screen.getByLabelText(/^Month/)
    expect(within(month).getAllByRole('option').map((option) => option.textContent))
      .toEqual(['September 2026 — open', 'August 2026 — taken'])
    await user.selectOptions(month, '2026-09')

    expect(screen.getByText(/^September 2026 is the open month: its figures are read live/))
      .toHaveAttribute('data-month-state', 'OPEN')
    expect(pageLinks()).toEqual(STATISTICS.map((statistic) => `/admin/monthly-menu/${statistic.key}?month=2026-09`))
    expect(screen.getByRole('button', { name: 'Prepare the pack for September 2026' })).toBeEnabled()
  })

  it('a month in the address is the month chosen -- as a statistic\'s screen carries it back here', async () => {
    openPage('/admin/monthly-menu?month=2026-09')
    await monthsRead()

    expect(screen.getByLabelText(/^Month/)).toHaveValue('2026-09')
    expect(pageLinks()[0]).toBe('/admin/monthly-menu/new-and-deleted?month=2026-09')
  })

  it('a past month the server never took is said as such, from its months', async () => {
    openPage('/admin/monthly-menu?month=2026-07')
    await monthsRead()

    expect(screen.getByText('July 2026 was not taken, and a past month is read only from what was taken.'))
      .toHaveAttribute('data-month-state', 'NOT_TAKEN')
  })

  it('the months could not be read: said, with Try again -- and the statistics still open, for no month named', async () => {
    let asked = 0
    server.use(http.get('*/api/month-end/months', () => {
      asked += 1
      return asked === 1
        ? HttpResponse.json({ status: 503, error: 'Service Unavailable' }, { status: 503 })
        : HttpResponse.json(MONTHS)
    }))
    const user = setupUser()
    openPage()

    expect(await screen.findByText('Month could not be loaded.')).toBeInTheDocument()
    expect(pageLinks()).toEqual(STATISTICS.map((statistic) => `/admin/monthly-menu/${statistic.key}`))
    expect(screen.getByRole('button', { name: 'Prepare the pack' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await monthsRead()
    expect(screen.getByLabelText(/^Month/)).toHaveValue('2026-08')
    expect(asked).toBe(2)
  })

  it('an answer of the wrong shape -- the shared fixture\'s [] -- is not available, and trying again would not help', async () => {
    server.use(http.get('*/api/month-end/months', () => HttpResponse.json([])))
    openPage()

    expect(await screen.findByText('Month could not be loaded.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Taken on/)).not.toBeInTheDocument()
  })
})
