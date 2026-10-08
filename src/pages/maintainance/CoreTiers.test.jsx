// @vitest-environment jsdom -- the core tiers: SASBO's table codes in Core A, B and C, read by anyone, set by REFERENCE_MAINTAIN
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import CoreTiers from './CoreTiers'
import { PERMISSIONS } from '../../auth/permissions'
import { TestAuthProvider } from '../../test/authTestUtils'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { monthEndAnswer, monthEndBody, monthEndExamples, monthEndRefusal } from '../../test/msw/monthEndExamples'
import { setupUser } from '../../test/user'
import { deferred } from '../../test/deferred'
import { expectNoA11yViolations } from '../../test/assertions'

/**
 * THE CORE TIERS, SET -- `contracts/monthend-rules-api.md` R7; Stephne, MEN-31 ("Decisions are made by Senior
 * Secretariat"). The server's golden answers: four invented table codes, 901 in Core A and the rest in none. Every write
 * is recorded, with its body.
 */

const TIERS = 'GET /api/reference/core-tiers'
const CODES = 'GET /api/reference/table-codes'
const SET = 'PUT /api/reference/table-codes/{id}/core-tier'

let writes
const record = async ({ request }) => {
  if (request.method === 'GET') return
  writes.push({ at: `${request.method} ${new URL(request.url).pathname}`, body: await request.clone().json() })
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  writes = []
  server.events.on('request:start', record)
  server.use(monthEndAnswer(TIERS), monthEndAnswer(CODES))
})

afterEach(() => {
  server.events.removeListener('request:start', record)
})

const openPage = (permissions = [PERMISSIONS.REFERENCE_MAINTAIN]) =>
  renderWithProviders(<TestAuthProvider permissions={permissions}><CoreTiers /></TestAuthProvider>)

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
const cells = (row) => within(row).getAllByRole('cell').filter((cell) => !cell.hasAttribute('data-expander'))
const rowOf = (code) => bodyRows().find((row) => cells(row)[0].textContent === String(code))

/** Opens table code `code`'s dialog and saves `tier` -- by its visible name. */
const setTier = async (user, code, tier) => {
  await user.click(screen.getByRole('button', { name: `Change the tier of table code ${code}` }))
  const dialog = await screen.findByRole('dialog', { name: `Table code ${code}` })
  await user.selectOptions(within(dialog).getByLabelText(/^Tier/), within(dialog).getByRole('option', { name: tier }))
  await user.click(within(dialog).getByRole('button', { name: 'Save the tier' }))
  return dialog
}

describe('the tiers and their table codes', () => {
  it('🔑 each table code with its tier, how many stand in each, and where the list came from', async () => {
    openPage()

    await screen.findByText('INVENTED BANK DEPARTMENTS')
    expect(bodyRows().map((row) => cells(row).slice(0, 4).map((cell) => cell.textContent))).toEqual([
      ['901', 'INVENTED BANK', 'INVENTED BANK', 'Core A'],
      ['902', 'INVENTED BANK DEPARTMENTS', 'INVENTED BANK', 'All other institutions'],
      ['903', 'INVENTED INSURER CASH', 'INVENTED INSURER', 'All other institutions'],
      ['904', 'INVENTED LENDER', 'None on record', 'All other institutions'],
    ])
    expect(screen.getByText('Core A: 1 · Core B: 0 · Core C: 0 · All other institutions: 3')).toBeInTheDocument()
    expect(screen.getByText(/^The tiers shown are provisional, from SASBO’s Core List by table code/)).toBeInTheDocument()
    expect(screen.getByText('As printed on 31 August 2026 — not yet confirmed by SASBO')).toBeInTheDocument()
  })

  it('narrowed by what is typed -- a number, a name or an employer -- and by tier', async () => {
    const user = setupUser()
    openPage()

    await screen.findByText('INVENTED LENDER')
    await user.type(screen.getByLabelText(/^Search/), 'insurer')
    expect(bodyRows().map((row) => cells(row)[0].textContent)).toEqual(['903'])
    await user.clear(screen.getByLabelText(/^Search/))
    await user.selectOptions(screen.getByLabelText(/^Tier/), 'A')
    expect(bodyRows().map((row) => cells(row)[0].textContent)).toEqual(['901'])
    await user.selectOptions(screen.getByLabelText(/^Tier/), 'B')
    expect(screen.getByText('No table code matches.')).toBeInTheDocument()
  })

  it('🔒 held: nobody signed in reads the tiers, finds every control shut, and is told why -- nothing is written', async () => {
    openPage([])

    await screen.findByText('INVENTED LENDER')
    const why = screen.getByText(/^Changing the tiers is for an administrator who has signed in with permission to maintain lists\./)
    for (const change of screen.getAllByRole('button', { name: /^Change the tier of table code/ })) {
      expect(change).toBeDisabled()
      expect(change).toHaveAttribute('aria-describedby', why.id)
    }
    expect(writes).toEqual([])
  })
})

describe('setting a tier', () => {
  it('🔑 a table code put in Core B: sent as the server reads it, and its row and the counts say so at once', async () => {
    server.use(monthEndAnswer(SET))
    const user = setupUser()
    openPage()

    await screen.findByText('INVENTED BANK DEPARTMENTS')
    await setTier(user, 902, 'Core B')

    expect(await screen.findByText('Table code 902 is now under Core B.')).toBeInTheDocument()
    expect(writes).toEqual([{ at: 'PUT /api/reference/table-codes/902/core-tier', body: { tier: 'B' } }])
    expect(writes[0].body).toEqual(monthEndExamples.answers[SET].requestBody)
    expect(cells(rowOf(902))[3]).toHaveTextContent('Core B')
    expect(screen.getByText('Core A: 1 · Core B: 1 · Core C: 0 · All other institutions: 2')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a table code taken out of every tier is sent as none (null), and stands under all other institutions', async () => {
    server.use(http.put('*/api/reference/table-codes/:code/core-tier', () =>
      HttpResponse.json({ ...monthEndBody(SET), code: 901, name: 'INVENTED BANK', coreTier: null })))
    const user = setupUser()
    openPage()

    await screen.findByText('INVENTED BANK DEPARTMENTS')
    await setTier(user, 901, 'All other institutions')

    expect(await screen.findByText('Table code 901 is now under All other institutions.')).toBeInTheDocument()
    expect(writes.map((write) => write.body)).toEqual([{ tier: null }])
    expect(screen.getByText('Core A: 0 · Core B: 0 · Core C: 0 · All other institutions: 4')).toBeInTheDocument()
  })

  it('the tier it already stands in cannot be saved again: Save waits for another', async () => {
    const user = setupUser()
    openPage()

    await screen.findByText('INVENTED LENDER')
    await user.click(screen.getByRole('button', { name: 'Change the tier of table code 901' }))
    const dialog = await screen.findByRole('dialog', { name: 'Table code 901' })
    expect(within(dialog).getByLabelText(/^Tier/)).toHaveValue('A')
    expect(within(dialog).getByRole('button', { name: 'Save the tier' })).toBeDisabled()
  })
})

describe('the refusals', () => {
  it('TABLE_CODE_UNKNOWN: the dialog closes, the server\'s sentence above the list, and the list is read again', async () => {
    let reads = 0
    server.use(
      http.get('*/api/reference/table-codes', () => {
        reads += 1
        return HttpResponse.json(monthEndBody(CODES))
      }),
      monthEndRefusal('TABLE_CODE_UNKNOWN', SET),
    )
    const user = setupUser()
    openPage()

    await screen.findByText('INVENTED LENDER')
    await setTier(user, 904, 'Core C')

    expect(await screen.findByText(`${monthEndExamples.refusals.TABLE_CODE_UNKNOWN.body.message} The list is read again.`))
      .toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(reads).toBe(2))
  })

  it('CORE_TIER_UNKNOWN: the server\'s sentence, in the dialog, which stays', async () => {
    server.use(monthEndRefusal('CORE_TIER_UNKNOWN', SET))
    const user = setupUser()
    openPage()

    await screen.findByText('INVENTED LENDER')
    const dialog = await setTier(user, 904, 'Core C')

    expect(await within(dialog).findByRole('alert'))
      .toHaveTextContent(monthEndExamples.refusals.CORE_TIER_UNKNOWN.body.message)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('a change with no answer is never said to have happened: the dialog says so and stays, and the list is read again', async () => {
    let reads = 0
    server.use(
      http.get('*/api/reference/table-codes', () => {
        reads += 1
        return HttpResponse.json(monthEndBody(CODES))
      }),
      http.put('*/api/reference/table-codes/:code/core-tier', () => HttpResponse.error()),
    )
    const user = setupUser()
    openPage()

    await screen.findByText('INVENTED LENDER')
    const dialog = await setTier(user, 904, 'Core C')

    expect(await within(dialog).findByRole('alert'))
      .toHaveTextContent('The change could not be confirmed. The list is read again: look at it before trying again.')
    await waitFor(() => expect(reads).toBe(2))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('the states', () => {
  it('loading, then no table code on record -- with the list\'s own reason', async () => {
    const held = deferred()
    server.use(http.get('*/api/reference/table-codes', async () => {
      await held.promise
      return HttpResponse.json({ ...monthEndBody(CODES), rows: [], reason: 'NOT_LOADED' })
    }))
    openPage()

    expect(await screen.findByText('Loading…')).toBeInTheDocument()
    held.resolve()
    expect(await screen.findByText('No table code is on record here.')).toBeInTheDocument()
    expect(screen.getByText('Not loaded on this demonstration yet.')).toBeInTheDocument()
  })

  it('a failed read is said, with Try again -- never as no table code', async () => {
    let reads = 0
    server.use(http.get('*/api/reference/core-tiers', () => {
      reads += 1
      return reads === 1
        ? HttpResponse.json({ status: 503, error: 'Service Unavailable', message: 'The server is busy. Try again.' }, { status: 503 })
        : HttpResponse.json(monthEndBody(TIERS))
    }))
    const user = setupUser()
    openPage()

    expect(await screen.findByText('The server is busy. Try again.')).toBeInTheDocument()
    expect(screen.queryByText('No table code is on record here.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('INVENTED LENDER')).toBeInTheDocument()
  })

  it.each([
    ['the tiers', '*/api/reference/core-tiers'],
    ['the table codes', '*/api/reference/table-codes'],
  ])('MV-36: %s in another shape is not available, never an empty list', async (_, path) => {
    server.use(http.get(path, () => HttpResponse.json([])))
    openPage()

    expect(await screen.findByText('The core tiers are not available from this server yet.')).toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('the tiers, the filters and the dialog have no violations (MR-ROB-37)', async () => {
    const user = setupUser()
    const { container } = openPage()

    await screen.findByText('INVENTED LENDER')
    await expectNoA11yViolations(container)
    await user.click(screen.getByRole('button', { name: 'Change the tier of table code 902' }))
    await screen.findByRole('dialog', { name: 'Table code 902' })
    await expectNoA11yViolations(document.body)
  })
})
