#!/usr/bin/env node
/**
 * The shipped-bundle ceiling.
 *
 * WHY THIS EXISTS
 * This phase adds msw, axe-core, RTL, jsdom and vitest to devDependencies. A
 * test suite must prove it did not move the shipped product, and "devDependency"
 * is a claim about intent, not a measurement -- one stray import from a test
 * helper into a component and the tooling ships to every member's browser.
 *
 * And once the number exists it keeps earning: a later feature that doubles the
 * bundle now has something to fail against, which is the half nobody builds
 * because on the day you write it there is nothing wrong.
 *
 * WHY IT IS NOT A VITEST TEST
 * It needs `dist/`, which only exists after a build. Inside the suite it would
 * have to either skip when dist is absent -- and this repository does not skip
 * tests for convenience -- or fail on a clean checkout. So it is its own
 * command. It also deliberately does NOT hook `npm run build`: never add work
 * to a name someone already runs.
 *
 * Run:  npm run build && npm run budget
 *
 * MEASURED 2026-09-04 on the phase/03.1 branch, Vite 7.3.3, in KiB as this
 * script counts them (Vite prints decimal kB, which is why its numbers read
 * about 2% larger -- the two are not disagreeing):
 *   dist/assets/index-*.js         502.08 KiB   (gzip 141.12 KiB)
 *   dist/assets/logo-*.png         118.30 KiB
 *   dist/Tansparent Lady Robot.png 118.30 KiB   <-- register F8: the SAME image
 *                                                   again, copied through from
 *                                                   public/. 118 KiB shipped
 *                                                   twice on every first load.
 *   dist/assets/index-*.css         48.94 KiB
 *   dist/index.html                  0.50 KiB
 *                                  ----------
 *   total                          788.13 KiB
 *
 * The ceilings below sit above those with headroom, for the same reason every
 * floor in this suite sits below its actual: a limit equal to the measurement
 * reddens for reasons nobody caused, and gets raised by whoever is unlucky
 * enough to hit it first.
 */
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const KB = 1024

/** Measured 2026-09-04. Raise only with a reason recorded beside the change. */
const CEILINGS = {
  js: 600 * KB, // measured 502.08 KiB
  css: 70 * KB, // measured  48.94 KiB
  total: 900 * KB, // measured 788.13 KiB across every emitted asset
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  )

let files
try {
  files = walk('dist')
} catch {
  console.error(
    '\n  dist/ does not exist. This checks the SHIPPED bundle, so it needs a build:\n' +
      '    npm run build && npm run budget\n',
  )
  process.exit(1)
}

const sum = (pred) =>
  files.filter(pred).reduce((n, f) => n + statSync(f).size, 0)

const js = sum((f) => f.endsWith('.js'))
const css = sum((f) => f.endsWith('.css'))
const total = sum(() => true)

const fmt = (n) => `${(n / KB).toFixed(2)} KiB`

const rows = [
  ['javascript', js, CEILINGS.js],
  ['css', css, CEILINGS.css],
  ['all assets', total, CEILINGS.total],
]

console.log(`\n  bundle budget -- ${files.length} emitted file(s)\n`)
let failed = false
for (const [name, actual, ceiling] of rows) {
  const ok = actual <= ceiling
  if (!ok) failed = true
  console.log(
    `  ${ok ? 'OK  ' : 'OVER'}  ${name.padEnd(12)} ${fmt(actual).padStart(10)}  ` +
      `ceiling ${fmt(ceiling).padStart(10)}  ` +
      `(${((actual / ceiling) * 100).toFixed(0)}% of budget)`,
  )
}
console.log('')

if (failed) {
  console.error(
    '  The shipped bundle is over its ceiling. Before raising the number, check\n' +
      '  whether test tooling has leaked into the product: an import from\n' +
      '  src/test/ into a component is the failure this guard was built for.\n',
  )
  process.exit(1)
}
