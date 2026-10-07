// @vitest-environment jsdom -- the regions' packs: produced, downloaded and e-mailed, in every state, for who may send them
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

/** Every file handed to the browser to save, kept -- `saveFile` itself is proved in its own file. */
const { saved } = vi.hoisted(() => ({ saved: [] }))
vi.mock('../../lib/saveFile.js', () => ({ default: (file, fallback) => saved.push({ file, fallback }) }))

import MonthEndRegionPacks from './MonthEndRegionPacks'
import { MAIL_OFF, PACKS_UNAVAILABLE } from './monthEndSendRules'
import { PERMISSIONS } from '../../auth/permissions'
import { TestAuthProvider } from '../../test/authTestUtils'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { monthEndAnswer, monthEndExamples, monthEndRefusal } from '../../test/msw/monthEndExamples'
import { SETS, delivery, regionPack, regionPacks } from '../../test/msw/monthEndSendExamples'
import { setupUser } from '../../test/user'
import { deferred } from '../../test/deferred'

/**
 * THE REGIONS' PACKS -- `contracts/monthend-api.md` §2; Stephne, MEN-02, MEN-04, MEN-05, MEN-08.
 *
 * Seven recipients for six regions, Johannesburg twice; each pack produced from the month's newest take, then
 * downloaded or e-mailed -- chosen each month -- as PDF, Excel or both. Every state a person can meet: refused, loading,
 * failed, not available, no month taken, a month not taken, ready. E-mail refused cleanly where the server sends no
 * mail, and downloading untouched. Answered as the contract writes it; every request recorded, so "nothing was asked"
 * is a measurement.
 */

let requests
const record = ({ request }) => {
  requests.push(`${request.method} ${new URL(request.url).pathname}`)
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  saved.length = 0
  requests = []
  server.events.on('request:start', record)
  server.use(monthEndAnswer('GET /api/month-end/months'))
})

afterEach(() => {
  server.events.removeListener('request:start', record)
})

/** The month's packs answered by `answer` -- a body, or a function of the request. */
const packsAnswer = (answer = regionPacks()) =>
  http.get('*/api/month-end/:month/region-packs', (info) =>
    (typeof answer === 'function' ? answer(info) : HttpResponse.json(answer)))

const openPage = ({ permissions = [PERMISSIONS.MONTH_END_SEND], path = '/admin/monthly-menu/region-packs' } = {}) =>
  renderWithProviders(
    <TestAuthProvider permissions={permissions}><MonthEndRegionPacks /></TestAuthProvider>,
    { initialEntries: [path] },
  )

const card = (label) => screen.getByRole('region', { name: label })
const cardFound = (label) => screen.findByRole('region', { name: label })

describe('who may send them', () => {
  it('🔒 nobody signed in is asked to sign in -- and not one request is made for the packs', async () => {
    server.use(packsAnswer())
    openPage({ permissions: [] })

    expect(await screen.findByRole('heading', { level: 1, name: 'The regions’ packs' })).toBeInTheDocument()
    expect(screen.getByText(/^Sign in to send the month's packs and files\./)).toBeInTheDocument()
    await waitFor(() => expect(requests).toContain('GET /api/month-end/months'))
    expect(requests.some((request) => request.includes('/region-packs'))).toBe(false)
  })

  it('🔒 someone signed in without MONTH_END_SEND is told whom to ask, and nothing is asked', async () => {
    server.use(packsAnswer())
    openPage({ permissions: [PERMISSIONS.MEMBERS_VIEW] })

    expect(await screen.findByText(/^You need permission to send the month's packs and files\./)).toBeInTheDocument()
    expect(requests.some((request) => request.includes('/region-packs'))).toBe(false)
  })
})

describe('the states of the list', () => {
  it('loading: said while the packs are read', async () => {
    const held = deferred()
    server.use(packsAnswer(async () => {
      await held.promise
      return HttpResponse.json(regionPacks())
    }))
    const { container } = openPage()

    expect(await screen.findByText('Reading the regions’ packs…')).toBeInTheDocument()
    expect(container.querySelector('[data-send-state="loading"]')).not.toBeNull()
    held.resolve()
    expect(await cardFound('Johannesburg (first set)')).toBeInTheDocument()
  })

  it('failed: said, with Try again -- and read again when asked, never by itself', async () => {
    let asked = 0
    server.use(packsAnswer(() => {
      asked += 1
      return asked === 1
        ? HttpResponse.json({ status: 503, error: 'Service Unavailable' }, { status: 503 })
        : HttpResponse.json(regionPacks())
    }))
    const user = setupUser()
    const { container } = openPage()

    await waitFor(() => expect(container.querySelector('[data-send-state="error"]')).not.toBeNull())
    expect(screen.queryByRole('region', { name: 'Johannesburg (first set)' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await cardFound('Johannesburg (first set)')).toBeInTheDocument()
    expect(asked).toBe(2)
  })

  it('MV-36: an answer of another shape -- the shared fixture\'s [] -- is not available, never an empty list', async () => {
    server.use(packsAnswer([]))
    openPage()

    expect(await screen.findByText('The regions’ packs are not available from this server yet.')).toBeInTheDocument()
    expect(screen.queryByText('No recipient is set up for your part of SASBO.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('no month taken yet: said, with the way to Month end -- and the packs never asked for', async () => {
    server.use(
      http.get('*/api/month-end/months', () => HttpResponse.json({ openMonth: '2026-09', taken: [] })),
      packsAnswer(),
    )
    openPage()

    expect(await screen.findByText('No month has been taken yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Month end' })).toHaveAttribute('href', '/admin/monthly-menu')
    expect(requests.some((request) => request.includes('/region-packs'))).toBe(false)
  })

  it('a month that was not taken: the server\'s refusal, in its own words', async () => {
    server.use(monthEndRefusal('MONTH_NOT_TAKEN', 'GET /api/month-end/{month}/region-packs'))
    openPage({ path: '/admin/monthly-menu/region-packs?month=2026-07' })

    expect(await screen.findByText(monthEndExamples.refusals.MONTH_NOT_TAKEN.body.message)).toBeInTheDocument()
  })

  it('🔴 a server that cannot place members in regions (available: false): every Produce shut, saying why', async () => {
    server.use(packsAnswer({ ...regionPacks(), available: false }))
    openPage()

    const durban = await cardFound('Durban')
    expect(screen.getByText(PACKS_UNAVAILABLE)).toBeInTheDocument()
    const produce = within(durban).getByRole('button', { name: 'Produce the pack' })
    expect(produce).toBeDisabled()
    expect(produce).toHaveAccessibleDescription(PACKS_UNAVAILABLE)
    expect(within(card('Johannesburg (first set)')).getByRole('button', { name: 'Produce again' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Produce the 6 still to produce' })).toHaveAccessibleDescription(PACKS_UNAVAILABLE)
    // The pack made before stays to download.
    expect(within(card('Johannesburg (first set)')).getByRole('button', { name: 'Download PDF' })).toBeEnabled()
  })

  it('areas no recipient covers are said, with their members -- in no region\'s pack until one takes them', async () => {
    server.use(packsAnswer({ ...regionPacks(), uncovered: { areas: ['Q'], members: 12 } }))
    openPage()

    expect(await screen.findByText('Area Q has 12 members on record whom no recipient’s pack covers.')).toBeInTheDocument()
  })

  it('no recipient in the caller\'s part of SASBO: an empty list, said as one', async () => {
    server.use(packsAnswer(regionPacks({ rows: [] })))
    openPage()

    expect(await screen.findByText('No recipient is set up for your part of SASBO.')).toBeInTheDocument()
  })
})

describe('the month\'s packs (MEN-02, MEN-08)', () => {
  it('🔑 seven recipients for six regions -- Johannesburg twice -- each with its areas, position and address', async () => {
    server.use(packsAnswer())
    openPage()

    await cardFound('Johannesburg (first set)')
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(SETS.map((set) => set.label))
    expect(card('Johannesburg (first set)')).toHaveTextContent('Areas A, F, K and X · Regional Secretary · regional.secretary.jhb@example.org')
    expect(card('Johannesburg (second set)')).toHaveTextContent('Areas H, N and P')
    expect(card('Durban')).toHaveTextContent('The whole region')
    expect(card('Port Elizabeth')).toHaveTextContent('No e-mail address on record')
    expect(screen.getByText(/^August 2026, taken on 29 September 2026 at 10:00 by seed\. Each pack holds/)).toBeInTheDocument()
    expect(screen.getByText('3 members have no workplace on record, so are in no region’s pack.')).toBeInTheDocument()
  })

  it('a produced pack says when, by whom and what it counted -- and what was sent; the others are not produced yet', async () => {
    server.use(packsAnswer())
    openPage()

    const jhb = await cardFound('Johannesburg (first set)')
    expect(jhb).toHaveTextContent('Produced on 1 October 2026 at 08:58 by Head Office Administrator (demo.headoffice): 34 joined, 12 left, 5 suspended.')
    expect(within(jhb).getByRole('list', { name: 'What was sent to Johannesburg (first set)' })).toHaveTextContent(
      '1 October 2026 at 09:02: E-mailed as PDF and Excel to regional.secretary.jhb@example.org, by Head Office Administrator (demo.headoffice). Done.')
    expect(card('Durban')).toHaveTextContent('Not produced yet.')
    expect(within(card('Durban')).getByRole('button', { name: 'Produce the pack' })).toBeEnabled()
  })
})

describe('MEN-04 and MEN-05 -- download, e-mail or both, as PDF, Excel or both, chosen each month', () => {
  it('🔴 mail off (as on the demonstration link): said once; E-mail and Both shut, each saying why; downloading untouched', async () => {
    server.use(packsAnswer(regionPacks({ mail: false })))
    openPage()

    const jhb = await cardFound('Johannesburg (first set)')
    expect(screen.getByText(MAIL_OFF)).toBeInTheDocument()
    expect(within(jhb).getByRole('radio', { name: 'Download' })).toBeChecked()
    for (const name of ['E-mail', 'Both']) {
      const radio = within(jhb).getByRole('radio', { name })
      expect(radio).toBeDisabled()
      expect(radio).toHaveAccessibleDescription(MAIL_OFF)
    }
    expect(within(jhb).queryByRole('button', { name: /^E-mail/ })).not.toBeInTheDocument()
    expect(within(jhb).getByRole('button', { name: 'Download PDF' })).toBeEnabled()
    expect(within(jhb).getByRole('button', { name: 'Download Excel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'E-mail the packs' })).toBeDisabled()
  })

  it('mail on: both by default where an address is on record; a recipient with none can only download, and says so', async () => {
    server.use(packsAnswer(regionPacks({ mail: true })))
    openPage()

    const jhb = await cardFound('Johannesburg (first set)')
    expect(screen.queryByText(MAIL_OFF)).not.toBeInTheDocument()
    expect(within(jhb).getByRole('radio', { name: 'Both' })).toBeChecked()
    expect(within(jhb).getByRole('button', { name: 'E-mail PDF and Excel' })).toBeEnabled()
    const pe = card('Port Elizabeth')
    expect(within(pe).getByRole('radio', { name: 'Download' })).toBeChecked()
    expect(within(pe).getByRole('radio', { name: 'Both' })).toHaveAccessibleDescription(
      'No e-mail address is on record for this recipient, so its pack can only be downloaded.')
  })

  it('the choice decides the actions: Download offers the files, E-mail the e-mail -- and the formats decide which', async () => {
    server.use(packsAnswer(regionPacks({ mail: true })))
    const user = setupUser()
    openPage()

    const jhb = await cardFound('Johannesburg (first set)')
    await user.click(within(jhb).getByRole('radio', { name: 'Download' }))
    expect(within(jhb).queryByRole('button', { name: /^E-mail/ })).not.toBeInTheDocument()
    expect(within(jhb).getByRole('button', { name: 'Download PDF' })).toBeInTheDocument()

    await user.click(within(jhb).getByRole('radio', { name: 'E-mail' }))
    expect(within(jhb).queryByRole('button', { name: /^Download/ })).not.toBeInTheDocument()
    await user.click(within(jhb).getByRole('checkbox', { name: 'PDF' }))
    expect(within(jhb).getByRole('button', { name: 'E-mail Excel' })).toBeEnabled()

    // Neither format: said, and the e-mail shut.
    await user.click(within(jhb).getByRole('checkbox', { name: 'Excel' }))
    expect(within(jhb).getByText('Choose PDF, Excel or both.')).toBeInTheDocument()
    expect(within(jhb).getByRole('button', { name: 'E-mail the pack' })).toBeDisabled()
    // Another recipient's choice is its own.
    expect(within(card('Johannesburg (second set)')).getByRole('radio', { name: 'Both' })).toBeChecked()
  })
})

describe('producing a pack', () => {
  it('🔑 one POST for the recipient, said at its card -- and the list read again', async () => {
    const posted = []
    let reads = 0
    server.use(
      packsAnswer(() => {
        reads += 1
        return HttpResponse.json(regionPacks())
      }),
      http.post('*/api/month-end/:month/region-packs/:set', async ({ params, request }) => {
        posted.push({ month: params.month, set: params.set, body: await request.text() })
        return HttpResponse.json(regionPack(SETS[2]), { status: 201 })
      }),
    )
    const user = setupUser()
    openPage()

    const durban = await cardFound('Durban')
    await user.click(within(durban).getByRole('button', { name: 'Produce the pack' }))
    expect(await within(card('Durban')).findByText('The pack is produced.')).toHaveAttribute('role', 'status')
    expect(posted).toEqual([{ month: '2026-08', set: 'DBN', body: '' }])
    await waitFor(() => expect(reads).toBe(2))
  })

  it('🔴 a double press produces nothing twice: the card is shut while its pack is being produced', async () => {
    const held = deferred()
    let posts = 0
    server.use(packsAnswer(), http.post('*/api/month-end/:month/region-packs/:set', async () => {
      posts += 1
      await held.promise
      return HttpResponse.json(regionPack(SETS[2]), { status: 201 })
    }))
    const user = setupUser()
    openPage()

    const button = within(await cardFound('Durban')).getByRole('button', { name: 'Produce the pack' })
    await user.dblClick(button)
    await waitFor(() => expect(button).toBeDisabled())
    held.resolve()
    expect(await within(card('Durban')).findByText('The pack is produced.')).toBeInTheDocument()
    expect(posts).toBe(1)
  })

  it('Produce again asks for a new pack beside the one in hand -- { again: true }', async () => {
    const bodies = []
    server.use(packsAnswer(), http.post('*/api/month-end/:month/region-packs/:set', async ({ request }) => {
      bodies.push(await request.json())
      return HttpResponse.json(regionPack(SETS[3], { id: 42 }), { status: 201 })
    }))
    const user = setupUser()
    openPage()

    const again = within(await cardFound('Johannesburg (first set)')).getByRole('button', { name: 'Produce again' })
    expect(again).toHaveAccessibleDescription('Makes a new pack beside this one, for after the recipient’s areas changed.')
    await user.click(again)
    expect(await within(card('Johannesburg (first set)')).findByText('A new pack is produced, beside the one before.')).toBeInTheDocument()
    expect(bodies).toEqual([{ again: true }])
  })

  it('🔑 Produce every pack: one call a recipient without one, in turn -- a refusal said at its card, and the rest go on', async () => {
    const asked = []
    server.use(packsAnswer(), http.post('*/api/month-end/:month/region-packs/:set', ({ params }) => {
      asked.push(params.set)
      if (params.set === 'CPT') {
        return HttpResponse.json({ status: 409, error: 'Conflict', code: 'RECIPIENT_INACTIVE',
          message: 'That recipient is suspended, so nothing is made for it.' }, { status: 409 })
      }
      return HttpResponse.json(regionPack(SETS.find((set) => set.code === params.set)), { status: 201 })
    }))
    const user = setupUser()
    openPage()

    await cardFound('Johannesburg (first set)')
    await user.click(screen.getByRole('button', { name: 'Produce the 6 still to produce' }))
    await waitFor(() => expect(within(card('Pretoria')).getByText('The pack is produced.')).toBeInTheDocument())
    expect(asked).toEqual(['BLM', 'CPT', 'DBN', 'JHB2', 'PE', 'PTA'])
    expect(within(card('Cape Town')).getByRole('alert')).toHaveTextContent('That recipient is suspended, so nothing is made for it.')
    expect(within(card('Bloemfontein')).getByText('The pack is produced.')).toBeInTheDocument()
  })

  it('a pack whose answer never came is said as unconfirmed -- asking again is safe', async () => {
    server.use(packsAnswer(), http.post('*/api/month-end/:month/region-packs/:set', () => HttpResponse.error()))
    const user = setupUser()
    openPage()

    await user.click(within(await cardFound('Durban')).getByRole('button', { name: 'Produce the pack' }))
    expect(await within(card('Durban')).findByRole('alert')).toHaveTextContent(/^The pack could not be confirmed\./)
  })
})

describe('downloading a pack -- fetched, never linked: the route is held by a permission', () => {
  it('🔑 the chosen format is fetched and handed to the browser under the server\'s name', async () => {
    const asked = []
    server.use(packsAnswer(), http.get('*/api/month-end/region-packs/:id/:format', ({ params }) => {
      asked.push(`${params.id} ${params.format}`)
      return new HttpResponse(new Blob(['%PDF invented']), {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="sasbo-month-end-2026-08-JHB.pdf"' },
      })
    }))
    const user = setupUser()
    openPage()

    const jhb = await cardFound('Johannesburg (first set)')
    expect(within(jhb).queryByRole('link', { name: /Download/ })).not.toBeInTheDocument()
    await user.click(within(jhb).getByRole('button', { name: 'Download PDF' }))
    expect(await within(card('Johannesburg (first set)')).findByText('The PDF file is downloaded.')).toBeInTheDocument()
    expect(asked).toEqual(['41 pdf'])
    expect(saved).toHaveLength(1)
    expect(saved[0].file.filename).toBe('sasbo-month-end-2026-08-JHB.pdf')
    expect(saved[0].fallback).toBe('sasbo-month-end-2026-08-JHB.pdf')
  })

  it('a download the server refused is said, and nothing is saved', async () => {
    server.use(packsAnswer(), http.get('*/api/month-end/region-packs/:id/:format', () => HttpResponse.json(
      { status: 404, error: 'Not Found', code: 'REGION_PACK_NOT_FOUND', message: 'There is no such pack here.' }, { status: 404 })))
    const user = setupUser()
    openPage()

    await user.click(within(await cardFound('Johannesburg (first set)')).getByRole('button', { name: 'Download Excel' }))
    expect(await within(card('Johannesburg (first set)')).findByRole('alert'))
      .toHaveTextContent('The Excel file was not downloaded. There is no such pack here.')
    expect(saved).toEqual([])
  })
})

describe('e-mailing a pack -- refused cleanly where no mail is set up (MEN-04; never WhatsApp)', () => {
  it('🔴 MAIL_NOT_CONFIGURED: the server\'s sentence at the card, e-mail shut for the visit -- and downloading still works', async () => {
    server.use(packsAnswer(regionPacks({ mail: true })), monthEndRefusal('MAIL_NOT_CONFIGURED', 'POST /api/month-end/region-packs/{id}/email'))
    const user = setupUser()
    openPage()

    const jhb = await cardFound('Johannesburg (first set)')
    await user.click(within(jhb).getByRole('button', { name: 'E-mail PDF and Excel' }))
    expect(await within(card('Johannesburg (first set)')).findByRole('alert'))
      .toHaveTextContent(monthEndExamples.refusals.MAIL_NOT_CONFIGURED.body.message)
    expect(screen.getByText(MAIL_OFF)).toBeInTheDocument()
    const now = card('Johannesburg (first set)')
    expect(within(now).getByRole('radio', { name: 'Both' })).toBeDisabled()
    expect(within(now).queryByRole('button', { name: /^E-mail/ })).not.toBeInTheDocument()
    expect(within(now).getByRole('button', { name: 'Download PDF' })).toBeEnabled()
  })

  it('sent: said in the record\'s words at the card, with the formats chosen -- and the list read again', async () => {
    const bodies = []
    let reads = 0
    server.use(
      packsAnswer(() => {
        reads += 1
        return HttpResponse.json(regionPacks({ mail: true }))
      }),
      http.post('*/api/month-end/region-packs/:id/email', async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json(delivery({ id: 91, formats: ['PDF'] }))
      }),
    )
    const user = setupUser()
    openPage()

    const jhb = await cardFound('Johannesburg (first set)')
    await user.click(within(jhb).getByRole('checkbox', { name: 'Excel' }))
    await user.click(within(jhb).getByRole('button', { name: 'E-mail PDF' }))
    expect(await within(card('Johannesburg (first set)')).findByText('E-mailed as PDF to regional.secretary.jhb@example.org.'))
      .toHaveAttribute('role', 'status')
    expect(bodies).toEqual([{ formats: ['PDF'] }])
    await waitFor(() => expect(reads).toBe(2))
  })

  it('an e-mail whose answer never came is said as unconfirmed -- look at what was sent before sending again', async () => {
    server.use(packsAnswer(regionPacks({ mail: true })), http.post('*/api/month-end/region-packs/:id/email', () => HttpResponse.error()))
    const user = setupUser()
    openPage()

    await user.click(within(await cardFound('Johannesburg (first set)')).getByRole('button', { name: 'E-mail PDF and Excel' }))
    expect(await within(card('Johannesburg (first set)')).findByRole('alert'))
      .toHaveTextContent('The e-mail could not be confirmed. Look at what was sent, below, before sending it again.')
  })

  it('E-mail the packs: one call for each choice of formats, each recipient\'s result said at its card', async () => {
    const produced = SETS.map((set) => ({ set, pack: set.email ? regionPack(set, { id: 40 + SETS.indexOf(set) }) : null, deliveries: [] }))
    const calls = []
    server.use(
      packsAnswer(regionPacks({ mail: true, rows: produced })),
      http.post('*/api/month-end/:month/region-packs/send', async ({ request }) => {
        const body = await request.json()
        calls.push(body)
        return HttpResponse.json({ month: '2026-08', results: body.sets.map((code) => (code === 'DBN'
          ? { setCode: code, outcome: 'FAILED', code: 'MAIL_FAILED', message: 'The mail server could not be reached.', delivery: null }
          : { setCode: code, outcome: 'SENT', code: null, message: 'Sent.',
            delivery: delivery({ recipientCode: code, formats: body.formats, address: `regional.secretary.${code.toLowerCase()}@example.org` }) })) })
      }),
    )
    const user = setupUser()
    openPage()

    await cardFound('Johannesburg (first set)')
    await user.click(within(card('Durban')).getByRole('checkbox', { name: 'Excel' }))
    await user.click(screen.getByRole('button', { name: 'E-mail 6 packs' }))
    await waitFor(() => expect(within(card('Pretoria')).getByRole('status')).toHaveTextContent('E-mailed as PDF and Excel to regional.secretary.pta@example.org.'))
    expect(calls).toEqual([
      { sets: ['BLM', 'CPT', 'JHB', 'JHB2', 'PTA'], formats: ['PDF', 'XLSX'] },
      { sets: ['DBN'], formats: ['PDF'] },
    ])
    expect(within(card('Durban')).getByRole('alert')).toHaveTextContent('The mail server could not be reached.')
  })
})
