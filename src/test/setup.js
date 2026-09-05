import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import * as axeMatchers from 'vitest-axe/matchers'

import { server } from './msw/server'

// ---------------------------------------------------------------------------
// The axe matchers, registered by hand -- and why not the documented way
// ---------------------------------------------------------------------------
// vitest-axe's README says `import 'vitest-axe/extend-expect'`. In 0.1.0 that
// entry point resolves to `dist/extend-expect.js`, which is an EMPTY FILE: the
// import succeeds, registers nothing, and `toHaveNoViolations` stays undefined.
// Verified 2026-09-04 by reading the shipped file after `harness.test.jsx`
// asserted the matcher was present and went red.
//
// Recorded because it is this arc's own thesis turned on the arc: a
// registration step whose failure mode is silence. The harness test above is
// the only reason it was noticed at all rather than surfacing later as a
// confusing error inside an accessibility assertion.
expect.extend(axeMatchers)

// ---------------------------------------------------------------------------
// The Google Maps provider
// ---------------------------------------------------------------------------
// `main.jsx` wraps the whole application in `@vis.gl/react-google-maps`'
// `APIProvider`, reading `import.meta.env.VITE_GOOGLE_API_KEY`. That key is
// absent under the CI-readiness proof (`.env.local` moved aside), and the real
// provider talks to Google's script loader regardless. It is stubbed here
// rather than given a value, because a value would make the suite depend on a
// secret and on the network at the same time.
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }) => children,
  useMapsLibrary: () => null,
  useMap: () => null,
  Map: () => null,
  Marker: () => null,
  AdvancedMarker: () => null,
}))

// ---------------------------------------------------------------------------
// Is there a DOM in this file's environment?
// ---------------------------------------------------------------------------
// Most of this suite runs under jsdom. The pure ones -- the SA ID
// specification table, the source-scanning guards, and the service tests,
// which need `fetch` but never a document -- declare
// `@vitest-environment node` instead, because creating a jsdom per file was
// measured at ~half the suite's total wall clock.
//
// This setup file runs in BOTH, so everything DOM-shaped below is guarded. The
// alternative -- a second setup file -- means two places to register a matcher
// and one of them eventually gets forgotten.
const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined'

// ---------------------------------------------------------------------------
// Browser APIs jsdom does not implement
// ---------------------------------------------------------------------------
// ONLY what this codebase actually calls. SASBO has zero `@radix-ui` imports,
// so the pointer-capture stubs other projects need are deliberately absent.
// Anything added here must be justified by a thrown error in a real run, never
// added speculatively -- a stub nobody needs is a stub that hides a regression.
if (hasDom && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

if (hasDom && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// ---------------------------------------------------------------------------
// The network
// ---------------------------------------------------------------------------
beforeAll(() => {
  // 'error', not 'warn'. See src/test/msw/server.js.
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()

  // Steerable state. The suite is SHUFFLED, so any of these left set by one
  // test is a defect that only reproduces on some seeds -- which is the exact
  // shape of the flakes this arc refuses to tolerate.
  if (hasDom) {
    cleanup()
    localStorage.clear()
    sessionStorage.clear()
    document.documentElement.classList.remove('dark')
  }

  vi.useRealTimers()
  vi.restoreAllMocks()
})

afterAll(() => {
  server.close()
})
