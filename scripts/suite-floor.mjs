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

import { FLOORS } from '../src/test/floors.js'

// The floor lives in the registry with every other floor. It was a bare
// constant here, which made "the floors, in one place" untrue of the single
// most load-bearing floor in the repository -- and the comment beside it read
// "Measured 2026-09-05: 355" against a value of 260, so the number and its
// justification had already come apart.
const FLOOR = FLOORS.SUITE_TESTS
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

// 🔑 COUNT THE ELEMENTS, DO NOT TRUST THE ATTRIBUTES.
//
// This read `tests=` / `failures=` / `skipped=` off each <testsuite>. The
// workspace's `merge-reports.mjs` documents at length why it deliberately does
// not: "Those are written by three different tools here, and F6 in the register
// is a case of a report that stayed green while the evidence underneath it was
// silently short." Two readers of the same artifact class, disagreeing on the
// exact point one of them names as a defect -- and this is the reader that
// decides whether the suite discovered itself.
//
// CDATA is stripped first: <system-out> carries whole application logs, and a
// logged line containing "<testcase" would otherwise be counted as a test.
const scrubbed = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')

const suites = [...scrubbed.matchAll(/<testsuite\b[^>]*>/g)].map((m) => m[0])
const total = [...scrubbed.matchAll(/<testcase\b/g)].length
const failures = [...scrubbed.matchAll(/<(?:failure|error)\b/g)].length
const skipped = [...scrubbed.matchAll(/<skipped\b/g)].length

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
