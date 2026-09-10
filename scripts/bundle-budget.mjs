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
 * RE-MEASURED 2026-09-09 on design/00-baseline at the close of the design arc's
 * P3, same script, after `npm run build`:
 *   entry js                       251.87 KiB   ceiling 350   OK
 *   javascript (all chunks)        602.24 KiB   ceiling 640   <-- RAISED, see below
 *   css                             60.63 KiB   ceiling  70   OK
 *   all assets                     783.61 KiB   ceiling 900   OK
 *   emitted files                  59
 *
 * ✅ F8 IS CLOSED, on measurement. `public/Tansparent Lady Robot.png` and
 * `src/assets/images/logo.png` were BYTE-IDENTICAL (sha256 3863ca94...), so the
 * build really was shipping 121 KiB twice -- 242 KiB of a 901 KiB bundle for one
 * picture. The favicon now points at the source asset and Vite emits it once:
 * all assets 901.10 -> 783.61 KiB. ⏳ The other half of R-PERF-D is still open --
 * a favicon does not need a 121 KiB full-colour photo -- and needs the owner's
 * asset rather than an invented one.
 *
 * 🔴 WHY `js` MOVED 600 -> 640, and what spent it: ONE lazy chunk, `Modal-*.js`
 * at 41 KiB -- `@radix-ui/react-dialog`, behind the design arc's `03.4` single
 * overlay primitive. It replaces EIGHT hand-rolled `fixed inset-0` divs across
 * four files, none portalled, none trapping focus, one handling Escape; the 41 KiB
 * IS the focus trap, the Escape handling, the scroll lock and the portal. It is
 * lazy, so the entry chunk did not move.
 *
 * ⚠️ THE RAISE IS THE LAST STEP, NOT THE FIRST. Reclaimed before asking: F8's
 * duplicate image (above), `react-day-picker` removed entirely in `03.3` on its
 * own measurement (81.91 KiB for the date chunk, all assets 933.65 KiB -- this
 * guard caught that one too), and three dependencies with zero consumers deleted
 * (`cn`, `radix-ui`, `class-variance-authority`). Agreed with the automation arc,
 * 2026-09-09, with these figures beside the ask; `entryJs`, `css`, `total` and
 * every floor are untouched.
 *
 * The ceilings below sit above those with headroom, for the same reason every
 * floor in this suite sits below its actual: a limit equal to the measurement
 * reddens for reasons nobody caused, and gets raised by whoever is unlucky
 * enough to hit it first.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { FLOORS } from '../src/test/floors.js'

const KB = 1024

/**
 * Raise only with a reason recorded beside the change.
 *
 * The measurements these sit above are NOT repeated here: they belong to
 * `FLOORS.BUNDLE_*` in `src/test/floors.js`, which carries the actual and the
 * date. Two copies had already drifted by 0.03 KiB before anyone read them
 * together, which is the whole argument for one home.
 */
const CEILINGS = {
  // The entry chunk: what a first paint downloads before anything renders. Added by
  // 03.1, which cut it from 506 KiB to 287 by splitting every route. The ceiling is
  // deliberately BELOW the pre-split figure -- its job is to notice a route quietly
  // becoming a static import again, which would show up here and nowhere else.
  entryJs: 350 * KB,
  // 600 -> 640 on 2026-09-09: see the re-measured table above. 6% over the 602.24
  // actual, for the reason the header gives -- a limit equal to the measurement
  // reddens for things nobody caused.
  js: 640 * KB,
  // 2026-09-10: 60.63 → 72.02 KiB when the client became card.html whole -- the theme
  // switch's pour, the register's container ladder and phone rows, the card's landing and
  // sweep, the skeleton, and the utilities every rebuilt screen now shares. Checked before
  // raising: nothing from src/test/ is in the product; the growth is the design. 80 keeps
  // the same headroom over the measured figure that 70 kept over 60.
  css: 80 * KB,
  total: 900 * KB,
}

// Floors come from the registry; CEILINGS stay local -- a ceiling is not a
// non-vacuity canary, and `src/test/floors.js` owns the why and the dates.

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

/**
 * The entry chunk, read from index.html rather than guessed from a filename.
 *
 * Vite hashes every chunk and several are called `index-*.js`, so picking "the one
 * that looks like the entry" is a guess that goes wrong on the day a lazy page is
 * also named index. The document says which script it loads; that is the answer.
 */
const entryJs = (() => {
  let html
  try {
    html = readFileSync('dist/index.html', 'utf8')
  } catch {
    return 0
  }
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1])
  return srcs.reduce((n, src) => {
    try {
      return n + statSync(join('dist', src.replace(/^\//, ''))).size
    } catch {
      return n
    }
  }, 0)
})()

const js = sum((f) => f.endsWith('.js'))
const css = sum((f) => f.endsWith('.css'))
const total = sum(() => true)

const fmt = (n) => `${(n / KB).toFixed(2)} KiB`

const count = (n) => `${n} file(s)`

// The file count is a row like any other, not a special case ahead of the
// table. It has no ceiling -- a build emitting many files is not a defect --
// and `Infinity` says that in the same shape rather than in a second code path
// that sets the same flag from somewhere else.
const rows = [
  // 🔑 FIRST, because it is the only row a user experiences directly. Every other
  // byte here is paid later, or never.
  ['entry js', entryJs, FLOORS.BUNDLE_ENTRY_JS_BYTES, CEILINGS.entryJs, fmt],
  ['javascript', js, FLOORS.BUNDLE_JS_BYTES, CEILINGS.js, fmt],
  ['css', css, FLOORS.BUNDLE_CSS_BYTES, CEILINGS.css, fmt],
  ['all assets', total, FLOORS.BUNDLE_TOTAL_BYTES, CEILINGS.total, fmt],
  // 🔑 The count catches what the byte floors cannot: one large asset copied
  // into an otherwise empty dist/ clears every byte floor while shipping no
  // application at all.
  ['emitted files', files.length, FLOORS.BUNDLE_FILES, Infinity, count],
]

console.log('\n  bundle budget\n')
let over = false
let under = false

for (const [name, actual, floor, ceiling, format] of rows) {
  const isOver = actual > ceiling
  const isUnder = actual < floor
  if (isOver) over = true
  if (isUnder) under = true
  const mark = isOver ? 'OVER ' : isUnder ? 'UNDER' : 'OK   '
  const limit = ceiling === Infinity ? 'none'.padStart(10) : format(ceiling).padStart(10)
  console.log(
    `  ${mark} ${name.padEnd(13)} ${format(actual).padStart(10)}  ` +
      `floor ${format(floor).padStart(10)}  ceiling ${limit}`,
  )
}
console.log('')

if (over) {
  console.error(
    '  The shipped bundle is over its ceiling. Before raising the number, check\n' +
      '  whether test tooling has leaked into the product: an import from\n' +
      '  src/test/ into a component is the failure this guard was built for.\n',
  )
}

if (under) {
  console.error(
    '  The shipped bundle is under its FLOOR, which almost never means the product\n' +
      '  got smaller. It means the build did not emit what it should have -- a failed\n' +
      '  or partial build, a changed output directory, or a stale dist/ from a run\n' +
      '  that produced almost nothing.\n\n' +
      '  This is here because every other assertion in this file is `actual <= ceiling`,\n' +
      '  and a dist/ containing nothing but index.html satisfies all of them. Rebuild\n' +
      '  and look at what was emitted. Do not lower the floor.\n',
  )
}

if (over || under) process.exit(1)
