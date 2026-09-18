// @vitest-environment jsdom -- the real shell and the real boundary, with one route that throws while rendering
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'

import App from '../App'
import { renderWithProviders } from './renderWithProviders'
import { server } from './msw/server'
import { smokeHandlers } from './msw/smokeLayer'
import { setupUser } from './user'

/**
 * 🔑 THE ROUTE'S MODULE IS IMPORTED HERE, AND THAT IS AN ANTI-FLAKE FIX RATHER THAN AN UNUSED IMPORT.
 *
 * `App` loads every page with `lazy(() => import(...))`. The assertions below wait for Home to RENDER, so
 * without this they wait for a dynamic import -- and how long that takes depends on how busy the machine is.
 * Measured: green in isolation, red inside the full suite on a box down to 227 MB free. Importing the module
 * here puts it in the registry before the test runs, so `lazy` resolves on the next microtask and the result
 * stops depending on load. Same rule as `setupUser`'s `delay: null`: fix the wall-clock dependence, never the
 * threshold.
 */
import '../pages/Home.jsx'

/**
 * 🔴 R1-F1 (P9's independent review): AFTER ONE PAGE THREW, THE ERROR PAGE STAYED ON EVERY ROUTE.
 *
 * `Main.jsx` and `AuthLayout.jsx` render `<ErrorBoundary>` with no key, and the boundary renders its fallback
 * whenever `state.error` is set, whatever `children` now are. Nothing cleared it on a location change. So the
 * fallback's own advice -- *"you can carry on somewhere else"* -- did nothing: every rail entry led back to the same
 * page, and the only ways out were its own button or a full reload. The shell survived, as A11 requires, and moving
 * on from the failure did not.
 *
 * Driven through the real `App`, because the defect is in WHERE THE BOUNDARY SITS, not in the boundary: a test that
 * rendered its own `<ErrorBoundary>` around its own routes would assert the test's arrangement and pass either way.
 *
 * 🔑 THE THROW IS MOCKED AT ONE ROUTE MODULE, deliberately: the boundary's contract is about ANY route that throws
 * while rendering, and A37 (the live, pinned way to cause one) is a defect this arc must leave standing.
 */

vi.mock('../pages/reports/Locations.jsx', () => ({
  Locations: () => {
    throw new Error('a route failed while rendering')
  },
}))

describe('the error boundary, after a route has thrown', () => {
  beforeEach(() => {
    // React logs a render error before the boundary catches it; the log is not the assertion.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(...smokeHandlers)
  })

  it('a rail link leaves the failed page behind', async () => {
    const user = setupUser()
    renderWithProviders(<App />, { initialEntries: ['/reports/locations'] })
    expect(await screen.findByText('This page could not be displayed.')).toBeInTheDocument()

    const rail = within(screen.getByRole('navigation', { name: 'Main' }))
    await user.click(rail.getByRole('link', { name: /^Home/ }))

    expect(await screen.findByRole('heading', { level: 1, name: /welcome to sasbo online/i })).toBeInTheDocument()
    expect(screen.queryByText('This page could not be displayed.')).not.toBeInTheDocument()
  })

  it('the must-pass: while it is the page you are on, the failure is still shown -- inside a shell you can leave by', async () => {
    renderWithProviders(<App />, { initialEntries: ['/reports/locations'] })

    expect(await screen.findByText('This page could not be displayed.')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })
})
