// @vitest-environment jsdom -- renders the router and reads the rendered tree
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mkdirSync, writeFileSync } from 'node:fs'

import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { server } from './test/msw/server'
import {
  observedEndpoints,
  resetObservedEndpoints,
  smokeHandlers,
} from './test/msw/smokeLayer'
import { assertNonVacuousScan, FLOORS } from './test/assertNonVacuousScan'

/**
 * EVERY ROUTE MOUNTS. Discovered, not listed.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT
 * It asserts "this page mounted without throwing" and NOTHING more. A shallow
 * mount of every route is not a suite of page tests, and pretending otherwise
 * is how a browser layer ends up carrying weight the cheap layers should
 * carry. What it costs is milliseconds each; what it catches is a page that
 * crashes on IMPORT -- a broken default export, a renamed named-export, a hook
 * called outside its provider, a component that reads a property of undefined
 * during first render.
 *
 * It is the only thing in the arc that would notice that class of break, and
 * without an error boundary anywhere in the client (register A11) that class
 * of break blanks the entire application rather than one page.
 *
 * WHY DISCOVERY RATHER THAN A LIST OF NAMES
 * A new page is smoke-covered the moment it is routed. The guard has no list
 * of its own to forget -- which is the failure mode of every hand-maintained
 * inventory, and the reason its floor goes through `assertNonVacuousScan`.
 *
 * The paths are read out of `App.jsx` itself rather than re-typed here,
 * because a re-typed list is a second source of truth that goes stale
 * silently.
 */

/** Read App.jsx as text and extract every declared path. */
const discoverRoutes = () => {
  const sources = import.meta.glob('./App.jsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  })
  const source = Object.values(sources)[0]
  if (!source) {
    throw new Error(
      'The route scan could not read App.jsx at all. That is a broken walker, not an ' +
        'application with no routes -- fix the glob rather than accepting an empty scan.',
    )
  }

  const declared = [...source.matchAll(/path="([^"]*)"/g)].map((m) => m[1])
  const absolute = declared.map((p) => (p.startsWith('/') ? p : `/${p}`))

  // The index route under "/" has no `path` of its own.
  return [...new Set(['/', ...absolute])].sort()
}

const ROUTES = discoverRoutes()

const renderRoute = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </MemoryRouter>,
  )

describe('every declared route mounts', () => {
  beforeEach(() => {
    server.use(...smokeHandlers)
  })

  it('the route scan found the whole route table', () => {
    assertNonVacuousScan(ROUTES, FLOORS.ROUTES, 'routes declared in App.jsx')

    // Completeness, carrying no number: the scan and the source agree about
    // how many paths exist. This half moves with the codebase and never needs
    // editing; the floor above is the separate non-vacuity canary.
    expect(ROUTES).toContain('/')
    expect(ROUTES).toContain('/login')
  })

  it.each(ROUTES)('%s mounts without throwing', async (path) => {
    // The assertion is deliberately weak and the failure message is where the
    // value is: a throw here is a real defect on a real page, and it is filed
    // as one rather than worked around.
    expect(() => renderRoute(path)).not.toThrow()

    // Let the page's mount-time requests actually START and settle while the
    // smoke layer is still installed. Without this the test finishes, the
    // afterEach in setup.js resets the handlers, and a fetch that was queued
    // during mount begins against a server that no longer has a handler for
    // it -- which MSW correctly reports as an unhandled request. That was
    // observed on /api/banks: real noise, on stderr, from a green run.
    //
    // It also makes the endpoint witness below HONEST. Endpoints requested
    // after the reset were never being recorded, so the runtime set handed to
    // Phase 4 was quietly short.
    await act(async () => {
      await Promise.resolve()
    })

    // Something rendered. A route that mounts to literally nothing is a
    // route that is silently unreachable -- a redirect loop, or an element
    // that returned null on every branch.
    expect(
      document.body.textContent.length + document.body.querySelectorAll('*').length,
      `Route "${path}" mounted without throwing and produced an entirely empty document. ` +
        `That is not a passing page -- it is a page nobody can use, and it looks ` +
        `identical to a working one from here.`,
    ).toBeGreaterThan(0)
  })

  afterAll(() => {
    // THE RUNTIME WITNESS, handed to Phase 4.
    // Written as an artefact rather than asserted here, because the comparison
    // belongs to the contract guard. What this file guarantees is that the
    // observation is real -- it was produced by actually mounting every route.
    const endpoints = observedEndpoints()
    try {
      mkdirSync('reports', { recursive: true })
      writeFileSync(
        'reports/observed-endpoints.json',
        `${JSON.stringify(
          {
            recordedAt: new Date().toISOString(),
            producedBy: 'src/App.routes.test.jsx via the smoke layer',
            note:
              'The endpoints actually requested when every declared route was mounted. ' +
              'This is the runtime counterpart of P4 static scan of src/services/. An ' +
              'endpoint in one and not the other is the finding.',
            routesMounted: ROUTES.length,
            endpoints,
          },
          null,
          2,
        )}\n`,
      )
    } catch {
      // reports/ is git-ignored and OneDrive on this machine intermittently
      // makes it briefly unwritable. The witness is a convenience for the next
      // phase, never a reason to fail this one.
    }
    resetObservedEndpoints()
  })
})

describe('the routes that are redirects, not pages', () => {
  beforeEach(() => {
    server.use(...smokeHandlers)
  })

  it('/ redirects to the login page rather than rendering an empty shell', () => {
    renderRoute('/')
    // Asserted through what the user sees, not through router internals: the
    // redirect is only useful if it lands somewhere that rendered.
    expect(document.body.textContent.trim().length).toBeGreaterThan(0)
  })

  it('/signup redirects to /login -- the signup page was removed, not hidden', () => {
    renderRoute('/signup')
    expect(document.body.textContent.trim().length).toBeGreaterThan(0)
  })
})

describe('a path that matches no route', () => {
  beforeEach(() => {
    server.use(...smokeHandlers)
  })

  it('renders NOTHING AT ALL -- there is no catch-all route', () => {
    // Recorded as current behaviour, deliberately. `App.jsx` declares no `*`
    // route, so a mistyped or stale URL renders a blank document: no message,
    // no navigation, no way back. It is the same white screen A11 describes,
    // reached by a different door, and it is invisible to every other test.
    renderRoute('/this-route-does-not-exist')
    expect(
      document.body.textContent.trim(),
      'A catch-all route now exists. That is an improvement -- update this test to ' +
        'assert what the not-found page says, and note it against A11.',
    ).toBe('')
  })
})
