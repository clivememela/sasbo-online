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
}
