import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from './apiContractScan.js'
import {
  assertBlankingPreservedCode,
  assertNonVacuousScan,
  assertNothingWasSkipped,
  FLOORS,
} from './assertNonVacuousScan.js'
import { blankingDestroyedCode, readSources, unreadableDirectories } from './sourceScan.js'

/**
 * Every hover style is behind `hover-hover:`. `05.1`, R-RESP-H.
 *
 * 🔴 ON A TOUCH SCREEN A BARE `hover:` LATCHES. There is no pointer to leave, so the style
 * applies on tap and stays applied until something else is tapped — the *"why is that row
 * still highlighted"* complaint, which reads to a user as a rendering fault rather than as a
 * hover. `@custom-variant hover-hover (@media (hover: hover))` in `index.css` is the opt-in,
 * and it lives there as a variant precisely because ~70 call sites cannot each be trusted to
 * remember an arbitrary media query.
 *
 * 🔑 THE MIGRATED FORM KEEPS BOTH HALVES: `hover-hover:hover:bg-surface-2`. The custom
 * variant contributes the media query; the inner `hover:` still contributes the `:hover`
 * pseudo-class. Dropping the inner one gives a rule that applies on any pointer-capable
 * device permanently, which is worse than what it replaced.
 *
 * ⚠️ AND THAT IS WHY THE PREDICATE CARRIES A NEGATIVE LOOKBEHIND. Counting `hover:` without
 * one reports every MIGRATED site as unmigrated — the `hover:` inside `hover-hover:hover:`
 * is preceded by a colon and looks bare to a naive pattern. Measured that way this tree
 * showed 75 offenders across 28 files; the real figure was 21 across 11, and the difference
 * was 49 sites that were already correct. A metric that cannot tell its subject from the fix
 * is this arc's recurring species, and it very nearly caused 49 correct sites to be
 * "migrated" a second time.
 */
const BARE_HOVER = /(?<!hover-hover:)(?<![-\w])hover:(?=[a-z[])/g

/** 🔴 THE CANARY: the assertion below is `toEqual([])`, so a dead regex reads as success. */
const CANARY = {
  mustConvict: [
    'className="p-4 hover:bg-surface-2"',
    'cn("rounded", "hover:underline")',
    'hover:[--x:1]',
  ],
  mustAcquit: [
    // The migrated form, which is what the tree should be full of.
    'className="p-4 hover-hover:hover:bg-surface-2"',
    // Relational variants carry their own semantics and are not this rule's business.
    'className="group-hover:opacity-100 peer-hover:underline"',
    // The variant definition itself, and prose about it.
    '@custom-variant hover-hover (@media (hover: hover));',
    '@media (hover: hover) { .x { color: red } }',
    'const hovered = useHover()',
  ],
}

function scan() {
  return readSources(join(REPO_ROOT, 'src'), { root: REPO_ROOT, pattern: /\.(jsx?|mjs|css)$/ }).filter(
    (source) => !/\.test\.|\/test\//.test(source.path),
  )
}

describe('no hover style applies where hover is not real', () => {
  it('the detector sees a bare hover and acquits the migrated form', () => {
    expect(
      CANARY.mustConvict.filter((sample) => !new RegExp(BARE_HOVER.source).test(sample)),
      'The detector stopped recognising a bare `hover:`. The scan below is now vacuous.',
    ).toEqual([])

    expect(
      CANARY.mustAcquit.filter((sample) => new RegExp(BARE_HOVER.source).test(sample)),
      'The detector convicted `hover-hover:hover:` — the CORRECT form — or a relational ' +
        'variant, or the media query that defines the variant. Convicting the fix is how ' +
        '49 already-migrated sites came within one commit of being wrapped twice.',
    ).toEqual([])
  })

  it('no source file carries one', () => {
    const sources = scan()

    assertNothingWasSkipped(unreadableDirectories(), 'the hover-intent scan')
    assertBlankingPreservedCode(blankingDestroyedCode(sources))
    assertNonVacuousScan(sources, FLOORS.SRC_SOURCE_FILES, 'non-test source files under src/')

    const offenders = sources.flatMap((source) => {
      const hits = source.code.match(new RegExp(BARE_HOVER.source, 'g')) ?? []
      return hits.map((hit) => `${source.path} ${hit}`)
    })

    expect(
      offenders,
      'A hover style is not behind `hover-hover:`. On a touch screen it will latch on tap ' +
        'and stay lit. Write it as `hover-hover:hover:<utility>` — keep BOTH halves ' +
        '(conventions, R-RESP-H).',
    ).toEqual([])

    // ✅ The must-pass half: the tree is genuinely full of the migrated form, so a scan
    // that found zero did so because the codebase is correct and not because it read
    // nothing. Without this, deleting every hover style in `src` would also pass.
    const migrated = sources.reduce(
      (total, source) => total + (source.code.match(/hover-hover:hover:/g) ?? []).length,
      0,
    )
    expect(
      migrated,
      'Almost no hover styles are in the migrated form, which means the clean result ' +
        'above is about an empty tree rather than a correct one.',
    ).toBeGreaterThan(40)
  })
})
