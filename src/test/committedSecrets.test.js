import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from './apiContractScan.js'
import { FLOORS, assertNonVacuousScan } from './assertNonVacuousScan'
import {
  ALLOWLIST,
  PATH_EXCLUSIONS,
  isExcluded,
  scanForSecrets,
  trackedFiles,
} from './committedSecrets.js'
import { DEFECTS, disabled, pin } from './knownDefects'

/**
 * NO NEW SECRET GETS COMMITTED TO THIS REPOSITORY.
 *
 * This repository already contains one -- a live Google API key in `.env`,
 * register row B2 -- so the guard lands with that file named on an allowlist
 * and fails on anything else. Naming it is the point: excluding it quietly
 * would make this guard read GREEN over a key that is on every clone of this
 * repository right now.
 */
describe('committed secrets', () => {
  const tracked = trackedFiles(REPO_ROOT)
  const findings = scanForSecrets(REPO_ROOT)
  const allowed = new Set(ALLOWLIST.map((entry) => entry.path))

  describe('the scan actually scanned something', () => {
    it('asked git for the tracked files and got a repository back', () => {
      assertNonVacuousScan(
        tracked,
        FLOORS.TRACKED_FILES,
        'files tracked by git in this repository',
      )
    })

    it('scans source files rather than excluding everything', () => {
      const scanned = tracked.filter((path) => !isExcluded(path))

      // The mirror image of the exclusion list: an over-broad exclusion would
      // silence the guard just as effectively as a raised threshold, and the
      // finding count alone would not show it.
      assertNonVacuousScan(
        scanned,
        FLOORS.SCANNED_AFTER_EXCLUSIONS,
        'files actually scanned after path exclusions',
      )
      expect(scanned.some((path) => path.endsWith('.js') || path.endsWith('.jsx'))).toBe(true)
      expect(scanned).toContain('.env')
    })
  })

  describe('the path exclusions', () => {
    it('exist, and every one carries its reason', () => {
      // An exclusion nobody can see is where the real key hides next time.
      expect(PATH_EXCLUSIONS.length).toBeGreaterThan(0)
      for (const exclusion of PATH_EXCLUSIONS) {
        expect(exclusion.why, `${exclusion.match} has no justification`).toBeTruthy()
        expect(exclusion.why.length).toBeGreaterThan(30)
      }
    })

    it('excludes the lockfile, which is what stops the first run reporting hundreds', () => {
      // 🔴 THE ORDER IS THE DESIGN. package-lock.json holds 409 `integrity`
      // hashes (counted 2026-09-05 -- the plan recorded 276 on 2026-09-04, and
      // the file has grown since; a count expires). Each is a 40+ character
      // high-entropy base64 string no entropy test can distinguish from a key.
      //
      // Scanning it first and filtering after would produce a first run with
      // hundreds of findings -- which does not get triaged, it gets silenced.
      expect(isExcluded('package-lock.json')).toBe(true)
      expect(isExcluded('src/services/api.js')).toBe(false)
    })
  })

  describe('the allowlist', () => {
    it('has exactly one entry, and it is the one this arc knows about', () => {
      // A second entry appearing later is a review conversation, not a quiet
      // edit. That is why this asserts the count and not merely the contents.
      expect(
        ALLOWLIST.map((entry) => entry.path),
        'Someone has allowlisted another file. That is a decision about a real secret in ' +
          'a real repository, and it needs a register row and a reviewer -- not a commit.',
      ).toEqual(['.env'])

      // The entry carries the register ROW, not a retyped copy of its prose.
      expect(ALLOWLIST[0].defect).toBe(DEFECTS.B2)
    })
  })

  /**
   * B2, through the register rather than beside it.
   *
   * The skipped test says what SHOULD be true; the pin asserts it is not, so
   * the allowlist cannot outlive the problem it documents. The day the key is
   * rotated and the file untracked, the pin reddens and names the row.
   */
  describe('the committed Google API key', () => {
    it.skip(disabled(DEFECTS.B2, 'the tracked .env holds no key'), () => {
      expect(findings.filter((finding) => finding.path === '.env')).toEqual([])
    })

    it(pin(DEFECTS.B2, 'the tracked .env still holds a key'), () => {
      expect(
        findings.some((finding) => finding.path === '.env'),
        'No secret found in .env any more. If the key has been rotated and the file ' +
          'untracked, DELETE the B2 allowlist entry and close the register row -- an ' +
          'allowlist entry for a file that is now clean is a hole nobody is watching.',
      ).toBe(true)
    })
  })

  it('finds no secret outside the allowlist', () => {
    const unexpected = findings
      .filter((finding) => !allowed.has(finding.path))
      .map((finding) => `${finding.at}  [${finding.signature}]`)

    expect(
      unexpected,
      'A secret has been COMMITTED. It is now on every clone, every fork and every ' +
        'backup of this repository, and deleting the file does not remove it from ' +
        'history. Rotate the credential first -- that is the only step that actually ' +
        'revokes it -- then remove it from the working tree.',
    ).toEqual([])
  })

  it('reports the file and the shape, never the secret itself', () => {
    // A guard that prints the key it found copies that key into CI logs, test
    // reports and issue trackers -- a second disclosure, caused by the tool
    // meant to prevent the first.
    for (const finding of findings) {
      expect(Object.keys(finding).sort()).toEqual(['at', 'line', 'path', 'signature'])
    }
  })
})
