import { describe, expect, it } from 'vitest'

import {
  assertDetectorCanary,
  assertScanIsHonest,
  FLOORS,
} from './assertNonVacuousScan.js'
import { nonTestSources } from './sourceScan.js'

/**
 * No `alert()`, `confirm()` or `prompt()` in `src`. `10.4`, and §5's `NATIVE_DIALOGS` ceiling.
 *
 * 🔴 THE COUNT WAS 22 WHEN THIS ARC OPENED AND IS 0 TODAY, WHICH IS EXACTLY WHY THE GUARD IS
 * BEING WRITTEN NOW RATHER THAN THEN. A ceiling at 0 is only writable once the population is 0;
 * before that it is a wish. `03.4` and `06.1b` did the removing -- four `window.confirm()` calls
 * became `ConfirmDialog`, and fourteen `alert()` calls became notices inside the dialog that
 * caused them -- and this is the thing that stops them coming back.
 *
 * WHY IT MATTERS MORE THAN TIDINESS. A native dialog cannot be styled, cannot be themed, blocks
 * the main thread, and says only OK/Cancel however careful the question is. `Recruiters.jsx`
 * alone had six `alert()` calls, two of them `alert(err)` with a raw Error object -- which some
 * browsers print as "[object Error]", so the user was shown a failure that named nothing. The
 * replacement is not cosmetic: a failure is now said *inside* the dialog it happened in, with
 * words about what to check.
 *
 * ⚠️ COMMENTS ARE BLANKED, AND THIS GUARD CANNOT WORK WITHOUT IT. Sixteen sites across nine
 * files mention `alert()` or `window.confirm()` IN PROSE -- comments written to record what was
 * removed and why. A scan that reads its own documentation as the defect convicts every file
 * that explains itself, which punishes writing the explanation, which is [F-P29] precisely.
 * `nonTestSources` blanks comment bodies before this scan sees a character, and
 * `assertScanIsHonest` proves the blanker did not simply empty the files.
 *
 * 🔑 THE SUITE IS NOT IN THE POPULATION, and that is deliberate rather than an oversight:
 * `nonTestSources` excludes test files, and a test may legitimately drive or spy on these. The
 * rule is about what ships to a browser.
 */

/**
 * 🔑 AIMED AT THE CALL, NOT AT THE WORD. `\bconfirm\s*\(` matches `confirm(` and
 * `window.confirm(` while leaving `ConfirmDialog`, `setConfirmed(`, `onConfirm(`,
 * `confirmDelete(` and `role="alert"` alone -- three of which are live in this repository and
 * one of which (`setConfirmed`) is the subject of an open register row, so a guard that
 * convicted it would be read as evidence of that defect.
 *
 * Declared WITHOUT `/g`. A global regex keeps `lastIndex` between `.test()` calls and so
 * reports a match on one sample and a miss on the next; the one place that needs every match
 * uses `matchAll`, which per spec clones the regex and cannot leak state. Same shape as
 * `viewportUnits.test.js`, for the same reason.
 */
const NATIVE_DIALOG = /\b(?:window|globalThis|self)\s*\.\s*(?:alert|confirm|prompt)\s*\(|(?<![.\w$])(?:alert|confirm|prompt)\s*\(/

const detect = (sample) => [...sample.matchAll(new RegExp(NATIVE_DIALOG, 'g'))].map((m) => m[0])

const CANARY = {
  mustConvict: [
    'alert("Saved")',
    'window.alert(err)',
    'if (confirm("Delete this recruiter?")) remove()',
    'window.confirm("Discard your changes?")',
    'const name = prompt("Name?")',
    'globalThis.alert(message)',
    // Spacing is not a disguise.
    'window . confirm ( "x" )',
    'alert (err)',
  ],
  mustAcquit: [
    // This repository's own replacements, all live in `src` today.
    '<ConfirmDialog open={open} onConfirm={remove} />',
    'setConfirmed(true)',
    'const handleConfirm = () => {}',
    'confirmDelete(id)',
    'onConfirm()',
    '<div role="alert">{notice}</div>',
    'alertRef.current?.focus()',
    'const confirmation = buildConfirmation()',
    // A method on something that is not the global object.
    'dialogs.alert(message)',
    'this.prompt(question)',
    // The words, not the calls.
    'const promptText = "Are you sure?"',
    'let alertTone = "danger"',
  ],
}

describe('no native browser dialogs in src', () => {
  it('the detector sees a native dialog call and acquits every replacement for one', () => {
    assertDetectorCanary(CANARY, detect, 'native-dialog')
  })

  it('no source file calls one', () => {
    const sources = nonTestSources({ pattern: /\.(jsx?|mjs)$/ })

    // The same population `SRC_SOURCE_FILES` was measured against -- non-test `jsx?|mjs` under
    // `src/` -- so the floor is shared rather than lent. This file's header records the rule:
    // a floor calibrated for one population is never lent to another.
    assertScanIsHonest(sources, FLOORS.SRC_SOURCE_FILES, 'the native-dialog scan')

    const offenders = sources.flatMap((source) =>
      detect(source.code).map((hit) => `${source.path} ${hit}`),
    )

    expect(
      offenders,
      'A native browser dialog is back in `src`. It cannot be styled or themed, it blocks the ' +
        'thread, and it says only OK/Cancel however careful the question is -- and passed an ' +
        'Error object it prints "[object Error]", naming nothing. Use `ConfirmDialog` for a ' +
        'question and a notice inside the dialog that failed for an outcome (conventions, and ' +
        '`Modal.jsx`).',
    ).toEqual([])
  })
})
