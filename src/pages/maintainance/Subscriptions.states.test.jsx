// @vitest-environment jsdom -- Subscriptions: its first frame, a failed save, and a bank list that did not load
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'

import Subscriptions from './Subscriptions'
import { ThemeProvider } from '../../context/ThemeContext'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { setupUser } from '../../test/user'

/**
 * THREE STATES THIS SCREEN STATED WITHOUT CHECKING. `06.4`.
 *
 *   ① its first frame said "No subscriptions match your search." -- `loading` started false;
 *   ② a failed SAVE replaced the whole list with "We could not load the subscriptions.";
 *   ③ a bank list that failed was a sentence on the sheet, while the Bank field itself read as a
 *     filter with nothing in it.
 *
 * Each is paired with its must-pass, because each has an obvious wrong fix that satisfies it alone:
 * a screen that never shows its empty state, a save that never closes its row, a field that always
 * says it failed.
 */

const SUB = {
  id: 3,
  bankName: 'Synthetic Bank',
  acbDebitDay: 25,
  subscriptionAmount: 100,
  isCoreBanking: false,
  status: 'ACTIVE',
  registrationDate: '2026-01-15',
}
const EMPTY = /No subscriptions match your search/i
const boom = () => HttpResponse.json({ status: 500, error: 'boom' }, { status: 500 })

async function saveTheRow() {
  const user = setupUser()
  renderWithProviders(<Subscriptions />)
  await user.click(await screen.findByRole('button', { name: 'Edit the subscription for Synthetic Bank' }))
  await user.click(screen.getByRole('button', { name: 'Save changes to Synthetic Bank' }))
}

describe('Subscriptions', () => {
  beforeEach(() => {
    // Failures are reported through the sink as well as shown.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(http.get('*/api/banks', () => HttpResponse.json([{ name: 'Synthetic Bank' }])))
  })

  describe('① the first frame', () => {
    it('is not "No subscriptions match" -- nothing has been asked yet', () => {
      // 🔑 SERVER-RENDERED ON PURPOSE. The defect lives in the frame BEFORE the mount effect, and a
      // testing-library render runs inside act(), which flushes that effect before any query can look.
      // Server rendering runs no effects at all, so it is exactly that frame.
      const html = renderToString(
        <MemoryRouter>
          <ThemeProvider>
            <Subscriptions />
          </ThemeProvider>
        </MemoryRouter>,
      )

      expect(html).not.toMatch(EMPTY)
      expect(html).toMatch(/Retrieving subscriptions/)
    })

    it('the must-pass: a list that genuinely is empty still says so', async () => {
      server.use(http.get('*/api/subscriptions', () => HttpResponse.json([])))
      renderWithProviders(<Subscriptions />)

      expect(await screen.findByText(EMPTY)).toBeInTheDocument()
    })
  })

  describe('② a failed save', () => {
    it('keeps the list and says the change was not saved -- it is not a failed load', async () => {
      server.use(http.get('*/api/subscriptions', () => HttpResponse.json([SUB])), http.put('*/api/subscriptions/:id', boom))
      await saveTheRow()

      expect(await screen.findByText('The changes to Synthetic Bank were not saved.')).toBeInTheDocument()
      expect(screen.queryByText('We could not load the subscriptions.')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save changes to Synthetic Bank' })).toBeInTheDocument()
    })

    it('the must-pass: a save that works closes the row and says nothing went wrong', async () => {
      server.use(
        http.get('*/api/subscriptions', () => HttpResponse.json([SUB])),
        http.put('*/api/subscriptions/:id', async ({ request }) => HttpResponse.json(await request.json())),
      )
      await saveTheRow()

      expect(await screen.findByRole('button', { name: 'Edit the subscription for Synthetic Bank' })).toBeInTheDocument()
      expect(screen.queryByText(/were not saved/i)).not.toBeInTheDocument()
    })
  })

  describe('③ the bank list', () => {
    it('that did not load says so AT the Bank field, with a retry', async () => {
      server.use(http.get('*/api/subscriptions', () => HttpResponse.json([SUB])), http.get('*/api/banks', boom))
      renderWithProviders(<Subscriptions />)

      expect(await screen.findByText('Bank could not be loaded.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('the must-pass: a bank list that loaded says nothing of the kind', async () => {
      server.use(http.get('*/api/subscriptions', () => HttpResponse.json([SUB])))
      renderWithProviders(<Subscriptions />)

      await screen.findByRole('button', { name: 'Edit the subscription for Synthetic Bank' })
      expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument()
    })
  })
})
