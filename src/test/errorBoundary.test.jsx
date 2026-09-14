// @vitest-environment jsdom -- renders a component that throws, inside a boundary
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import App from '../App'
import { ThemeProvider } from '../context/ThemeContext'
import { server } from './msw/server'
import { smokeHandlers } from './msw/smokeLayer'
import { DEFECTS, disabled, pin } from './knownDefects'

/**
 * A FAILED RENDER. The state nothing in this application covers.
 *
 * The three-state rule -- loading, empty, failed -- is about a failed FETCH.
 * Nothing anywhere covers a failed RENDER, and the two have completely
 * different blast radii: a failed fetch spoils one panel, while an uncaught
 * render error unmounts the entire React tree. The user gets a white page.
 * No message, no navigation, no way back, and nothing in the console that a
 * non-developer would ever see.
 *
 * Verified across `client/src`: there is no `ErrorBoundary`, no
 * `componentDidCatch`, and no router `errorElement` anywhere (register A11).
 * So this is true of every route in the application, and any one of the
 * components on any one of them can trigger it.
 *
 * These tests use a component that throws ON PURPOSE. React logs the error to
 * `console.error` regardless of whether it is caught, so that is silenced
 * here -- otherwise a deliberate, expected throw prints a red stack trace on
 * every green run, which is how people learn to ignore red stack traces.
 */

/** A component that fails the way a real one does: while rendering. */
const Exploding = () => {
  throw new Error('a component failed while rendering')
}

const Shell = ({ children }) => (
  <MemoryRouter initialEntries={['/home']}>
    <ThemeProvider>
      <header>
        <h1>SASBO</h1>
        <nav aria-label="Main">
          <a href="/members">Members</a>
        </nav>
      </header>
      <main>{children}</main>
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
  it.skip(
    disabled(DEFECTS.A11, 'the shell must survive, and offer a way to recover'),
    () => {
      // Written to the standard. A boundary around the page content means one
      // broken panel is a broken panel: the header and navigation stay usable,
      // the user is told something went wrong, and there is an affordance that
      // gets them moving again.
      render(
        <Shell>
          <Exploding />
        </Shell>,
      )

      expect(screen.getByRole('heading', { name: 'SASBO' })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /try again|reload|go back|home/i }),
      ).toBeInTheDocument()
    },
  )

  it(pin(DEFECTS.A11, 'one throwing component still takes the entire tree with it'), () => {
    // The defect executed. Not "an error was logged" -- the whole render
    // fails, which is why the user sees a blank page rather than a broken
    // panel.
    expect(
      () =>
        render(
          <Shell>
            <Exploding />
          </Shell>,
        ),
      'A11 has been fixed -- a throwing component no longer brings down the render. ' +
        'Delete this pin, un-skip the test above, and close the row.',
    ).toThrow('a component failed while rendering')
  })

  it('takes the SHELL down with it, not just the panel that failed', () => {
    // The consequence, made concrete. The header and navigation are siblings
    // of the failure and have nothing to do with it -- and they are gone too.
    let container
    try {
      ;({ container } = render(
        <Shell>
          <Exploding />
        </Shell>,
      ))
    } catch {
      // Expected: this is the defect.
    }

    expect(
      screen.queryByRole('heading', { name: 'SASBO' }),
      'The shell survived a render failure, which means a boundary now exists. Check A11.',
    ).toBeNull()

    // React unmounted everything it had already committed, so the mount point
    // is not merely missing the failed panel -- it is EMPTY.
    expect(container?.innerHTML ?? '').toBe('')
  })

  it('leaves NOTHING on screen -- no message, and no way back', () => {
    try {
      render(
        <Shell>
          <Exploding />
        </Shell>,
      )
    } catch {
      // Expected.
    }

    // This is what the member or administrator actually experiences. Asserted
    // so that the register row is evidence rather than description.
    expect(document.body.textContent.trim()).toBe('')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('the application has no boundary of any kind', () => {
  it('declares no ErrorBoundary, componentDidCatch or errorElement anywhere', () => {
    // The static half of A11, scanned rather than asserted from memory. It is
    // what turns this row green the day someone adds a boundary, even if they
    // never look at the tests above.
    // Scoped to APPLICATION source on purpose. A first draft globbed
    // `../**/*.{js,jsx}` and matched `knownDefects.js` -- this suite's own
    // register, which contains the string "ErrorBoundary" inside the A11
    // description. The guard reported the defect as FIXED because of the text
    // describing the defect.
    //
    // That is the self-matching trap the plans warn about: a scan whose
    // fixture and whose subject read from one source can never fail. The
    // directories below are the application's own, and the non-vacuity floor
    // beneath them is what keeps the narrowing honest.
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

    const withBoundary = appSources.filter(([, src]) =>
      /ErrorBoundary|componentDidCatch|getDerivedStateFromError|errorElement/.test(src),
    )

    expect(
      withBoundary.map(([p]) => p),
      'An error boundary now exists in the client. That is A11 being fixed -- un-skip ' +
        'the test above, delete the pins, and close the row.',
    ).toEqual([])
  })

  it('and every route is therefore exposed to it', () => {
    // Ties the static finding to its scope: this is not one risky page.
    const appSource = Object.values(
      import.meta.glob('../App.jsx', { query: '?raw', import: 'default', eager: true }),
    )[0]
    const routeCount = [...appSource.matchAll(/path="/g)].length
    expect(routeCount).toBeGreaterThan(20)
  })
})
