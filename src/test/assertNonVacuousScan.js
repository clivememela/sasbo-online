import { expect } from 'vitest'

/**
 * The one place this repository decides that a scan actually scanned something.
 *
 * THE FAILURE IT EXISTS TO PREVENT
 * Every guard that works by DISCOVERY -- globbing files, walking the route
 * table, iterating a module's exports -- fails OPEN. A broken walker finds
 * nothing, reports no offenders, and passes. Its symptom is a green run, which
 * is also what success looks like, so the suite cannot detect this about
 * itself.
 *
 * A DISCOVERY GUARD IS TWO ASSERTIONS, NOT ONE
 *   1. Completeness -- by discovery, carrying NO number. "Every route mounts",
 *      "every exported service method rejects on a failed response". It moves
 *      with the codebase and never needs editing.
 *   2. A non-vacuity canary -- a number set deliberately BELOW the real count.
 *      That is this function. It is not a coverage target and must never be
 *      raised to match reality: a floor equal to the actual is fragile without
 *      being stricter, and reddens for reasons nobody caused.
 *
 * RULES
 *   - It asserts on the collection the caller ALREADY HOLDS. It never
 *     re-discovers; re-discovering proves the discoverer works, not that this
 *     guard looked at anything.
 *   - Each floor is measured THROUGH the guard's own discovery, never by a
 *     different tool. A `find` over `src/` and a walker disagree by design.
 *   - It is calibrated with real headroom. A guard that cries wolf gets its
 *     threshold lowered by whoever is unlucky enough to hit it.
 *
 * ITS OWN REDDENING CHANGE
 * Point a caller's discovery at a directory that does not exist. Every caller
 * must go red together. Run once per phase, reverted, and recorded.
 *
 * This is the client counterpart of the server's `NonVacuousScan`, and it is
 * deliberately a separate implementation: three independent repositories cannot
 * share a module, and pretending otherwise creates the sibling-path coupling
 * the plans forbid.
 */
export function assertNonVacuousScan(found, floor, what) {
  const size = Array.isArray(found) ? found.length : found?.size ?? found?.length

  expect(
    size,
    `NON-VACUITY CANARY for ${what}. This is not a coverage target -- it is the ` +
      `assertion that the scan scanned anything at all. Finding fewer than ${floor} ` +
      `means the discovery is broken, not that the codebase shrank. Fix the walker; ` +
      `do not lower the floor. Found ${size}.`,
  ).toBeGreaterThanOrEqual(floor)
}

/**
 * The blanker did not destroy the code it was supposed to preserve.
 *
 * The second half of every source-scanning guard's non-vacuity claim, and it
 * lives here for the same reason the canary does: a contract holds because ONE
 * function enforces it, not because every author remembered. Two call sites had
 * already grown two different failure messages for an identical failure.
 *
 * Takes the offenders the caller already computed via `blankingDestroyedCode`,
 * never a fresh scan -- re-scanning would prove the scanner works, not that
 * THIS guard looked at anything.
 */
export function assertBlankingPreservedCode(destroyed) {
  expect(
    destroyed.map((source) => source.path),
    'The comment blanker emptied a file that had code in it. Every scan built on it is ' +
      'now vacuous -- it will find no offenders and report green, which is also what ' +
      'success looks like. Fix the blanker; do not lower anything.',
  ).toEqual([])
}

/**
 * The floors, in one place, each measured through its own guard's discovery.
 *
 * MEASURED 2026-09-04 against the real client tree. The "actual" beside each is
 * what the guard found on the day the floor was set; the floor sits below it
 * with headroom, and is NEVER edited up to match a new actual.
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
   * Test FILES discovered by the suite-level floor. Actual is recorded in
   * `src/test/suiteFloor.test.js`, which is the only caller.
   */
  TEST_FILES: 20,

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
}
