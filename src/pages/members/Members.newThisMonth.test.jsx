// @vitest-environment jsdom -- the register's "New this month" figure, read against a fixed calendar
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import MembersPage from './Members'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'

/**
 * 🗣️ SASBO, 18 Sep 2026: "dashboard to capture total number of new debit orders captured for the month", and "new
 * members captured". The figure is the month's joiners -- Date Joined in this calendar month -- and its second line is
 * how many of them pay by debit order.
 *
 * The fixture is built so that every wrong reading gives a different number: last month, the same month LAST YEAR, no
 * date at all, and the legacy "Payroll" spelling are all in it, and the total differs from both counts, so a strip that
 * printed the wrong figure in the right place cannot pass.
 *
 * ⏱️ `Date` alone is faked, pinned to 18 Sep 2026 -- the page's timers, the request mocks and Testing Library's
 * waiting all run on the real clock, so nothing here waits on a fake one.
 */
const member = (id, joinDate, paymentType) => ({
  id, membershipNumber: `M000${id}`, firstNames: 'Synthetic', surname: `Member${id}`, identityNumber: '9001010000080',
  status: 'Active', joinDate, paymentType,
})

const MEMBERS = [
  member(1, [2026, 9, 3], 'Debit Order'),          // new, by debit order
  member(2, [2026, 9, 17], 'Payroll Deduction'),   // new, payroll
  member(3, [2026, 9, 1], 'Payroll'),              // new, the LEGACY payroll spelling -- not a debit order
  member(4, [2026, 8, 31], 'Debit Order'),         // last month
  member(5, [2025, 9, 10], 'Debit Order'),         // this month, LAST YEAR
  member(6, null, 'Debit Order'),                  // no date on file
]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 8, 18, 10, 0, 0) })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
})

/** The figure's term and its readings, as a screen reader meets them. */
const figure = (label) => {
  const term = within(screen.getByTestId('figure-strip')).getByText(label)
  return term.closest('div')
}

describe('the register\'s New this month figure', () => {
  it('🗣️ counts the members who joined this calendar month, and how many of them pay by debit order', async () => {
    server.use(http.get('*/api/members', () => HttpResponse.json(MEMBERS)), ...pageFixtures)
    renderWithProviders(<MembersPage />)
    await screen.findAllByText(/Member1\b/)

    // The figure's readings, in order: the count, then its make-up. Read whole, so 3 cannot pass as part of 31.
    const readings = (label) => within(figure(label)).getAllByRole('definition').map((dd) => dd.textContent)
    expect(readings('New this month')).toEqual(['3', '1 by debit order'])

    // The must-pass: the same strip still reads the whole register, so the month's figure is not the total.
    expect(readings('Total')).toEqual(['6'])
  })

  it('🔴 prints neither number while the register cannot be reached -- a figure nobody read is not a zero (A47, K1)', async () => {
    server.use(http.get('*/api/members', () => HttpResponse.json({ status: 500 }, { status: 500 })), ...pageFixtures)
    renderWithProviders(<MembersPage />)
    await screen.findByRole('alert')

    const newThisMonth = figure('New this month')
    expect(within(newThisMonth).getByText('not available')).toBeInTheDocument()
    expect(newThisMonth).not.toHaveTextContent(/\d/)
  })
})
