#!/usr/bin/env node
/**
 * THE RUNTIME WITNESS -- does the static scan agree with what actually happened?
 *
 * WHY IT IS A SCRIPT AND NOT A TEST
 * Two reasons, and the first one is decisive.
 *
 * 1. ORDER. `reports/observed-endpoints.json` is written by the route smoke,
 *    `src/App.routes.test.jsx`, during the run. The suite runs in HOSTILE
 *    ORDER -- files are shuffled -- so a test that read that file would pass or
 *    fail depending on whether the smoke happened to run first. That is a
 *    flake by construction, and this arc does not have flaky tests. Reading it
 *    AFTER the suite has finished is deterministic.
 *
 * 2. It is a cross-check between two independent mechanisms, and it belongs
 *    outside both of them.
 *
 * WHAT IT CATCHES
 * `src/test/apiContract.test.js` scans `src/services/` for `apiUrl(...)` call
 * sites. A discovery guard with no runtime counterpart is grading its own
 * homework: if the regex quietly stops matching a module, the guard reports
 * fewer endpoints and still passes. The route smoke mounts all 27 declared
 * routes and records every request that was actually made -- so:
 *
 *   observed but NOT discovered  ->  the static scan MISSED an endpoint. Fatal.
 *   discovered but NOT observed  ->  information only. Most endpoints are
 *                                    reached by a user action the smoke never
 *                                    performs, so this is normal and is
 *                                    printed rather than failed on.
 *
 * Run it AFTER `npm test`. `npm run witness` does both in order.
 */
import { readFileSync } from 'node:fs'
import process from 'node:process'

import { discoverEndpoints, normalisePath } from '../src/test/apiContractScan.js'

const WITNESS = 'reports/observed-endpoints.json'

let witness
try {
  witness = JSON.parse(readFileSync(WITNESS, 'utf8'))
} catch {
  console.error(
    `\n  ${WITNESS} is not there.\n\n` +
      `  It is written by the route smoke during a suite run and is git-ignored, so a\n` +
      `  fresh clone has none. Run \`npm test\` first, or \`npm run witness\` which does\n` +
      `  both in order.\n`,
  )
  process.exit(1)
}

const discovered = new Set(discoverEndpoints().map((call) => call.path))

// The witness records `METHOD /path`; the static scan knows only paths.
const observed = new Map()
for (const { endpoint, calls } of witness.endpoints) {
  const path = normalisePath(endpoint.slice(endpoint.indexOf(' ') + 1))
  observed.set(path, (observed.get(path) ?? 0) + calls)
}

const missedByTheScan = [...observed.keys()].filter((path) => !discovered.has(path)).sort()
const notExercised = [...discovered].filter((path) => !observed.has(path)).sort()

console.log(`\n  runtime witness   ${WITNESS}`)
console.log(`  recorded          ${witness.recordedAt}`)
console.log(`  routes mounted    ${witness.routesMounted}`)
console.log(`  endpoints observed ${observed.size}   discovered by the static scan ${discovered.size}\n`)

if (notExercised.length) {
  console.log(`  ${notExercised.length} discovered but not exercised by the route smoke (expected --`)
  console.log(`  these need a user action the smoke does not perform):`)
  for (const path of notExercised) console.log(`      ${path}`)
  console.log('')
}

if (missedByTheScan.length) {
  console.error(
    `  THE STATIC SCAN MISSED ${missedByTheScan.length} ENDPOINT(S) THAT WERE ACTUALLY REQUESTED:\n`,
  )
  for (const path of missedByTheScan) console.error(`      ${path}  (${observed.get(path)} calls)`)
  console.error(
    `\n  Something requested these and src/services/ scanning did not find them. Either\n` +
      `  the request is built somewhere the scan does not read -- in which case add it to\n` +
      `  DYNAMIC_PATHS with a reason -- or the extraction regex has stopped matching a\n` +
      `  shape it used to. Do not lower anything; find out which.\n`,
  )
  process.exit(1)
}

console.log('  Every endpoint the browser actually requested was found by the static scan.\n')
