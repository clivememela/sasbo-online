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
  //
  // 640 -> 650 on 2026-09-17, MEASURED, at P9's batch 2. The measurement build went
  // 639.42 -> 641.29 KiB (empty VITE_API_BASE_URL; the production env adds 0.06). What
  // spent it, chunk by chunk (`p9b2` build against `p9b0`):
  //   DialogNotice 0 -> 885 B  a NEW SHARED CHUNK. R4-F1 needed a failure said inside the
  //                            dialog on its second and third consumers, so Recruiters'
  //                            local copy was lifted to components/common per conventions
  //                            §11. Rollup gives a module three pages share its own chunk.
  //   circle-check 0 -> 174 B  the CheckCircle2 icon, split out for the same reason.
  //   Members +533 · RecruitmentChannel +333 · AcbDebits +329 · index +305  R3-F2's
  //                            kind-aware copy plus `writeMayHaveLanded`.
  //   Recruiters -642 · memberService -131 · api -60  what the lift and P9 batch 0 removed.
  // ⚠️ THE RAISE IS STILL THE LAST STEP. It was taken only after the above accounted for
  // every byte: the growth is one extraction that REMOVED a duplicate and ~1 KiB of the
  // 1.87 is Rollup's per-chunk overhead for sharing it, not product code. 1.4% of headroom
  // over the 641.29 actual -- the same margin the header argues for, and no more, so the
  // next feature still meets a real ceiling. The design arc owns this number: the ACB arc
  // raises it again, by exactly its screen's bytes, when its Runs screen lands.
  //
  // 650 -> 666.58 on 2026-09-19, MEASURED, at ACB `01.5` -- by exactly the screen's bytes,
  // as above. Both builds with the worktree's tracked `.env` (the production URL), so the
  // pair compares like with like: 67ad286 647.96 -> the Runs screen 664.54 KiB, +16.58
  // (under the empty-URL measurement env 67ad286 reads 646.13, so expect ~662.7 there).
  // What spent it, chunk by chunk:
  //   AcbRuns 0 -> 15,583 B    THE SCREEN: the runs list, preparing and its polling, the
  //                            run's panel with its debits and exclusions sheets, and the
  //                            run vocabulary. Lazy, like every route: nothing on the entry.
  //   SelectInput 0 -> 1,475 B · options 0 -> 912 B   NEW SHARED CHUNKS, not new code: a
  //                            second lazy route now imports the native select, so Rollup
  //                            lifts it out of useReferenceData (-1,440) and SearchableSelect
  //                            (-794) into chunks of their own.
  //   index +824 · Acb +76     the route and the two A.C.B. menu entries.
  //   Members +69 · Recruiters +69 · Subscriptions +69 · CaptureMember +74 · BankBranch +30
  //   · Forms +30              Rollup's import stubs for the new shared chunks.
  // No headroom added on top: the next feature meets a real ceiling, as the P9 entry argues.
  //
  // 666.58 -> 693.35 on 2026-09-21, MEASURED, after merging origin/main e70b675 into the ACB
  // branch (the planning pack's F61: the 666.58 above was set over 67ad286, a base main has
  // since left). Both builds from one install of e70b675's lock, the tracked `.env`:
  //   main e70b675 ON ITS OWN   676.60 KiB -- 26.60 OVER its own 650 ceiling. Not ACB's bytes:
  //                            8c6b675's welcome-letter preview and confirmation, e70b675's
  //                            MemberPanel, and the lock's react 19.3 / react-router 7.18.4 /
  //                            rollup 4.63.4. The design arc owns that number and was told
  //                            the same day; it is carried here, as measured, so that this
  //                            branch's ceiling measures ACB's own bytes and nothing else.
  //   the ACB branch            693.35 KiB, +16.75 over main, chunk by chunk as 01.5 found it:
  //                            AcbRuns 0 -> 15,775 B · SelectInput 0 -> 1,475 · options 0 -> 912
  //                            · useReferenceData -1,440 · SearchableSelect -794 · index +824
  //                            · Acb +76 · Members, Recruiters, Subscriptions +69 each
  //                            · CaptureMember +57 (+74 before the flip: debitDate.js's
  //                            forward-first rule is 17 B shorter) · BankBranch, Forms +30 each.
  // Still no headroom on top.
  //
  // 693.35 -> 687.33 on 2026-09-21, MEASURED, after merging origin/main 3a3cc3c (design's RF and
  // the panel width) into the ACB branch. Both builds from one install of the same lock, the
  // tracked `.env`, in C:\tmp\acb-client:
  //   main 3a3cc3c ON ITS OWN   670.27 KiB -- still over its own 650, and still the design arc's
  //                            number; RF took 6.33 KiB off e70b675's 676.60.
  //   the ACB branch (e3285a3)  687.33 KiB, +17.06 over main, chunk by chunk:
  //                            AcbRuns 0 -> 15,742 B · SelectInput 0 -> 1,475 · options 0 -> 912
  //                            · useReferenceData -1,440 · SearchableSelect -794 · index +873
  //                            · circle-alert 0 -> 251 and useFocusOn -214 (Rollup re-splitting a
  //                            shared icon and hook once the ACB route imports them)
  //                            · CaptureMember +131 (the flip, and the debit-date sentence's
  //                            capital letter) · Members +109 · Recruiters +104 · Acb +76
  //                            · Subscriptions +64 · Auth +40 · AcbDebits +35 · RecruitmentChannel +35
  //                            · Forms, BankBranch +30 each · AddressAutocomplete +5 · DialogNotice +2.
  // The ceiling comes DOWN, to the measurement: carrying e70b675's 676.60 would have left 6 KiB of
  // slack nobody earned. It is 687.34, not 687.33, because the measurement is 703,827 B -- 687.331
  // KiB -- and a ceiling written to the hundredth must round UP or it refuses the build it was
  // measured from (it did, by one byte). Still no headroom on top.
  //
  // 687.34 -> 708.23 on 2026-09-21, MEASURED, three builds from one install in C:\tmp\acb-client,
  // the tracked `.env`: e3285a3 703,827 B (the 687.33 above, reproduced to the byte) -> 650ea61
  // 707,242 B -> the 04.1 tree 725,224 B. The remote gate had already refused 650ea61 at 690.67.
  //   e3285a3 -> 650ea61, +3,415 B   AcbRuns +3,197 (01.8's calendar notice, 01.9's rate note, 02.7's
  //                                  made-on and make-by, 02.8's decline notes) · Acb +213 (04.2's
  //                                  honest rows) · DataState +5.
  //   650ea61 -> 04.1, +17,982 B     AcbDebits 8,338 -> 22,678 (the Re-Debits screen: the unpaids and
  //                                  their decisions, the held-over permissions, the held letters,
  //                                  the server-side search) · acbPaging 0 -> 8,409 and AcbRuns -4,819
  //                                  (the paging hook and pager, moved out of the Runs panel to be
  //                                  shared) · index +52.
  // 725,224 B is 708.227 KiB, so 708.23. Still no headroom on top.
  //
  // 708.23 -> 708.70 on 2026-09-21, MEASURED ON THE GATE'S RUNNER: the box had 574 MB free (commit
  // 42.5 of 46.5 GB), no room for a vite build beside the other sessions' work. A throwaway commit printed
  // every chunk's bytes from the CI build, runs 35666314519 and 35666314630. The method checked first:
  //   3e86cba (00.2) 725,059 B, 165 under the 04.1 tree, and its 69 unchanged chunks byte-identical to the
  //                  local build above; the five that moved are exactly 00.2's files: CaptureMember -159
  //                  · Recruiters -103 · Members +63 · format +43 · AcbDebits -9.
  //   accdfd1 (Capture's holiday sentence) 725,706 B, +647 over 3e86cba, chunk by chunk:
  //                  acbRunService 0 -> 2,671 and acbPaging -2,637 (Rollup gives the service a chunk of its
  //                  own once Capture imports it) · CaptureMember +487 (the calendar read, the caveat on
  //                  every unknown date) · index +44 · AcbDebits, AcbRuns +41 each.
  // 725,706 B is 708.697 KiB, so 708.70. Still no headroom on top.
  //
  // 650 -> 680 on 2026-09-21, MEASURED, at the design arc's close (670.22 KiB on the lockfile's own
  // packages). The SAME code measured 641.31 on React 19.2.6: `8c6b675` (Clive, 2026-09-21) regenerated the lockfile --
  // `package.json` untouched, 86 packages refreshed within their ranges -- and React came with it, 19.2.6 -> 19.3.0.
  // What spent it, chunk by chunk (the lockfile's packages against 19.2.6's):
  //   index         298.45 -> 327.13  +28.68  the entry chunk, where react-dom lives: its production client is
  //                                           523.5 KiB at 19.2.6 and 610.5 at 19.3.0
  //   index.modern   34.96 ->  35.74   +0.78
  //   Modal          40.85 ->  40.31   -0.54
  //   every other chunk within 200 B, 69 chunks both sides.
  // Over the wire: +8.5 KiB gzipped (+7.2 brotli) on the first load, cached after. The suite and the E2E pass on 19.3,
  // and 19.2.6 against 19.3.0 rendered 350/350 pixel-identical. Kept on the owner's word (2026-09-21): the cost is
  // small, and rolling React back alone would fight a refresh of 86 packages. Checked before raising, as the header
  // asks: nothing from src/test/ is imported by the product, and no test library is in the built bundle. 1.4% of
  // headroom, as the last raise had; the ACB arc still raises it by exactly its own bytes.
  //
  // 680 -> 718.43 on 2026-09-21, MEASURED, at the merge of client main f96e723 (design/12) into the ACB branch:
  // main's own ceiling raised by exactly ACB's bytes, as the paragraph above asks, so main keeps its 1.4% and
  // ACB brings none of its own. On the gate's runner, the method of 708.70's paragraph (run 35667059993):
  //   main f96e723 ON ITS OWN   686,361 B (670.274 KiB -- the 670.27 measured locally at 3a3cc3c, to the
  //                            hundredth: design/12 changed a test and this script, not the product)
  //   the ACB tree              725,706 B -- accdfd1's product, byte for byte, for the same reason
  //   ACB's own bytes           +39,345 B = 38.423 KiB, chunk by chunk: AcbDebits 8,303 -> 22,710 · AcbRuns
  //                            0 -> 14,161 · acbPaging 0 -> 5,772 · acbRunService 0 -> 2,671 · SelectInput
  //                            0 -> 1,475 · options 0 -> 912 · index +969 · CaptureMember +459 · Acb +289
  //                            · circle-alert 0 -> 251 · Members +172 · Subscriptions +64 · format +43
  //                            · Auth +40 · RecruitmentChannel +35 · BankBranch, Forms +30 each
  //                            · AddressAutocomplete, DataState +5 each · DialogNotice +2 · Recruiters +1
  //                            · SearchableSelect -794 · useReferenceData -1,440 · useFocusOn -214.
  // 680 + 38.423 = 718.423, so 718.43 (rounded UP, as 687.34's paragraph explains).
  //
  // 718.43 -> 722.63 on 2026-09-22, MEASURED ON THE GATE'S RUNNER, for ACB's completion (00.5 the account type,
  // 03.5 the termination report and the member's Terminated status): main's 680 plus ACB's bytes and nothing
  // else, as the paragraph above does. Two throwaway builds, the method of 708.70's paragraph:
  //   main 3dddaac ON ITS OWN   729,941 B (712.833 KiB -- quick wins' +4.136 over f96e723 spent design's
  //                            headroom, not ACB's, and is not ACB's to raise; run 35673286333)
  //   the completion (34da403)  734,244 B, +4,303 B over it, chunk by chunk (run 35673323129): AcbDebits
  //                            +3,451 (the termination report, the banking dialog's type, the unpaids'
  //                            disabled Suspend) · memberConstants
  //                            0 -> 3,173 and bankBranches -3,116 (Rollup gives the constants a chunk of their
  //                            own once AcbDebits imports ACCOUNT_TYPE_OPTIONS: +57 net) · CaptureMember +308
  //                            · Members +225 · acbRunService +114 · StatusChip +102 · index +46.
  // ACB's bytes: 39,345 + 4,303 = 43,648 B = 42.625 KiB. 680 + 42.625 = 722.625, so 722.63 (rounded UP).
  //
  // 722.63 -> 723.15 on 2026-09-22, MEASURED ON THE GATE'S RUNNER, for 03.3's failed-send rule (EH-E, R3-7): a send
  // that failed on the run's worklist, said as such, with Send again. The completion's 734,244 B (run 35673323129)
  // against ff9df5e's 734,781 B (run 35717409196): +537 B, chunk by chunk -- acbPaging +374 (the worklist) ·
  // AcbDebits +163. ACB's bytes: 43,648 + 537 = 44,185 B = 43.149 KiB. 680 + 43.149 = 723.149, so 723.15.
  //
  // 723.15 -> 723.16 on 2026-09-22, MEASURED ON THE GATE'S RUNNER: SNAPSHOT_INCOMPLETE's label made general (it
  // covers the account type since 00.5) -- 79240a9 builds 734,790 B, +9 B over ff9df5e, all of it acbPaging (run
  // 35722286575). ACB's bytes: 44,185 + 9 = 44,194 B = 43.158 KiB. 680 + 43.158 = 723.158, so 723.16.
  js: 723.16 * KB,
  // 2026-09-10: 60.63 → 72.02 KiB when the client became card.html whole -- the theme
  // switch's pour, the register's container ladder and phone rows, the card's landing and
  // sweep, the skeleton, and the utilities every rebuilt screen now shares. Checked before
  // raising: nothing from src/test/ is in the product; the growth is the design. 80 keeps
  // the same headroom over the measured figure that 70 kept over 60.
  css: 80 * KB,
  total: 900 * KB,
  // 2026-09-14: DOCUMENTS ARE THEIR OWN ROW, not part of `total`. The membership application
  // PDF became a real Vite import (it had been a dev-only `/src/...` path that a production
  // build served as an empty frame), and at 487.6 KiB it alone took `all assets` from ~764 to
  // 1251 KiB. Checked before splitting: nothing from src/test/ is in the product, and the
  // growth is one file a visitor downloads only by opening that form -- it is not page weight,
  // so folding it into `total` would have forced a ceiling too loose to notice real bloat.
  // It still has a ceiling of its own: a second form, or a far larger scan, is still noticed.
  documents: 600 * KB,
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
// Downloadable documents are measured on their own row -- see `CEILINGS.documents`.
const isDocument = (f) => /\.pdf$/i.test(f)
const total = sum((f) => !isDocument(f))
const documents = sum(isDocument)

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
  // Floor 0: shipping no documents at all is a legitimate build, unlike shipping no code.
  ['documents', documents, 0, CEILINGS.documents, fmt],
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
