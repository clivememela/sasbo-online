import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'

import { server } from './msw/server'

// ---------------------------------------------------------------------------
// Is there a DOM in this file's environment?
// ---------------------------------------------------------------------------
// Declared FIRST, because it decides what gets imported at all. `node` is the
// default: a file that renders something declares `@vitest-environment jsdom`
// and says what it renders, while the pure ones (the SA ID specification table,
// the source-scanning guards, and the service tests, which need `fetch` but
// never a document) declare nothing and get no jsdom built for them.
//
// ⚠️ THE DEFAULT USED TO BE THE OTHER WAY ROUND and this comment described that
// arrangement. See `vite.config.js` for why it was inverted and for the
// measurement -- building a jsdom per file was ~half the suite's wall clock,
// and the inversion is worth ~40% of it.
//
// This setup file runs in BOTH. The alternative -- a second setup file --
// means two places to register a matcher and one of them eventually gets
// forgotten, so everything DOM-shaped stays here and is guarded.
const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined'

// ---------------------------------------------------------------------------
// The DOM-only libraries, imported ONLY where there is a DOM
// ---------------------------------------------------------------------------
// `@testing-library/react` and `@testing-library/jest-dom/vitest` were static
// imports, so every DOM-less file paid to evaluate both and could never use
// either: `cleanup` is already behind `hasDom` below, and the jest-dom matchers
// are unreachable without a document.
//
// ⚠️ NO COUNT HERE, DELIBERATELY. This said "the seven `@vitest-environment
// node` files" and the number was TEN by the time anyone read it again -- a
// count of a population that grows with the suite, written into a comment that
// nothing checks. The population is whatever half of the suite needs no DOM;
// `vite.config.js` holds the one statement of how that is decided.
//
// The cost that matters is not the wall clock, it is the RESIDENT SET. Each
// worker carries whatever its setup file pulled in, and this repository's
// recorded failure (F11) is six Vitest workers failing to START on a
// memory-pressured box -- 62 tests that never ran, reported as "336 tests, 6
// failed" against a true 398.
//
// Vitest setup files support top-level await, so this is a conditional import
// rather than a second setup file.
let cleanup = () => {}

if (hasDom) {
  await import('@testing-library/jest-dom/vitest')
  ;({ cleanup } = await import('@testing-library/react'))
}

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
//
// 🔴 AND IT IS WHY `vitest-axe` IS PINNED EXACTLY IN package.json -- the one
// dependency here without a caret. `^0.1.0` admits 0.1.x patches, and a patch
// could change the very entry point this hazard is about. package.json cannot
// carry a comment, so the reason lives here, beside the workaround it protects.
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
