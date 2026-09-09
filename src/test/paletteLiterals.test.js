import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from './apiContractScan.js'
import {
  assertBlankingPreservedCode,
  assertNonVacuousScan,
  assertNothingWasSkipped,
  FLOORS,
} from './assertNonVacuousScan.js'
import { DETECTOR_CANARY, PALETTE_FAMILIES, paletteLiteralsIn } from './paletteLiterals.js'
import { blankingDestroyedCode, readSources, unreadableDirectories } from './sourceScan.js'

/**
 * P4's "no literal colour utilities anywhere in `src`, grep-proved" box, as a gate.
 *
 * 🔑 THE ALLOWLIST IS A SET OF PATHS, NOT A SET OF COUNTS, and that is the whole design.
 * A count goes stale the moment anybody edits the file and then has to be "updated",
 * which is indistinguishable from being weakened. A path is either converted or it is
 * not. So:
 *
 *   - a file NOT on the list must hold ZERO literals -- it is converted, and staying
 *     converted is the point;
 *   - a file ON the list must hold AT LEAST ONE -- if it holds none it is already
 *     converted and the entry is stale, and the guard says to delete the entry.
 *
 * That second half is what stops the list rotting into a permanent exemption. The list
 * can only ever shrink, and it cannot shrink silently: emptying a file is what forces
 * its line to be deleted here, in the same commit.
 *
 * ⚠️ THE LIST IS P4's OWN SCHEDULE, wave by wave, and it reaches ZERO when P4 closes.
 */

/** The waves, exactly as `IMPLEMENTATION.md` splits them. */
const NOT_YET_CONVERTED = {
  /** `04.3` -- admin, maintainance, archives, reports, bank_branch, acb, forms. */
  'src/pages/acb/AcbDebits.jsx': '04.3',
  'src/pages/admin/Acb.jsx': '04.3',
  'src/pages/admin/Admin.jsx': '04.3',
  'src/pages/admin/DailyMenu.jsx': '04.3',
  'src/pages/admin/Maintenance.jsx': '04.3',
  'src/pages/admin/MonthlyMenu.jsx': '04.3',
  'src/pages/archives/AffiliationsOtherTradeUnions.jsx': '04.3',
  'src/pages/archives/ArchiveSearch.jsx': '04.3',
  'src/pages/archives/FinanceHouses.jsx': '04.3',
  'src/pages/archives/ResearchInformation.jsx': '04.3',
  'src/pages/bank_branch/BankBranch.jsx': '04.3',
  'src/pages/bank_branch/BankBranchModal.jsx': '04.3',
  'src/pages/bank_branch/BankListing.jsx': '04.3',
  'src/pages/forms/Forms.jsx': '04.3',
  'src/pages/forms/GeneralForm.jsx': '04.3',
  'src/pages/forms/MembershipApplication.jsx': '04.3',
  'src/pages/maintainance/RecruitmentChannel.jsx': '04.3',
  'src/pages/maintainance/Subscriptions.jsx': '04.3',
  'src/pages/reports/LocationListing.jsx': '04.3',
  'src/pages/reports/Locations.jsx': '04.3',
  'src/pages/reports/OrganizerReport.jsx': '04.3',
}

/**
 * Every non-test source file under `src/`, comments blanked.
 *
 * The test files are excluded on purpose and it is not laziness: a test that asserts a
 * component renders `bg-gray-800` is asserting about a defect, and several of this
 * repository's pins do exactly that. Convicting them would make the pin unwritable.
 */
function scan() {
  return readSources(join(REPO_ROOT, 'src'), { root: REPO_ROOT, pattern: /\.(jsx?|mjs)$/ }).filter(
    (source) => !/\.test\.|\/test\//.test(source.path),
  )
}

describe('the palette-literal detector', () => {
  it('convicts every literal shape, and acquits every token', () => {
    // 🔴 THE CANARY. A regex with one bad escape matches nothing, finds no offenders in
    // any file, and reports the whole tree clean -- which is also what success looks
    // like. This is the assertion that the detector can still see.
    expect(
      DETECTOR_CANARY.mustConvict.filter((sample) => paletteLiteralsIn(sample).length === 0),
      'The detector stopped recognising a palette literal it must catch. Every scan ' +
        'below is now vacuous: it will find nothing and report green.',
    ).toEqual([])

    expect(
      DETECTOR_CANARY.mustAcquit.filter((sample) => paletteLiteralsIn(sample).length > 0),
      'The detector convicted a TOKEN, or a utility that carries no colour at all. It ' +
        'would report the token layer itself as the defect, and the fix would be to ' +
        'undo P1.',
    ).toEqual([])
  })

  it('cannot collide with a token this repository actually defines', () => {
    // The acquit list above is a sample. This is the population: if the `@theme` block
    // ever defines `--color-slate-500`, the detector would convict every correct use of
    // it, and the failure would read as "the token layer is wrong".
    const css = readFileSync(join(REPO_ROOT, 'src', 'assets', 'styles', 'index.css'), 'utf8')
    const tokenNames = [...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((match) => match[1])

    assertNonVacuousScan(tokenNames, FLOORS.COLOUR_TOKENS, 'colour tokens in index.css')

    const collisions = tokenNames.filter((name) =>
      PALETTE_FAMILIES.some((family) => name === family || name.startsWith(`${family}-`)),
    )

    expect(
      collisions,
      'A colour token is named after a Tailwind palette family, so the detector cannot ' +
        'tell a token from a literal. Rename the token to a ROLE (conventions §1); do ' +
        'not weaken the detector.',
    ).toEqual([])
  })
})

describe('no literal colour utilities in src', () => {
  it('every converted file holds none, and every listed file still holds some', () => {
    const sources = scan()

    // The three non-vacuity halves, in the order `assertNonVacuousScan.js` sets out:
    // the walk read everything it walked over, the blanker did not empty a file that
    // had code in it, and the scan found a plausible number of files.
    assertNothingWasSkipped(unreadableDirectories(), 'the palette-literal scan')
    assertBlankingPreservedCode(blankingDestroyedCode(sources))
    assertNonVacuousScan(sources, FLOORS.SRC_SOURCE_FILES, 'non-test source files under src/')

    const offenders = new Map()
    for (const source of sources) {
      const hits = paletteLiteralsIn(source.code)
      if (hits.length) offenders.set(source.path, hits)
    }

    const unexpected = [...offenders]
      .filter(([path]) => !(path in NOT_YET_CONVERTED))
      .map(([path, hits]) => `${describeHits(path, hits)}`)

    expect.soft(
      unexpected,
      'A file that P4 has already converted -- or one that was never on the list -- ' +
        'holds a Tailwind palette colour. A component must never learn a hue: ask for ' +
        'a ROLE token instead (conventions §1, planning/branches/design/tokens.md).',
    ).toEqual([])

    const stale = Object.keys(NOT_YET_CONVERTED).filter((path) => !offenders.has(path))

    expect.soft(
      stale,
      'These files are on the not-yet-converted list and hold NO palette literals, so ' +
        'the entry is stale. Delete each line from NOT_YET_CONVERTED in this file, in ' +
        'the commit that converted it -- an exemption nobody needs is an exemption ' +
        'that will one day be used.',
    ).toEqual([])

    const missing = Object.keys(NOT_YET_CONVERTED).filter(
      (path) => !sources.some((source) => source.path === path),
    )

    expect.soft(
      missing,
      'A file on the not-yet-converted list is not on disk under that path. It was ' +
        'renamed or deleted, and the entry now exempts nothing -- which would let a ' +
        'literal back into whatever replaced it.',
    ).toEqual([])
  })
})

/** `path:line literal` for the first few hits, so a failure names somewhere to go. */
function describeHits(path, hits) {
  const shown = hits
    .slice(0, 3)
    .map((hit) => `${path}:${hit.line} ${hit.literal}`)
    .join(', ')
  return hits.length > 3 ? `${shown} (+${hits.length - 3} more)` : shown
}
