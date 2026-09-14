import { describe, expect, it } from 'vitest'

import { DEFECTS, DEFECT_ROWS } from './knownDefects'
import { assertNonVacuousScan, FLOORS } from './assertNonVacuousScan'

/**
 * EVERY SKIPPED TEST IS ACCOUNTED FOR, IN BOTH DIRECTIONS.
 *
 * This suite has no flaky list and skips nothing for unreliability. A skipped
 * test here means exactly one thing: a test written to the CORRECT behaviour,
 * against a defect that is real, left visibly failing by design.
 *
 * Individually each of those is justified. COLLECTIVELY, with nothing counting
 * them, a suite carrying a dozen skipped tests reads as neglected rather than
 * deliberate -- and that is how the next one gets added quietly, for a reason
 * that is not this one. So the correspondence is asserted:
 *
 *   forwards   every skipped test cites a register row that exists here
 *   backwards  every row here has at least one skipped test AND a live pin
 *
 * THE BACKWARD DIRECTION IS THE ONE THAT ROTS. Nothing else in a suite ever
 * complains that a defect was fixed while its test stayed skipped -- the test
 * simply never runs again, and the register quietly describes a past.
 *
 * THE LIVE PIN IS THIS REPOSITORY'S ADDITION.
 * The server half of this arc landed twelve rows, each with one skipped test,
 * and hand-wrote a "still reproduces" pin on two of them. Here the pin is a
 * property of the register rather than a habit: `pin()` beside every
 * `disabled()`, and this guard asserts both exist. The day a defect is fixed,
 * its pin goes red and names the row.
 */

/** Every test source in the repository, read as text. */
const TEST_SOURCES = Object.entries(
  import.meta.glob('../**/*.test.{js,jsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
)

/**
 * Which rows a file cites, and whether that file skips and pins.
 *
 * HOW THE ATTRIBUTION WORKS, AND WHERE IT IS DELIBERATELY COARSE
 * The direct form is `it.skip(disabled(DEFECTS.A13, ...))`, which names its
 * row in the source and can be read exactly.
 *
 * But `services.errorContract.test.js` cites its rows through a BREACHES map
 * and emits the tests in a loop -- `disabled(breach.defect, ...)` -- because
 * the contract is applied by iteration rather than by hand. That is the right
 * shape for the contract and the wrong shape for a regex.
 *
 * Rather than reshape working code to suit its own guard, this resolves at
 * FILE level: a row is covered if `DEFECTS.<ROW>` appears in a file that
 * contains a skip through `disabled(`, and pinned if it appears in a file that
 * pins through `pin(`. That is weaker than per-test attribution -- a file
 * citing two rows and skipping for only one would satisfy it -- and it is
 * stated here rather than glossed, because a guard whose limits are unwritten
 * gets trusted for more than it checks.
 *
 * It still catches the failure that actually happens: a row with no test
 * anywhere, and a skipped test with no live pin.
 */
const collect = () => {
  const skipped = new Map()
  const pinned = new Map()

  for (const [path, src] of TEST_SOURCES) {
    const rows = new Set([...src.matchAll(/DEFECTS\.([A-Z]\d+)/g)].map((m) => m[1]))
    const hasSkip = /\bit\.skip\(\s*\n?\s*disabled\(/.test(src)
    const hasPin = /\bit\(\s*\n?\s*pin\(/.test(src)

    for (const row of rows) {
      if (hasSkip) skipped.set(row, [...(skipped.get(row) ?? []), path])
      if (hasPin) pinned.set(row, [...(pinned.get(row) ?? []), path])
    }
  }
  return { skipped, pinned }
}

const { skipped: SKIPPED, pinned: PINNED } = collect()

/** Rows named directly in a skip, which can be attributed exactly. */
const DIRECTLY_SKIPPED = new Set(
  TEST_SOURCES.flatMap(([, src]) =>
    [...src.matchAll(/\bit\.skip\(\s*\n?\s*disabled\(\s*DEFECTS\.([A-Z]\d+)/g)].map((m) => m[1]),
  ),
)

/** Every `.skip` in the repository, however it was written. */
const ALL_SKIPS = TEST_SOURCES.flatMap(([path, src]) =>
  [...src.matchAll(/\b(?:it|test|describe)\.skip\s*\(([\s\S]{0,80})/g)].map((m) => ({
    path,
    head: m[1],
  })),
)

describe('the disabled population', () => {
  it('read the test sources at all', () => {
    assertNonVacuousScan(TEST_SOURCES, FLOORS.TEST_SOURCE_FILES, 'test source files')
    assertNonVacuousScan(DEFECT_ROWS, FLOORS.DEFECT_ROWS, 'register rows in knownDefects.js')
  })

  it('FORWARDS -- every skipped test cites a row that exists', () => {
    const unknown = [...SKIPPED.keys()].filter((row) => !DEFECT_ROWS.includes(row))
    expect(
      unknown,
      `These rows are cited by a skipped test but are not defined in knownDefects.js: ` +
        `${unknown.join(', ')}. A skipped test whose reason is not in the register is a ` +
        `test nobody can audit.`,
    ).toEqual([])
  })

  it('FORWARDS -- nothing is skipped WITHOUT citing a row', () => {
    // `disabled(DEFECTS.X` is the direct form; `disabled(breach.defect` is the
    // iterated form used by the error contract. Both go through `disabled()`,
    // which is the actual requirement: a skip may not be written by hand.
    const uncited = ALL_SKIPS.filter((s) => !/disabled\(/.test(s.head))
    expect(
      uncited.map((s) => `${s.path}: ${s.head.replace(/\s+/g, ' ').slice(0, 60)}`),
      'These tests are skipped without citing a register row. There is no flaky list in ' +
        'this repository and nothing is skipped for unreliability -- a skip means a real ' +
        'defect, asserted and named. Either name the defect or fix the test.',
    ).toEqual([])
  })

  it('BACKWARDS -- every row has a skipped test written to the correct behaviour', () => {
    const orphaned = DEFECT_ROWS.filter((row) => !SKIPPED.has(row))
    expect(
      orphaned,
      `These register rows have no skipped test: ${orphaned.join(', ')}. A row with no ` +
        `test is a note, not an assertion -- nothing in the suite is holding the correct ` +
        `behaviour anywhere, so the day it is fixed nothing turns green to say so.`,
    ).toEqual([])
  })

  it('BACKWARDS -- every row has a LIVE PIN that reddens when the defect is fixed', () => {
    const unpinned = DEFECT_ROWS.filter((row) => !PINNED.has(row))
    expect(
      unpinned,
      `These register rows have no live pin: ${unpinned.join(', ')}. Their skipped test ` +
        `NEVER RUNS, so if someone repairs the defect tomorrow nothing in this suite ` +
        `notices: the test stays skipped, the row stays open, and the repair is ` +
        `invisible. A pin asserts the CURRENT wrong behaviour and goes red on the fix.`,
    ).toEqual([])
  })

  it('every row carries a headline and a detailed reason', () => {
    for (const row of DEFECT_ROWS) {
      const d = DEFECTS[row]
      expect(d.row, `${row} disagrees with its own key`).toBe(row)
      expect(d.headline.length, `${row} has no headline`).toBeGreaterThan(10)
      expect(
        d.detail.length,
        `${row}'s reason is too short to be useful. The reason travels INTO the test ` +
          `title, so a reader who opens a red run sees the whole story without leaving ` +
          `the output.`,
      ).toBeGreaterThan(120)
    }
  })

  it('every row id is unique, and the register is not accidentally duplicated', () => {
    expect(DEFECT_ROWS.length).toBe(new Set(DEFECT_ROWS).size)
  })

  it('MOST rows are attributed exactly, not just at file level', () => {
    // The coarse file-level fallback exists for the error contract's iterated
    // breaches. It should stay the exception: if most rows started relying on
    // it, this guard would be checking much less than it appears to. The
    // threshold is deliberately loose -- it is a shape check, not a target.
    const direct = DEFECT_ROWS.filter((r) => DIRECTLY_SKIPPED.has(r))
    const indirect = DEFECT_ROWS.filter((r) => !DIRECTLY_SKIPPED.has(r))

    expect(
      direct.length,
      `Only ${direct.length} of ${DEFECT_ROWS.length} rows name their register row ` +
        `directly in an it.skip(disabled(DEFECTS.X)) call. The rest (${indirect.join(', ')}) ` +
        `are attributed at file level only, which is a weaker check. Prefer the direct ` +
        `form for new rows.`,
    ).toBeGreaterThanOrEqual(Math.ceil(DEFECT_ROWS.length / 2))
  })
})
