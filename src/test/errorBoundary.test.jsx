// @vitest-environment jsdom -- renders a component that throws, inside a boundary
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import ErrorBoundary from '../components/common/ErrorBoundary'
import { ThemeProvider } from '../context/ThemeContext'
import { server } from './msw/server'
import { smokeHandlers } from './msw/smokeLayer'

/**
 * A FAILED RENDER. ✅ **A11 IS CLOSED — this file is now the regression pair.**
 *
 * The three-state rule -- loading, empty, failed -- is about a failed FETCH. Nothing
 * covered a failed RENDER, and the two have completely different blast radii: a failed
 * fetch spoils one panel, while an uncaught render error unmounts the entire React tree.
 * The user got a white page. No message, no navigation, no way back, and nothing in the
 * console a non-developer would ever see.
 *
 * 🔑 WHAT CHANGED, AND WHY THE PINS ARE GONE RATHER THAN REPAIRED. `03.1` shipped
 * `ErrorBoundary` (R-ROB-A) -- earlier than the plan's `03.2b`, because `03.1` is the
 * unit that made every route `lazy()`, and a chunk that fails to load throws during
 * render on an otherwise healthy application. Adding the boundary turned the pins red,
 * which is the register's mechanism working: their message said "un-skip the test above,
 * delete the pins, and close the row", and that is what happened. The skipped
 * standard-facing test below is now the live one. **A pin is flipped, never repaired**
 * (BR-5) -- "repairing" these would have meant deleting the boundary.
 *
 * ⚠️ WHAT IS NOT CLOSED. `06.1` owns the DESIGNED failed state. This asserts the
 * contract -- the shell survives, something is said, there is a way back -- and not how
 * it looks.
 *
 * These tests use a component that throws ON PURPOSE. React logs the error to
 * `console.error` regardless of whether it is caught, so that is silenced here --
 * otherwise a deliberate, expected throw prints a red stack trace on every green run,
 * which is how people learn to ignore red stack traces.
 */

/** A component that fails the way a real one does: while rendering. */
const Exploding = () => {
  throw new Error('a component failed while rendering')
}

/**
 * The shell, with the boundary where the application puts it: around the page content,
 * INSIDE the header and navigation. That placement is the assertion -- a boundary
 * wrapped around the router would catch the same throw and still blank the shell.
 */
const Shell = ({ children }) => (
  <MemoryRouter initialEntries={['/home']}>
    <ThemeProvider>
      <header>
        <h1>SASBO</h1>
        <nav aria-label="Main">
          <a href="/members">Members</a>
        </nav>
      </header>
      <main>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </ThemeProvider>
  </MemoryRouter>
)

beforeEach(() => {
  server.use(...smokeHandlers)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('when a component throws while rendering', () => {
  it('the shell survives, and offers a way to recover', () => {
    render(
      <Shell>
        <Exploding />
      </Shell>,
    )

    // One broken panel is a broken panel: the header and navigation are siblings of
    // the failure and have nothing to do with it.
    expect(screen.getByRole('heading', { name: 'SASBO' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()

    // The user is TOLD, rather than left looking at a gap.
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // And there is an affordance that gets them moving again. A boundary with no exit
    // is a white page with text on it.
    expect(
      screen.getByRole('button', { name: /try again|reload|go back|home/i }),
    ).toBeInTheDocument()
  })

  it('does not let the throw escape the render', () => {
    // The inverse of the old pin, which asserted this DID throw. Kept as the direct
    // regression: if the boundary is removed or moved above the shell, this reddens.
    expect(() =>
      render(
        <Shell>
          <Exploding />
        </Shell>,
      ),
    ).not.toThrow()
  })

  it('contains the failure to the panel, leaving the rest of the document intact', () => {
    const { container } = render(
      <Shell>
        <Exploding />
      </Shell>,
    )

    // Before the fix this was empty -- React unmounted everything it had committed.
    expect(container.innerHTML).not.toBe('')
    expect(document.body.textContent.trim()).not.toBe('')
  })

  /**
   * 🔴 PROVE THE BOUNDARY BY REMOVING IT. Every assertion above passes if the boundary
   * works AND if `Exploding` quietly stopped throwing. The second is the failure mode
   * that would make this whole file decorative, so it is ruled out directly.
   */
  it('and the component under test really does throw without one', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <ThemeProvider>
            <Exploding />
          </ThemeProvider>
        </MemoryRouter>,
      ),
    ).toThrow('a component failed while rendering')
  })
})

describe('the application declares a boundary, and it is reachable from every route', () => {
  it('declares an ErrorBoundary in application source', () => {
    // The static half, scanned rather than asserted from memory -- the mirror of the
    // scan that used to assert the opposite.
    //
    // Scoped to APPLICATION source on purpose. A first draft globbed
    // `../**/*.{js,jsx}` and matched `knownDefects.js` -- this suite's own register,
    // which contains the string "ErrorBoundary" inside the A11 description. The guard
    // reported the defect as FIXED because of the text describing the defect. That is
    // the self-matching trap: a scan whose fixture and whose subject read from one
    // source can never fail.
    const sources = import.meta.glob(
      [
        '../App.jsx',
        '../main.jsx',
        '../components/**/*.{js,jsx}',
        '../pages/**/*.{js,jsx}',
        '../layouts/**/*.{js,jsx}',
        '../context/**/*.{js,jsx}',
        '../hooks/**/*.{js,jsx}',
        '../services/**/*.{js,jsx}',
        '../config/**/*.{js,jsx}',
        '../utils/**/*.{js,jsx}',
      ],
      { query: '?raw', import: 'default', eager: true },
    )

    const appSources = Object.entries(sources).filter(([path]) => !path.includes('.test.'))

    expect(
      appSources.length,
      'The boundary scan read no application source at all -- a broken walker, not an ' +
        'application with no files.',
    ).toBeGreaterThan(40)

    const declaring = appSources.filter(([, src]) =>
      /getDerivedStateFromError|componentDidCatch/.test(src),
    )

    expect(
      declaring.map(([p]) => p),
      'The application no longer declares an error boundary anywhere. A11 has regressed ' +
        'and every route is a white page away from an uncaught render error.',
    ).not.toEqual([])
  })

  it('and both layouts mount one around their outlet, so no route is exposed', () => {
    // Placement, not merely existence. A boundary that exists in a file nothing renders
    // is the same as no boundary -- and the layouts are what every route renders through.
    const layouts = import.meta.glob(
      ['../components/Main.jsx', '../layouts/AuthLayout.jsx'],
      { query: '?raw', import: 'default', eager: true },
    )

    const entries = Object.entries(layouts)
    expect(entries.length, 'both layouts must be readable').toBe(2)

    for (const [path, src] of entries) {
      expect(src, `${path} renders an <Outlet> with no <ErrorBoundary> around it`)
        .toMatch(/<ErrorBoundary>/)
      expect(src, `${path} renders an <Outlet> with no <Suspense> around it`)
        .toMatch(/<Suspense/)
    }
  })
})
