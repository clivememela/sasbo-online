// @vitest-environment jsdom -- what was sent, to whom and when: the month's record of deliveries, a page at a time
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import MonthEndSent from './MonthEndSent'
import { PERMISSIONS } from '../../auth/permissions'
import { TestAuthProvider } from '../../test/authTestUtils'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { monthEndAnswer } from '../../test/msw/monthEndExamples'
import { delivery, deliveriesPage } from '../../test/msw/monthEndSendExamples'
import { setupUser } from '../../test/user'

/**
 * WHAT WAS SENT -- `contracts/monthend-api.md` §4. Every download, e-mail and SFTP upload of the month's packs and
 * files, newest first, a page of the server's at a time; a refused or failed attempt on the record with why. Never
 * WhatsApp: download, e-mail and SFTP are the only channels.
 */

let asked
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  asked = []
  server.use(monthEndAnswer('GET /api/month-end/months'))
})

const deliveriesAnswer = (answer) => http.get('*/api/month-end/:month/deliveries', ({ params, request }) => {
  const url = new URL(request.url)
  asked.push(`${params.month} ${url.searchParams.get('page')} ${url.searchParams.get('size')}`)
  return typeof answer === 'function' ? answer(url) : HttpResponse.json(answer)
})

const openPage = ({ permissions = [PERMISSIONS.MONTH_END_SEND] } = {}) =>
  renderWithProviders(<TestAuthProvider permissions={permissions}><MonthEndSent /></TestAuthProvider>,
    { initialEntries: ['/admin/monthly-menu/sent'] })

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

describe('what was sent', () => {
  it('🔒 nobody signed in is asked to sign in, and the record is never asked for', async () => {
    server.use(deliveriesAnswer(deliveriesPage()))
    openPage({ permissions: [] })

    expect(await screen.findByText(/^Sign in to send the month's packs and files\./)).toBeInTheDocument()
    expect(asked).toEqual([])
  })

  it('🔑 each delivery: when, what and to whom, how, what came of it, by whom -- the newest first', async () => {
    server.use(deliveriesAnswer(deliveriesPage([
      delivery(),
      delivery({ id: 88, at: '2026-10-01T06:59:00Z', recipientCode: 'PE', recipientName: 'Port Elizabeth',
        address: null, outcome: 'REFUSED', code: 'RECIPIENT_HAS_NO_ADDRESS' }),
      delivery({ id: 87, at: '2026-10-01T06:50:00Z', kind: 'BANK_FILE', recipientCode: 'ABSA', recipientName: 'Absa',
        channel: 'DOWNLOAD', formats: [], address: null, fileName: 'ABSAFULL_260831.zip', packId: null, fileId: 7 }),
    ])))
    openPage()

    expect(await screen.findByRole('table', { name: 'What was sent for August 2026' })).toBeInTheDocument()
    await screen.findByText('Bank’s file: Absa')
    expect(asked).toEqual(['2026-08 0 50'])
    // The row's own cells -- not the expander a phone opens the secondary columns with.
    const cells = bodyRows().map((row) => within(row).getAllByRole('cell')
      .filter((cell) => !cell.hasAttribute('data-expander')).slice(0, 4).map((cell) => cell.textContent))
    expect(cells).toEqual([
      ['1 October 2026 at 09:02', 'Region’s pack: Johannesburg (first set)', 'E-mailed as PDF and Excel to regional.secretary.jhb@example.org', 'Done'],
      ['1 October 2026 at 08:59', 'Region’s pack: Port Elizabeth', 'E-mailed as PDF and Excel', 'Not sent: no e-mail address is on record for the recipient'],
      ['1 October 2026 at 08:50', 'Bank’s file: Absa', 'Downloaded', 'Done'],
    ])
  })

  it('the server\'s golden answer (MD48): a pack downloaded, read as the server writes it', async () => {
    server.use(monthEndAnswer('GET /api/month-end/{month}/deliveries'))
    openPage()

    await screen.findByText('Region’s pack: Invented North')
    const cells = within(bodyRows()[0]).getAllByRole('cell').filter((cell) => !cell.hasAttribute('data-expander'))
    expect(cells.slice(0, 4).map((cell) => cell.textContent))
      .toEqual(['29 September 2026 at 10:00', 'Region’s pack: Invented North', 'Downloaded as PDF', 'Done'])
  })

  it('nothing sent yet: said as nothing, never as a failure', async () => {
    server.use(deliveriesAnswer(deliveriesPage([])))
    openPage()

    expect(await screen.findByText('Nothing has been sent for August 2026 yet.')).toBeInTheDocument()
  })

  it('a read that failed is said, with Try again -- never as nothing sent', async () => {
    let reads = 0
    server.use(deliveriesAnswer(() => {
      reads += 1
      return reads === 1 ? HttpResponse.json({ status: 500, error: 'Server Error' }, { status: 503 }) : HttpResponse.json(deliveriesPage())
    }))
    const user = setupUser()
    openPage()

    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findAllByText('Region’s pack: Johannesburg (first set)')).toHaveLength(2)
    expect(screen.queryByText('Nothing has been sent for August 2026 yet.')).not.toBeInTheDocument()
  })

  it('a page at a time, as the server pages it', async () => {
    const many = Array.from({ length: 50 }, (_, index) => delivery({ id: 1000 - index }))
    server.use(deliveriesAnswer((url) => HttpResponse.json(url.searchParams.get('page') === '1'
      ? deliveriesPage([delivery({ id: 1, recipientName: 'Pretoria' })], { page: 1, total: 51 })
      : deliveriesPage(many, { total: 51 }))))
    const user = setupUser()
    openPage()

    await screen.findByRole('table', { name: 'What was sent for August 2026' })
    await waitFor(() => expect(bodyRows()).toHaveLength(50))
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText('Region’s pack: Pretoria')).toBeInTheDocument()
    expect(asked).toEqual(['2026-08 0 50', '2026-08 1 50'])
  })
})
