/**
 * The floors, in one place, each measured through its own guard's discovery.
 *
 * WHY THIS IS ITS OWN MODULE, and not part of `assertNonVacuousScan.js`
 * That file imports `expect` from `vitest`, so anything importing it must run
 * inside the test runner. Three of this repository's guards do NOT --
 * `scripts/suite-floor.mjs`, `scripts/contract-witness.mjs` and
 * `scripts/bundle-budget.mjs` run as plain Node after the suite. So each of
 * them hand-rolled its threshold or omitted one, and the registry's claim to be
 * "the floors, in one place" was already false: the live suite floor was a bare
 * `const FLOOR = 260` inside `suite-floor.mjs`, and `FLOORS.TEST_FILES` sat
 * here with zero callers, documenting a caller (`src/test/suiteFloor.test.js`)
 * that does not exist.
 *
 * Splitting the data from the vitest binding lets both halves import it, so the
 * claim becomes true. `assertNonVacuousScan.js` re-exports `FLOORS`, so every
 * existing import keeps working.
 *
 * THE RULES THESE NUMBERS OBEY
 *   - A floor is a NON-VACUITY CANARY, not a coverage target. It asserts the
 *     scan scanned something, and is never raised to match a new actual: a
 *     floor equal to the count is fragile without being stricter.
 *   - Each is measured THROUGH the guard's own discovery, never by a different
 *     tool.
 *   - Every number here EXPIRES. The date it was measured is part of the
 *     record, and re-measuring is the only way to quote it.
 *   - A floor calibrated for one population is never lent to another.
 */
export const FLOORS = {
  /** Route smoke. Actual on 2026-09-04: 27 path-bearing routes in App.jsx. */
  ROUTES: 20,

  /** Service modules under src/services/. Actual on 2026-09-04: 9. */
  SERVICE_MODULES: 7,

  /**
   * Exported service methods across all nine modules, as the error-contract
   * guard enumerates them. Actual on 2026-09-04: 25 fetching methods.
   */
  SERVICE_METHODS: 18,

  /**
   * Distinct endpoints the API-contract guard finds in `src/services/`.
   *
   * MEASURED 2026-09-05 through `discoverEndpoints()` itself: 31 `apiUrl(...)`
   * call sites collapsing to **20** distinct normalised paths, across 9 service
   * modules.
   *
   * NOTE THE PLAN SAID 19. It was written on 2026-09-03 and the actual is 20 --
   * a count expires, which is the doctrine this arc keeps restating about its
   * own numbers. The floor is set from what the guard produces today, not from
   * what a document remembered.
   *
   * This is the single highest risk in P4: a regex that matches nothing gives a
   * guard that passes while checking ZERO endpoints, which is worse than no
   * guard because it reads as green.
   */
  ENDPOINTS: 15,

  /**
   * Lines in the committed `api-surface.txt` copy. Actual on 2026-09-07: 41.
   *
   * Its own entry rather than `ENDPOINTS`. The two populations are different --
   * one endpoint can appear as several `METHOD /path` lines -- and the artifact
   * guard was borrowing the endpoint floor, which is a floor calibrated for a
   * different discovery.
   */
  SURFACE_LINES: 25,

  /**
   * Files git tracks in this repository. Actual on 2026-09-05: 122.
   *
   * What it catches is `git ls-files` returning nothing -- in a detached
   * checkout, or with git absent from the PATH. The secret guard would then
   * report no secrets and pass.
   */
  TRACKED_FILES: 60,

  /**
   * Files the secret guard still scans AFTER its path exclusions. Actual on
   * 2026-09-05: 117 of 122.
   *
   * The mirror image of the exclusion list, and the reason it is a separate
   * floor: an over-broad exclusion silences that guard exactly as effectively
   * as a raised threshold would, and the finding count alone would never show
   * it.
   */
  SCANNED_AFTER_EXCLUSIONS: 60,

  /**
   * Option-backed fields the vocabulary guard derives from `memberConstants`.
   * Actual on 2026-09-05: 18 (16 by naming convention, 2 by alias).
   */
  OPTION_BACKED_FIELDS: 8,

  /**
   * Comparisons against those fields found in `src/pages` and `src/hooks`.
   * Actual on 2026-09-05: 47.
   */
  VOCABULARY_COMPARISONS: 20,

  /**
   * Keys the server publishes in its error envelope. Actual on 2026-09-05: 6
   * (`timestamp`, `status`, `error`, `message`, `path`, `validationErrors`).
   */
  ENVELOPE_KEYS: 3,

  /**
   * Test source files the defect-population guard walks. Actual on 2026-09-07:
   * 18. Previously written as a bare `8` at its call site.
   */
  TEST_SOURCE_FILES: 8,

  /**
   * Register rows declared in `knownDefects.js`. Actual on 2026-09-07: 16.
   * Previously written as a bare `8` at its call site.
   */
  DEFECT_ROWS: 8,

  /**
   * Tests the suite must produce, counted from `reports/junit.xml` by
   * `scripts/suite-floor.mjs`. Last RECORDED actual 398, on 2026-09-06 -- not
   * re-measured when this entry was moved here, because measuring it means
   * running the suite, and a number carried across is exactly what this
   * registry tells its readers not to trust. Re-derive it before quoting it.
   *
   * 🔑 THE ONE THAT LIVED OUTSIDE THE REGISTRY, as a bare `const FLOOR = 260`
   * inside the script -- so the repository's "floors in one place" claim was
   * false for its single most load-bearing floor. Moved here unchanged; it is
   * not re-tuned by this pass.
   */
  SUITE_TESTS: 260,

  /**
   * Endpoints the route smoke ACTUALLY REQUESTED, counted by
   * `scripts/contract-witness.mjs` from `reports/observed-endpoints.json`.
   * Measured through that guard's own read on 2026-09-08: 9.
   *
   * 🔑 ITS OWN ENTRY RATHER THAN `ENDPOINTS`, which is 15 over a population
   * that looks similar and is not. `ENDPOINTS` counts what the STATIC scan
   * finds in `src/services/`; this counts what a browser was observed asking
   * for. Most discovered endpoints need a user action the smoke never performs,
   * so this number is legitimately much smaller, and lending the larger floor
   * to it would disarm the guard it was lent to.
   *
   * What it is for: `contract-witness.mjs` compares the two sets by DIFFERENCE,
   * and a difference against an empty set is empty -- so with no witness the
   * script reported success. This is the floor that makes that state loud.
   */
  OBSERVED_ENDPOINTS: 5,

  /**
   * The shipped bundle, in bytes, floored by `scripts/bundle-budget.mjs`.
   * Measured through that guard's own walk of `dist/` on 2026-09-08:
   * 502.08 KiB JavaScript, 48.97 KiB CSS, 788.16 KiB across 5 emitted files.
   *
   * 🔑 FLOORS ON A GUARD THAT WAS ALL CEILING. Every other assertion there is
   * `actual <= ceiling`, which a build emitting nothing but `index.html`
   * satisfies completely -- three cheerful OK lines and exit 0. A broken build
   * is far likelier than a bundle that doubled, and it was the one case the
   * guard could not see.
   *
   * These are not size targets. They separate "a real build" from "no build".
   * If a legitimate change ever takes the bundle below one, that is worth a
   * conversation rather than an edit.
   */
  BUNDLE_JS_BYTES: 200 * 1024,
  BUNDLE_CSS_BYTES: 10 * 1024,
  BUNDLE_TOTAL_BYTES: 300 * 1024,
  BUNDLE_FILES: 4,
}
