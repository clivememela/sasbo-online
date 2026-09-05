#!/usr/bin/env node
/**
 * THE DISCOVERY FLOOR -- a count AND a zero exit code.
 *
 * WHY IT IS A SCRIPT AND NOT A TEST
 * A test inside the suite cannot assert the suite's own exit code, and the
 * exit code is half the claim. MobiZone observed a client suite reporting
 * 941/941 PASSING while the process exited 1 -- every human signal said green
 * and the build was red. Nothing running inside that suite could have noticed.
 *
 * It also cannot honestly assert its own total: a broken test-file glob makes
 * the runner discover fewer files, and a guard that lives in one of those
 * files disappears along with them. The failure mode of a discovery guard is
 * that it is not there, and only something outside can see that.
 *
 * So this runs the suite, then reads BOTH the exit code and the JUnit XML the
 * run produced, and asserts against both.
 *
 * THE FLOOR IS A NON-VACUITY CANARY, NOT A COVERAGE TARGET
 * It sits deliberately BELOW the real count with headroom, and it is never
 * raised to match reality. A floor equal to the actual is fragile without
 * being stricter -- it reddens for reasons nobody caused, and then gets
 * lowered by whoever is unlucky enough to hit it.
 *
 * MEASURED 2026-09-05, at the end of Phase 3:
 *   355 tests across 15 files -- 334 passing, 21 skipped
 * The floor below is 260, about 73% of that: room for a domain or two to be
 * deleted or moved without a false alarm, and nowhere near low enough for a
 * broken glob to slip past.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'

/** Measured 2026-09-05: 355. Never raise this to match a new actual. */
const FLOOR = 260
const REPORT = 'reports/junit.xml'

const run = spawnSync('npx', ['vitest', 'run'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

const exitCode = run.status

let xml
try {
  xml = readFileSync(REPORT, 'utf8')
} catch {
  console.error(
    `\n  FLOOR FAILED: the suite produced no ${REPORT} at all.\n` +
      `  A run that reports nothing is not a run that passed -- it is a run that did\n` +
      `  not happen, or a reporter that is no longer wired up.\n`,
  )
  process.exit(1)
}

// Vitest's JUnit output nests <testsuite> elements; sum their counts.
const suites = [...xml.matchAll(/<testsuite\b[^>]*>/g)].map((m) => m[0])
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="(\\d+)"`))
  return m ? Number(m[1]) : 0
}

const total = suites.reduce((n, t) => n + attr(t, 'tests'), 0)
const failures = suites.reduce((n, t) => n + attr(t, 'failures') + attr(t, 'errors'), 0)
const skipped = suites.reduce((n, t) => n + attr(t, 'skipped'), 0)

console.log(
  `\n  suite floor -- ${total} tests in ${suites.length} file(s), ` +
    `${failures} failure(s), ${skipped} skipped, exit ${exitCode}\n`,
)

let failed = false

if (exitCode !== 0) {
  console.error(
    `  FLOOR FAILED: the suite exited ${exitCode}.\n` +
      `  This is asserted separately from the pass counts on purpose: a suite can report\n` +
      `  every test passing and still exit non-zero -- an unhandled rejection after the\n` +
      `  last test, a reporter that threw, a worker that died. Every human-facing signal\n` +
      `  says green; the process says otherwise, and the process is right.\n`,
  )
  failed = true
}

if (total < FLOOR) {
  console.error(
    `  FLOOR FAILED: ${total} tests ran, and the floor is ${FLOOR}.\n` +
      `  This is NOT a coverage target. It is the assertion that the suite still\n` +
      `  DISCOVERED itself. The usual cause is a broken test-file glob in\n` +
      `  vite.config.js, which makes the runner find fewer files and report a\n` +
      `  cheerful green for the handful it still sees.\n` +
      `  Fix the discovery. Do not lower the floor.\n`,
  )
  failed = true
}

if (failures > 0) {
  console.error(`  FLOOR FAILED: ${failures} test(s) failed.\n`)
  failed = true
}

process.exit(failed ? 1 : 0)
