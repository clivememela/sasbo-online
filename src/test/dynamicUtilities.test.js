import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from './apiContractScan.js'
import {
  assertBlankingPreservedCode,
  assertNonVacuousScan,
  assertNothingWasSkipped,
  FLOORS,
} from './assertNonVacuousScan.js'
import { DETECTOR_CANARY, dynamicUtilitiesIn } from './dynamicUtilities.js'
import { blankingDestroyedCode, readSources, unreadableDirectories } from './sourceScan.js'

/**
 * No Tailwind utility is assembled at runtime. `05.2`.
 *
 * 🔴 THE BUG THIS EXISTS FOR PRODUCES NO SYMPTOM. Tailwind reads source text; it never runs
 * the code. `` `col-span-${span}` `` therefore emits a valid, correctly spelled class that
 * matches nothing in the stylesheet — the element renders, no error is thrown, no build
 * warning appears, and the layout is quietly not the one that was written. `LocationListing`
 * carried one from the day it was written: two header fields asked to span three columns and
 * never did, at any width, in any theme.
 *
 * ⚠️ IT SURVIVED EVERY EXISTING INSTRUMENT. The palette gate reads class names and found
 * nothing to object to — the class is a layout utility with no colour in it. The width matrix
 * measured the page at seven widths and found no overflow — a span that does not apply makes
 * the grid NARROWER, never wider. jsdom has no layout at all. It was found by diffing the
 * built stylesheet against the class the component emits, and the only durable form of that
 * check is this one: refuse to emit such a class in the first place.
 */

/** Every non-test source file under `src/`, comments blanked. */
function scan() {
  return readSources(join(REPO_ROOT, 'src'), { root: REPO_ROOT, pattern: /\.(jsx?|mjs)$/ }).filter(
    (source) => !/\.test\.|\/test\//.test(source.path),
  )
}

describe('the runtime-utility detector', () => {
  it('convicts a spliced utility and acquits everything else built the same way', () => {
    // 🔴 THE CANARY, and it is doing more work here than usual: the whole assertion below
    // is `toEqual([])`, so a detector that has stopped matching anything at all is
    // indistinguishable from a clean tree.
    expect(
      DETECTOR_CANARY.mustConvict.filter((sample) => dynamicUtilitiesIn(sample).length === 0),
      'The detector stopped recognising a Tailwind utility spliced together at runtime. ' +
        'The scan below is now vacuous: it will find nothing and report green.',
    ).toEqual([])

    expect(
      DETECTOR_CANARY.mustAcquit.filter((sample) => dynamicUtilitiesIn(sample).length > 0),
      'The detector convicted an interpolation that is CORRECT — a DOM id, an API path, ' +
        'or a whole class name the scanner can still see. Interpolating into a string is ' +
        'normal; only splicing a value into the scale position of a utility is the bug. ' +
        'Re-aim the predicate, do not rewrite the code it convicted.',
    ).toEqual([])
  })
})

describe('no Tailwind utility is assembled at runtime', () => {
  it('every file under src emits class names Tailwind can see', () => {
    const sources = scan()

    assertNothingWasSkipped(unreadableDirectories(), 'the runtime-utility scan')
    assertBlankingPreservedCode(blankingDestroyedCode(sources))
    assertNonVacuousScan(sources, FLOORS.SRC_SOURCE_FILES, 'non-test source files under src/')

    const offenders = sources.flatMap((source) =>
      dynamicUtilitiesIn(source.code).map((hit) => `${source.path}:${hit.line} ${hit.utility}`),
    )

    expect(
      offenders,
      'A Tailwind class is being built by splicing a value into it. Tailwind scans source ' +
        'text and never runs this code, so the generated stylesheet will not contain the ' +
        'class and the rule will silently do nothing. Write every class out in full — a ' +
        'lookup object keyed by the value (`const SPAN = { 3: "lg:col-span-3" }`) is the ' +
        'usual shape, and it is what `LocationListing.jsx` now uses.',
    ).toEqual([])
  })
})
