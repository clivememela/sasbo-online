# The client test suite — what it is, and how to add to it

This is the file to read before adding a test here. It is the client
counterpart of `server/src/test/README.md`.

**Every number below expires. Re-measure; never re-quote.**

## Part 1 — The commands

| | Command | What it is for |
| :-- | :-- | :-- |
| **Everything** | `npm test` | The gate. Shuffled, `retry: 0`, JUnit XML written to `reports/junit.xml` |
| **Inner loop** | `npm run test:fast` | Services, utils, hooks, context and the guards — what you run on save |
| **Screens** | `npm run test:ui` | Pages, the route smoke and the a11y gate. Slower by an order of magnitude |
| **Floor** | `npm run floor` | Runs the suite, then asserts the COUNT **and the exit code**. See Part 4 |
| **Coverage** | `npm run test:coverage` | Thresholds enforced per directory; fails the run if unmet |
| **Bundle** | `npm run build && npm run budget` | Proves the test tooling stayed out of the shipped product |

`npm run build` and `npm run lint` are **not** deepened by any of this. A new
name is opt-in; an existing name is a change to everybody's workflow made
without asking.

## Part 2 — The shape

```
src/test/
  setup.js                 jest-dom, axe matchers, MSW, browser stubs, per-test reset
  renderWithProviders.jsx  MemoryRouter + ThemeProvider; extras are opt-in
  assertions.js            expectErrorState, expectFieldRejected, expectNoA11yViolations
  assertNonVacuousScan.js  the non-vacuity canary, and every floor it guards
  knownDefects.js          the defect register: every row, its reason, disabled() and pin()
  serviceCatalogue.js      every service module and method, DISCOVERED not listed
  user.js                  setupUser() — the one userEvent configuration
  msw/server.js            unhandled request => ERROR, never a warning
  msw/handlers.js          deliberately empty; tests declare their own
  msw/pageFixtures.js      the mount-time calls a page test must answer
  msw/smokeLayer.js        the route smoke's empty-200 layer + endpoint witness
```

Tests are **co-located** beside the unit under test, and split **by concern**
rather than by component — `CaptureMember.roundtrip.test.jsx` names what it
covers, so a red file names the concern.

## Part 3 — The seven rules

1. **Assert behaviour, not implementation.** Query by role, label and visible
   text. A Tailwind refactor must not redden this suite; that is the whole
   reason this layer is cheaper than the browser.
2. **No real network call, ever.** MSW intercepts and an unhandled request is
   an **error**. A silent passthrough is a test that depends on a running
   backend and passes for exactly as long as someone's `bootRun` is up.
3. **The suite supplies its own configuration.** `vite.config.js` sets
   `test.env`; nothing reads `client/.env`. See Part 5.
4. **Every assertion must be capable of failing** — and that is *demonstrated*,
   not assumed. This phase caught one of its own pins asserting a fact that was
   true of the loading render, so it could never fail. It was found by running
   a reddening change, not by reading the test.
5. **A failure message names the consequence, not the mismatch.** Enforced by
   the shared helpers rather than by review.
6. **Nothing is skipped for unreliability.** A skip means a real defect, named
   through `disabled(DEFECTS.X)`, with a live `pin()` beside it.
   `defectPopulation.test.js` asserts the correspondence in both directions.
7. **Fixtures carry no real member data.** Synthetic identity and account
   numbers only — coverage reports and failure output get forwarded.

## Part 4 — What it costs, measured 2026-09-05

| | Tests | Wall clock |
| :-- | :-- | :-- |
| `npm test` | 355 — 334 passing, 21 skipped | **47–58s** |
| `npm run test:fast` | 297 | **16–25s** |
| `npm test --maxWorkers=1` | 355 | 60–74s |

**The ceiling is 120s and the floor is 260 tests**, both set from those figures
with headroom. The floor is a **non-vacuity canary**, not a coverage target: it
sits deliberately below the real count and is never raised to match a new
actual.

> ### The "under 10s" target was not met, and here is the honest number
>
> The plan asked for a suite fast enough to run on save, and said that if the
> honest figure exceeded 10s the fix was to **split the lane** — never to drop
> the box. So: the full suite is ~50s and the inner loop ~20s.
>
> **Where the time goes**, measured rather than guessed: building a jsdom per
> test file was **48% of total wall clock**. The pure files — the SA ID table,
> the source-scanning guards, and the service tests, which need `fetch` but
> never a document — now declare `@vitest-environment node`, and `setup.js`
> guards its DOM-shaped parts so one setup serves both. That alone took the
> suite from **95s to 47s** and the inner loop from 45s to 25s.
>
> What remains is real work: 27 route mounts and ~120 MSW-intercepted calls.
> `npm run test:fast` is the on-save loop; the full gate is a pre-commit one.

## Part 5 — Two traps this suite already fell into

**`client/.env` is committed** and points `VITE_API_BASE_URL` at the deployed
backend. Tests inherited it silently: `api.test.js` first asserted against it
by accident, and — worse — the `@vitest-environment node` files *depended* on
it, because Node's `fetch` refuses a relative URL. Moving `.env` aside failed
**72 tests**. A fresh clone has the file, since it is tracked, so this would
never have surfaced as a CI failure; it would have surfaced the day someone
untracked it. `test.env` in `vite.config.js` fixes it: the suite now passes
with **`.env` and `.env.local` both absent**.

**`vitest-axe@0.1.0` ships an empty `dist/extend-expect.js`.** The documented
`import 'vitest-axe/extend-expect'` registers nothing, silently. The matchers
are registered by hand from `vitest-axe/matchers`, and `harness.test.jsx`
asserts they are present — which is the only reason it was noticed.

## Part 6 — Adding a domain

1. Write the test beside the unit, named for the **concern**.
2. Need responses? `server.use(...)` in the test. Need a page to mount?
   `...pageFixtures` first, then your own handlers, which take precedence.
3. Found a defect? Add a row to `knownDefects.js` with its evidence, land the
   standard-facing test `it.skip(disabled(DEFECTS.X, ...))`, and a live
   `it(pin(DEFECTS.X, ...))` beside it. Both, or `defectPopulation.test.js`
   reddens — and it will tell you which half is missing.
4. Run one reddening change against your new test and watch it fail.
