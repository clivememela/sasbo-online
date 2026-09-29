// @vitest-environment jsdom -- the first screen's figures: rendered, driven through their controls, and read back
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import Home from './Home'
/*
 * 🔑 THE FIGURES' CHUNK IS IMPORTED HERE, AND THAT IS AN ANTI-FLAKE FIX RATHER THAN AN UNUSED IMPORT. `Home` asks for
 * it with `lazy(() => import(...))`; a module already in the registry resolves on the next microtask instead of on
 * however busy the machine is -- the rule `shell.drawer.test.jsx` records for the routes.
 */
import './home/HomeFigures.jsx'
import { deferred } from '../test/deferred'
import { monthEndAnswer, monthEndBody, monthEndExamples } from '../test/msw/monthEndExamples'
import { server } from '../test/msw/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { setupUser } from '../test/user'

/**
 * *"THE EYE OF SASBO"* -- month end `02.3`, the first screen's figures: the strip and the sheet from one answer of
 * `GET /api/members/summary`, above the menu rows, in five states (`screens.md` §0.1).
 *
 * Every answer here is built on the server's own golden answer (MD48) with invented numbers a person could tell apart,
 * and every name is invented. Each control is DRIVEN (SCREEN-CONTRACT §7): a screen that renders perfectly until
 * somebody chooses something is the defect this suite was taught to fear.
 */
const GOLDEN = monthEndBody('GET /api/members/summary')

const figures = (numbers) => ({ ...GOLDEN.totals, complementOutOfDate: false, ...numbers })
const row = (key, numbers, extra = {}) =>
  ({ key, label: key, core: null, fewerThanFive: false, withheld: false, figures: figures(numbers), ...extra })

const NO_WORKPLACE = row('~NO_WORKPLACE',
  { onRecord: 18, suspended: 0, paying: 18, joined: 1, left: 0, complement: null, penetration: null },
  { label: 'No workplace on record' })

/** An invented September: two invented groups, eighteen members with no workplace, the totals their sum. */
const september = (overrides = {}) => ({
  ...GOLDEN,
  totals: figures({ onRecord: 2418, suspended: 118, paying: 2300, joined: 41, left: 12, complement: 3630, penetration: 0.6336 }),
  rows: [
    row('INVENTED GROUP CORE',
      { onRecord: 2000, suspended: 100, paying: 1900, joined: 30, left: 10, complement: 3000, penetration: 0.6333 },
      { core: true }),
    row('INVENTED GROUP OTHER',
      { onRecord: 400, suspended: 18, paying: 382, joined: 10, left: 2, complement: 630, penetration: 0.6063 },
      { core: false }),
    NO_WORKPLACE,
  ],
  unplaced: { statuses: [], noWorkplace: 18, noTableCode: 0 },
  ...overrides,
})

const BY_EMPLOYER = [
  row('SYNTHETIC EMPLOYER ONE', { onRecord: 2400, suspended: 118, paying: 2282, joined: 40, left: 12, complement: 3630, penetration: 0.6287 }),
  NO_WORKPLACE,
]

/**
 * The summary, answered by `answers` in turn -- a body, or a function returning the response -- and the last of them
 * for any request after; and the query of every request it was asked, in order.
 */
const summaryAnswers = (...answers) => {
  const asked = []
  server.use(http.get('*/api/members/summary', ({ request }) => {
    asked.push(new URL(request.url).searchParams)
    const next = answers[Math.min(asked.length, answers.length) - 1]
    return typeof next === 'function' ? next() : HttpResponse.json(next)
  }))
  return asked
}

const refused = (code) => () =>
  HttpResponse.json(monthEndExamples.refusals[code].body, { status: monthEndExamples.refusals[code].status })
const UNAVAILABLE = refused('SUMMARY_UNAVAILABLE')
const TOO_LONG = /^The figures are taking too long to work out just now\. Nothing is wrong with the members' records\. Try again in a moment\.$/
const NOT_AVAILABLE = 'The figures are not available from this server yet.'

const strip = () => within(screen.getByTestId('figure-strip'))
const figureNamed = (label) => strip().getByText(label).closest('div')
/** A figure's readings, as a screen reader meets them: the value, then what it counted. Spaces made plain. */
const readings = (label) =>
  within(figureNamed(label)).getAllByRole('definition').map((dd) => dd.textContent.replace(/\s/g, ' '))
const figuresRegion = () => screen.getByRole('region', { name: "SASBO's figures" })
const combobox = (name) => screen.getByRole('combobox', { name })
const rowOf = (label) => screen.getByText(label).closest('tr')
const cellsOf = (tr) => [...tr.querySelectorAll('td[data-col]')].map((cell) => cell.textContent.replace(/\s/g, ' '))
/** The menu rows: the application's areas, which never wait on the figures and are never spoiled by them. */
const expectTheMenuRows = () => {
  expect(screen.getByRole('link', { name: /^Members/ })).toBeInTheDocument()
  expect(screen.getAllByRole('link').length).toBeGreaterThan(5)
}

beforeEach(() => {
  // A failed read is reported through the sink, which writes to the console; the report is not the assertion.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('the first screen\'s figures (02.3)', () => {
  it('ready: six figures, each saying what it counted, over the sheet by employer group and its total', async () => {
    const asked = summaryAnswers(september())
    renderWithProviders(<Home />)
    await screen.findByText('INVENTED GROUP CORE')

    // The three of one instrument together, Paying members leading (MD24, MM57); then the month's movement.
    expect(strip().getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Paying members', 'Suspended', 'Members on record', 'Joined this month', 'Left this month', 'Penetration',
    ])
    // ME-10: every figure states the definition it used.
    expect(readings('Paying members')).toEqual(['2 300', 'on record and not suspended'])
    expect(readings('Suspended')).toEqual(['118', "by SASBO's suspension codes"])
    expect(readings('Members on record')).toEqual(['2 418', 'of a status this system knows, and not a leaving one'])
    expect(readings('Joined this month')).toEqual(['41', 'Date Joined in September 2026'])
    expect(readings('Left this month')).toEqual(['12', 'left in September 2026, with a deletion code'])
    expect(readings('Penetration')).toEqual(['63,36 %', 'paying members over staff complement'])

    // The sheet: headed by the grouping, the core group marked, no workplace last, and the total beneath it all.
    expect(screen.getByRole('columnheader', { name: 'Employer group' })).toBeInTheDocument()
    expect(screen.getAllByRole('row').slice(1).map((tr) => cellsOf(tr)[0]))
      .toEqual(['INVENTED GROUP CORE · core', 'INVENTED GROUP OTHER', 'No workplace on record', 'Total'])
    expect(cellsOf(rowOf('INVENTED GROUP CORE'))).toEqual(['INVENTED GROUP CORE · core', '3 000', '1 900', '30', '10', '100', '63,33 %'])
    expect(cellsOf(rowOf('No workplace on record'))).toEqual(['No workplace on record', '—', '18', '1', '0', '0', '—'])
    expect(cellsOf(rowOf('Total'))).toEqual(['Total', '3 630', '2 300', '41', '12', '118', '63,36 %'])

    // The lines beneath it: what the sheet's Members are, and what could not be placed.
    expect(screen.getByText('Members are paying members: on record and not suspended.')).toBeInTheDocument()
    expect(screen.getByText('18 members have no workplace on record')).toBeInTheDocument()
    expect(screen.queryByText('Grouped by where each member works today.')).not.toBeInTheDocument()

    // 🔴 MD55: the first request names no month; the screen shows the one the server answered.
    expect(asked).toHaveLength(1)
    expect(asked[0].has('month')).toBe(false)
    expect(asked[0].get('by')).toBe('group')
    expect(combobox('Month')).toHaveDisplayValue('September 2026')
    expect(figuresRegion()).toHaveAttribute('data-figures', 'ready')
    expectTheMenuRows()
  })

  it('🔴 MD69: the first paint is ONE request; the areas and regions are asked for when their control is opened, and kept', async () => {
    const requests = []
    const listen = ({ request }) => requests.push(new URL(request.url).pathname)
    server.events.on('request:start', listen)
    try {
      summaryAnswers(september())
      server.use(monthEndAnswer('GET /api/reference/regions'), monthEndAnswer('GET /api/reference/areas'))
      const user = setupUser()
      renderWithProviders(<Home />)
      await screen.findByText('INVENTED GROUP CORE')

      expect(requests).toEqual(['/api/members/summary'])

      await user.click(combobox('Area'))
      expect(await screen.findByRole('option', { name: 'Area A' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'NORTH region' })).toBeInTheDocument()
      // Opened again: the lists are kept for the visit, not asked for twice.
      await user.click(combobox('Area'))
      expect(requests.filter((path) => path.startsWith('/api/reference/')).sort())
        .toEqual(['/api/reference/areas', '/api/reference/regions'])
    } finally {
      server.events.removeListener('request:start', listen)
    }
  })

  it('drives the grouping, the month and the place -- and every request carries what was chosen', async () => {
    const august = { month: '2026-08', monthFromTheServer: false, by: 'employer', rows: BY_EMPLOYER }
    const asked = summaryAnswers(
      september(),
      september({ by: 'employer', rows: BY_EMPLOYER }),
      september(august),
      september({ ...august, area: 'A' }),
      september({ ...august, region: 'NORTH' }),
    )
    server.use(monthEndAnswer('GET /api/reference/regions'), monthEndAnswer('GET /api/reference/areas'))
    const user = setupUser()
    renderWithProviders(<Home />)
    await screen.findByText('INVENTED GROUP CORE')

    await user.selectOptions(combobox('Grouped by'), 'employer')
    expect(await screen.findByText('SYNTHETIC EMPLOYER ONE')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Employer' })).toBeInTheDocument()
    expect(asked[1].get('by')).toBe('employer')
    expect(asked[1].has('month')).toBe(false)

    // A month chosen from the months the SERVER counted back from -- and a past month says how it is grouped.
    await user.selectOptions(combobox('Month'), 'August 2026')
    expect(await screen.findByText('Grouped by where each member works today.')).toBeInTheDocument()
    expect(asked[2].get('month')).toBe('2026-08')
    expect(asked[2].get('by')).toBe('employer')
    expect(readings('Joined this month')[1]).toBe('Date Joined in August 2026')

    await user.click(combobox('Area'))
    await screen.findByRole('option', { name: 'Area A' })
    await user.selectOptions(combobox('Area'), 'Area A')
    await waitFor(() => expect(asked).toHaveLength(4))
    expect(Object.fromEntries(asked[3])).toEqual({ month: '2026-08', by: 'employer', area: 'A' })

    await user.selectOptions(combobox('Area'), 'NORTH region')
    await waitFor(() => expect(asked).toHaveLength(5))
    expect(Object.fromEntries(asked[4])).toEqual({ month: '2026-08', by: 'employer', region: 'NORTH' })
    await waitFor(() => expect(figuresRegion()).toHaveAttribute('data-figures', 'ready'))
  })

  it('loading: no figure is printed before one was read -- and the menu rows are there already', async () => {
    const held = deferred()
    summaryAnswers(() => held.promise.then(() => HttpResponse.json(september())))
    renderWithProviders(<Home />)

    try {
      expectTheMenuRows()
      const figureStrip = await screen.findByTestId('figure-strip')
      expect(figureStrip).toHaveAttribute('aria-busy', 'true')
      expect(figureStrip).not.toHaveTextContent(/\d/)
      expect(screen.getByRole('status')).toHaveTextContent('Loading…')
      expect(figuresRegion()).toHaveAttribute('data-figures', 'loading')
    } finally {
      held.resolve()
    }

    expect(await screen.findByText('INVENTED GROUP CORE')).toBeInTheDocument()
    expect(screen.getByTestId('figure-strip')).not.toHaveAttribute('aria-busy')
  })

  it('error: SUMMARY_UNAVAILABLE is the server\'s sentence with Try again -- the strip says not available, the menu rows are untouched', async () => {
    const asked = summaryAnswers(UNAVAILABLE, september())
    const user = setupUser()
    renderWithProviders(<Home />)

    expect(await screen.findByText(TOO_LONG)).toBeInTheDocument()
    expect(strip().getAllByText('not available')).toHaveLength(6)
    expect(screen.getByTestId('figure-strip')).not.toHaveTextContent(/\d/)
    expect(figuresRegion()).toHaveAttribute('data-figures', 'error')
    expectTheMenuRows()

    // It asks again when a person does -- still for the server's month, since none was ever read.
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('INVENTED GROUP CORE')).toBeInTheDocument()
    expect(asked).toHaveLength(2)
    expect(asked[1].has('month')).toBe(false)
  })

  it('empty: a register of nobody -- the strip reads nought, and the sheet says so in a sentence', async () => {
    const nobody = { onRecord: 0, suspended: 0, paying: 0, joined: 0, left: 0 }
    summaryAnswers(september({
      totals: figures({ ...nobody, complement: 3630, penetration: 0 }),
      rows: [row('~NO_WORKPLACE', { ...nobody, complement: null, penetration: null }, { label: 'No workplace on record' })],
      unplaced: { statuses: [], noWorkplace: 0, noTableCode: 0 },
    }))
    renderWithProviders(<Home />)

    expect(await screen.findByText('No members are on record yet.')).toBeInTheDocument()
    expect(strip().getAllByText('0')).toHaveLength(5)
    expect(readings('Penetration')[0]).toBe('0,00 %')
    expect(figuresRegion()).toHaveAttribute('data-figures', 'empty')
  })

  it('🔴 partial: a reload that fails keeps the strip it had and says when it was read -- and no old sheet under the new heading (ME-16)', async () => {
    const asked = summaryAnswers(september(), UNAVAILABLE, september({ by: 'employer', rows: BY_EMPLOYER }))
    const user = setupUser()
    renderWithProviders(<Home />)
    await screen.findByText('INVENTED GROUP CORE')

    await user.selectOptions(combobox('Grouped by'), 'employer')
    expect(await screen.findByText(TOO_LONG)).toBeInTheDocument()

    // The strip stands, with the figures it had and when they were read...
    expect(readings('Paying members')).toEqual(['2 300', 'on record and not suspended'])
    expect(screen.getByText(/^These are the figures for September 2026, as read at \d\d:\d\d\. The figures asked for since could not be loaded\.$/))
      .toBeInTheDocument()
    // ...and the sheet says it could not be loaded, under the heading asked for -- never the old rows beneath it.
    expect(screen.getByRole('columnheader', { name: 'Employer' })).toBeInTheDocument()
    expect(screen.queryByText('INVENTED GROUP CORE')).not.toBeInTheDocument()
    expect(figuresRegion()).toHaveAttribute('data-figures', 'partial')
    expect(asked).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('SYNTHETIC EMPLOYER ONE')).toBeInTheDocument()
    expect(asked.map((query) => query.get('by'))).toEqual(['group', 'employer', 'employer'])
    expect(screen.queryByText(/as read at/)).not.toBeInTheDocument()
  })

  it.each([
    ['an empty array -- what the shared fixture answers every read with', []],
    ['null', null],
    ['an empty object', {}],
    ['an answer with no rows', { ...GOLDEN, rows: [] }],
    ['an answer whose rows are missing', { ...GOLDEN, rows: undefined }],
  ])('🔴 MV-36: %s is not available -- never a crash, never "no members", the menu rows untouched', async (_, body) => {
    summaryAnswers(body)
    renderWithProviders(<Home />)

    expect(await screen.findByText(NOT_AVAILABLE)).toBeInTheDocument()
    expect(strip().getAllByText('not available')).toHaveLength(6)
    expect(screen.queryByText('No members are on record yet.')).not.toBeInTheDocument()
    // An answer that cannot be read will not be read by asking again.
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expectTheMenuRows()
  })

  it.each([
    [500, 'Internal Server Error'],
    [404, 'Not Found'],
  ])('MR-ROB-31: an older server answers the summary %s -- it takes "summary" for a member\'s number -- and that is not available', async (status, error) => {
    summaryAnswers(() => HttpResponse.json({ status, error, path: '/api/members/summary' }, { status }))
    renderWithProviders(<Home />)

    expect(await screen.findByText(NOT_AVAILABLE)).toBeInTheDocument()
    expect(strip().getAllByText('not available')).toHaveLength(6)
    expectTheMenuRows()
  })

  it('ME-23: the screen never asks again by itself -- not after a failure, and not a minute later', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'], shouldAdvanceTime: true })
    const asked = summaryAnswers(UNAVAILABLE)
    renderWithProviders(<Home />)
    await screen.findByText(TOO_LONG)

    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(asked).toHaveLength(1)
  })

  it.each([
    ['2026-10', 'October 2026'],
    ['2026-09', 'September 2026'],
  ])('🔴 MV-51: at 23:30 UTC on the last day of September the browser\'s clock decides nothing -- the first request names no month, and %s is shown as the answer says', async (month, label) => {
    // `Date` alone is faked: in Johannesburg it is already 1 October, in UTC still 30 September, and the answer names
    // one or the other. A screen that read either clock would show the wrong month for one of these two.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-30T23:30:00Z') })
    const asked = summaryAnswers(september({ month }))
    renderWithProviders(<Home />)
    await screen.findByText('INVENTED GROUP CORE')

    expect(asked[0].has('month')).toBe(false)
    expect(combobox('Month')).toHaveDisplayValue(label)
    expect(readings('Joined this month')[1]).toBe(`Date Joined in ${label}`)
    // The months offered are counted back from the answer's month, never from the clock's.
    const offered = within(combobox('Month')).getAllByRole('option').map((option) => option.value)
    expect(offered).toHaveLength(13)
    expect(offered[0]).toBe(month)
    expect(screen.queryByText('Grouped by where each member works today.')).not.toBeInTheDocument()
  })

  it('🔴 rule C: a row of fewer than five, and the row withheld beside it, carry no number at all (MD37, MV-19)', async () => {
    summaryAnswers(september({
      rows: [
        row('SYNTHETIC EMPLOYER ONE', { onRecord: 2396, suspended: 118, paying: 2278, joined: 40, left: 12, complement: 3600, penetration: 0.6328 }),
        { key: 'SYNTHETIC EMPLOYER TWO', label: 'SYNTHETIC EMPLOYER TWO', core: null, fewerThanFive: true, withheld: false, figures: null },
        { key: 'SYNTHETIC EMPLOYER THREE', label: 'SYNTHETIC EMPLOYER THREE', core: null, fewerThanFive: false, withheld: true, figures: null },
        NO_WORKPLACE,
      ],
    }))
    renderWithProviders(<Home />)
    await screen.findByText('SYNTHETIC EMPLOYER ONE')

    const small = rowOf('SYNTHETIC EMPLOYER TWO')
    expect(small).toHaveTextContent('fewer than five')
    expect(small).not.toHaveTextContent(/\d/)
    const withheld = rowOf('SYNTHETIC EMPLOYER THREE')
    expect(withheld).toHaveTextContent('withheld')
    expect(withheld).not.toHaveTextContent(/\d/)
    expect(screen.getByText(/^A row with fewer than five members shows no figures until administrators sign in/))
      .toBeInTheDocument()
    // The must-pass: the row beside them still reads its numbers.
    expect(cellsOf(rowOf('SYNTHETIC EMPLOYER ONE'))).toEqual(['SYNTHETIC EMPLOYER ONE', '3 600', '2 278', '40', '12', '118', '63,28 %'])
  })

  it('says whose members these are, what could not be placed, and why nothing is grouped (ME-17, MD62)', async () => {
    const onRecord = { onRecord: 1728, suspended: 0, paying: 1728, joined: 3, left: 0, complement: null, penetration: null }
    summaryAnswers(september({
      workplacesServed: 'NONE',
      seededMembers: 1710,
      totals: figures(onRecord),
      rows: [row('~NO_WORKPLACE', onRecord, { label: 'No workplace on record' })],
      unplaced: { statuses: [{ status: 'Inactive', members: 3 }], noWorkplace: 1728, noTableCode: 0 },
    }))
    renderWithProviders(<Home />)
    await screen.findByText('No workplace on record')

    expect(screen.getByText(/^1\s710 of these members are invented, for demonstration; the staff complement is SASBO's own, which is why penetration reads low\.$/))
      .toBeInTheDocument()
    expect(screen.getByText(/^3 members have a status this system does not know: "Inactive" · 1\s728 members have no workplace on record$/))
      .toBeInTheDocument()
    expect(screen.getByText("SASBO's workplaces are not loaded on this demonstration yet.")).toBeInTheDocument()
    // No staff complement on record is no penetration: not available, never 0 %.
    expect(within(figureNamed('Penetration')).getByText('not available')).toBeInTheDocument()
  })

  it('the must-pass: nothing invented, nothing unplaced and every workplace served -- none of those lines is said', async () => {
    summaryAnswers(september({ unplaced: { statuses: [], noWorkplace: 0, noTableCode: 0 } }))
    renderWithProviders(<Home />)
    await screen.findByText('INVENTED GROUP CORE')

    expect(screen.queryByText(/invented, for demonstration/)).not.toBeInTheDocument()
    expect(screen.queryByText(/does not know|members? ha(s|ve) no workplace/)).not.toBeInTheDocument()
    expect(screen.queryByText(/not loaded on this demonstration/)).not.toBeInTheDocument()
  })

  it('a penetration above a hundred is shown as it is, with the words complement out of date (MM76)', async () => {
    const over = { penetration: 1.042, complementOutOfDate: true }
    summaryAnswers(september({
      totals: figures({ onRecord: 2418, suspended: 118, paying: 2300, joined: 41, left: 12, complement: 2207, ...over }),
      rows: [
        row('INVENTED GROUP CORE',
          { onRecord: 2400, suspended: 118, paying: 2282, joined: 40, left: 12, complement: 2190, ...over }, { core: true }),
        NO_WORKPLACE,
      ],
    }))
    renderWithProviders(<Home />)
    await screen.findByText('INVENTED GROUP CORE')

    expect(readings('Penetration')).toEqual(['104,20 %', 'paying members over staff complement: complement out of date'])
    expect(cellsOf(rowOf('INVENTED GROUP CORE')).at(-1)).toBe('104,20 %complement out of date')
  })
})
