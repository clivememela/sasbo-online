// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'

import * as memberConstants from '../config/memberConstants'
import {
  REPO_ROOT,
  committedVocabulary,
  discoverServiceModules,
} from './apiContractScan.js'
import {
  FLOORS,
  assertBlankingPreservedCode,
  assertNonVacuousScan,
} from './assertNonVacuousScan'
import { DEFECTS, disabled, pin } from './knownDefects'
import { blankingDestroyedCode, readSources } from './sourceScan.js'

/**
 * VOCABULARY DRIFT: a constant copied instead of referenced.
 *
 * The endpoint guard next door catches a PATH that does not exist. It cannot
 * catch a string CONSTANT that has drifted -- and drift is the quieter defect,
 * because the request succeeds, the screen renders, and a branch that was
 * supposed to run simply never does. Nothing is red. Nothing is logged. The
 * rule just silently stops applying.
 *
 * WRITTEN AGAINST THE CLASS, NOT THE INSTANCE
 * The field/vocabulary pairs are DERIVED from `memberConstants` -- every
 * `X_Y_OPTIONS` export is the vocabulary for field `xY`, and a field whose name
 * ENDS with a discovered vocabulary name shares it. This guard does not name
 * `paymentType` and `identityType`, the two fields that prompted it. Add a
 * `TENURE_OPTIONS` tomorrow and comparisons against `tenure` are checked the
 * same day, because it exists rather than because somebody remembered.
 *
 * COMMENTS ARE BLANKED FIRST
 * The comment explaining a known-broken constant contains the very string being
 * searched for -- `usePaymentTypeValidation.test.jsx` says `'Payroll Deduction'`
 * in prose. A guard its own subject's docs can falsify is not a guard.
 *
 * @vitest-environment node -- it reads files and imports arrays of strings.
 * Measured 2026-09-05: 5.39s with jsdom against 1.77s without, for identical
 * results. jsdom was ~47% of this file's wall clock and nothing in it reads a
 * DOM.
 */

const camelCase = (snake) =>
  snake
    .toLowerCase()
    .split('_')
    .map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join('')

/**
 * Fields whose vocabulary constant is not named after them.
 *
 * ⚠️ A SUFFIX RULE WAS TRIED HERE FIRST, AND RUNNING IT KILLED IT. The idea was
 * that a field whose name ends with a vocabulary's base name inherits it, so
 * `subscriptionFrequency` and `endowmentFrequency` would both find
 * `FREQUENCY_OPTIONS` without being listed. It generalises cleanly and it is
 * WRONG: `electedRep` ends in `Rep`, so it inherited `REP_OPTIONS` -- 64 people
 * names -- and the guard immediately convicted `form.electedRep === "Y"`, which
 * is correct code. `electedRep` is a Y/N flag; its name merely ends in the same
 * three letters.
 *
 * That is the "cries wolf" failure this arc keeps naming, reached by a rule
 * that looked more principled than the list it replaced. A false positive on
 * the first run is worse than a list, because the list is honest about being a
 * list. So the aliases are named, and every one is asserted to carry a reason.
 */
const FIELD_ALIASES = {
  subscriptionFrequency: {
    constant: 'FREQUENCY_OPTIONS',
    why: 'the frequency of the Sasbo subscription, drawn from the same four values as any other frequency. The constant is named for the concept, the field for the thing it belongs to.',
  },
  endowmentFrequency: {
    constant: 'FREQUENCY_OPTIONS',
    why: 'the same four values, for the endowment fund rather than the subscription.',
  },
}

/**
 * Y/N flags, DISCOVERED rather than listed.
 *
 * This one generalises safely, because it keys on what the repository itself
 * says a field IS rather than on how its name is spelled: any member field
 * whose own label ends in `(Y/N)` takes `YES_NO_OPTIONS`. Add a flag tomorrow
 * and it is covered the same day. It is also what makes `electedRep` resolve
 * correctly -- its label is `Elected Sasbo Recruiter (Y/N)`.
 */
function yesNoFields() {
  return Object.entries(memberConstants.MEMBER_FIELD_LABEL_MAP ?? {})
    .filter(([, label]) => /\(Y\/N\)\s*$/.test(label))
    .map(([field]) => field)
}

/** field name -> { constant, values }, discovered from the constants module. */
function vocabularies() {
  const found = {}

  for (const [name, value] of Object.entries(memberConstants)) {
    if (!name.endsWith('_OPTIONS') || !Array.isArray(value) || value.length === 0) continue
    found[camelCase(name.replace(/_OPTIONS$/, ''))] = { constant: name, values: value }
  }

  for (const field of yesNoFields()) {
    found[field] = { constant: 'YES_NO_OPTIONS', values: memberConstants.YES_NO_OPTIONS }
  }

  for (const [field, { constant }] of Object.entries(FIELD_ALIASES)) {
    if (Array.isArray(memberConstants[constant]) && memberConstants[constant].length > 0) {
      found[field] = { constant, values: memberConstants[constant] }
    }
  }

  return found
}

/** Every `x.field === 'literal'` comparison in the screens and the hooks. */
function comparisons() {
  const sources = [
    ...readSources(join(REPO_ROOT, 'src', 'pages'), { root: REPO_ROOT, pattern: /\.jsx?$/ }),
    ...readSources(join(REPO_ROOT, 'src', 'hooks'), { root: REPO_ROOT, pattern: /\.jsx?$/ }),
  ].filter((source) => !source.path.includes('.test.'))

  const vocab = vocabularies()

  // Compiled ONCE per field, not once per field per line. The pattern depends
  // only on the field name, and building it inside the loop meant 119,070
  // RegExp constructions per run to find 47 matches -- measured 2026-09-05 at
  // ~450ms cold, against ~330ms hoisted.
  const compiled = Object.entries(vocab).map(([field, entry]) => [
    field,
    entry,
    new RegExp(
      `([A-Za-z_$][\\w$]*\\s*\\.\\s*)?\\b${field}\\b\\s*[=!]==\\s*(['"])([^'"]*)\\2`,
      'g',
    ),
  ])

  const found = []

  for (const source of sources) {
    source.code.split('\n').forEach((line, index) => {
      for (const [field, entry, pattern] of compiled) {
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(line)) !== null) {
          const receiver = (match[1] || '').replace(/[\s.]/g, '') || '(param)'
          found.push({
            field,
            receiver,
            literal: match[3],
            at: source.at(index + 1),
            inVocabulary: entry.values.includes(match[3]),
            key: `${source.path} :: ${receiver}.${field} === ${JSON.stringify(match[3])}`,
          })
        }
      }
    })
  }

  return { sources, found }
}

/**
 * Every comparison against a value its own options array cannot produce.
 *
 * 🔴 THE SAME LITERAL IS A DEFECT IN ONE FILE AND CORRECT IN ANOTHER, which is
 * why this is keyed by SITE and not by string. `'Payroll Deduction'` in
 * `Members.jsx` normalises a legacy value that really can arrive -- `MemberDto`
 * declares `paymentType` as a String, so whatever is stored is passed straight
 * through. The identical comparison in `usePaymentTypeValidation` branches on
 * the value the FORM holds, which comes from `PAYMENT_TYPE_OPTIONS` and can
 * never be that string. One is defensive; the other is dead code.
 *
 * Keyed by file rather than by file:line on purpose: a line number moves when
 * anyone edits anything above it, and a guard that reddens for an unrelated
 * edit is a guard that gets switched off.
 *
 * `defect` is the REGISTER ROW itself, never a copy of its prose -- an earlier
 * draft restated A6 and A7 here and had already drifted from the register by
 * the time it was reviewed.
 */
const EXPECTED = {
  'src/hooks/usePaymentTypeValidation.js :: (param).paymentType === "Payroll Deduction"': {
    verdict: 'DEFECT',
    defect: DEFECTS.A6,
    why: 'compared against a value no option can produce, so this branch can NEVER be true.',
  },
  'src/pages/members/CaptureMember.jsx :: form.identityType === "Passport"': {
    verdict: 'DEFECT',
    defect: DEFECTS.A7,
    why: 'the dropdown offers "Passport Number", so this rule has never once run.',
  },
  'src/pages/members/Members.jsx :: editForm.identityType === "Passport"': {
    verdict: 'DEFECT',
    defect: DEFECTS.A7,
    why: 'the SECOND site of A7, in the edit screen -- the one the register missed.',
  },
  'src/pages/members/Members.jsx :: (param).paymentType === "Payroll Deduction"': {
    verdict: 'ACCEPTED',
    why:
      'normalizePaymentType, and it is LIVE rather than dead. MemberDto.paymentType is a ' +
      'String passed through from storage, not the PaymentType enum, so a legacy ' +
      '"Payroll Deduction" row really can reach the browser. This is the client-side twin ' +
      'of the server PAYROLL_DEDUCTION shim in PaymentType.fromString.',
  },
  'src/pages/maintainance/Subscriptions.jsx :: sub.status === "ACTIVE"': {
    verdict: 'ACCEPTED',
    why:
      'a SUBSCRIPTION status, not a member status. The server declares SubscriptionsStatus ' +
      '{PENDING, ACTIVE, CANCELLED, INACTIVE} with no display names, so Jackson puts the ' +
      'enum NAME on the wire and upper case is correct here. STATUS_OPTIONS is the member ' +
      'vocabulary -- a different list that happens to share a field name.',
  },
  'src/pages/maintainance/Subscriptions.jsx :: sub.status === "PENDING"': {
    verdict: 'ACCEPTED',
    why: 'the same subscription vocabulary as the ACTIVE comparison beside it.',
  },
}

describe('vocabulary parity between this browser and its server', () => {
  const { sources, found } = comparisons()
  const vocab = vocabularies()
  const offenders = found.filter((comparison) => !comparison.inVocabulary)
  const offendingKeys = [...new Set(offenders.map((offender) => offender.key))].sort()

  describe('the scan actually scanned something', () => {
    it('discovered the option-backed fields from the constants themselves', () => {
      assertNonVacuousScan(
        Object.keys(vocab),
        FLOORS.OPTION_BACKED_FIELDS,
        'option-backed fields in memberConstants',
      )

      // The five the plan named must all be reachable, or the convention that
      // derives them has broken and the guard is checking the wrong fields.
      expect(Object.keys(vocab)).toEqual(
        expect.arrayContaining([
          'identityType',
          'paymentType',
          'status',
          'employmentType',
          'subscriptionFrequency',
        ]),
      )
    })

    it('found comparisons to look at', () => {
      assertNonVacuousScan(
        found,
        FLOORS.VOCABULARY_COMPARISONS,
        'comparisons against option-backed fields',
      )
    })

    it('did not destroy any code while blanking comments', () => {
      assertBlankingPreservedCode(blankingDestroyedCode(sources))
    })
  })

  describe('every comparison against an option-backed field', () => {
    it('is either in that field options, or a known and explained site', () => {
      const unexplained = offenders
        .filter((offender) => !Object.hasOwn(EXPECTED, offender.key))
        .map((offender) => `${offender.at}  ${offender.key}`)

      expect(
        unexplained,
        'A comparison against a value the field options cannot produce. If the receiver ' +
          'holds a value chosen from those options, this branch can NEVER be true and the ' +
          'rule it guards has never run. If it legitimately holds a value from somewhere ' +
          'else -- a different enum, or legacy storage -- add it to EXPECTED as ACCEPTED ' +
          'with the reason.',
      ).toEqual([])
    })

    it('EXPECTED names every drifted site and no others', () => {
      // Deduplicated, because ONE site legitimately appears on several lines --
      // `identityType === "Passport"` is at CaptureMember.jsx:270 and :446, one
      // defect in two places. EXPECTED is keyed by site, so the comparison must
      // be too, or the count would drift every time a file gained a line.
      expect(
        offendingKeys,
        'EXPECTED is out of date. A key here that the scan no longer finds means the site ' +
          'was fixed or moved: close its register row. A key the scan finds that is not ' +
          'here is new drift.',
      ).toEqual([...new Set(Object.keys(EXPECTED))].sort())
    })

    it('every ACCEPTED site carries a reason somebody can check', () => {
      // An exception nobody can see is where the real drift hides next time.
      for (const [key, entry] of Object.entries(EXPECTED)) {
        if (entry.verdict !== 'ACCEPTED') continue
        expect(entry.why, `${key} is ACCEPTED with no reason`).toBeTruthy()
        expect(entry.why.length).toBeGreaterThan(40)
      }
    })
  })

  /**
   * The drifted constants, through the register rather than beside it.
   *
   * A6 and A7 already carry a skip and a pin in the files that own their
   * behaviour; these are the SCAN's half -- the assertion that the drift is
   * still discoverable by looking at the source, which is what would notice a
   * third site appearing.
   */
  describe('the drifted constants', () => {
    it.skip(disabled(DEFECTS.A6, 'no dead payment-type comparison survives'), () => {
      expect(offendingKeys.filter((key) => key.includes('usePaymentTypeValidation'))).toEqual([])
    })

    it(pin(DEFECTS.A6, 'the dead payment-type branch is still there'), () => {
      expect(offendingKeys).toContain(
        'src/hooks/usePaymentTypeValidation.js :: (param).paymentType === "Payroll Deduction"',
      )
    })

    it.skip(disabled(DEFECTS.A7, 'no screen compares identityType to "Passport"'), () => {
      expect(offendingKeys.filter((key) => key.includes('identityType'))).toEqual([])
    })

    it(pin(DEFECTS.A7, 'BOTH screens still compare identityType to "Passport"'), () => {
      // Both, deliberately. The register named only CaptureMember until this
      // scan found the edit screen too, and a pin that checked one of the two
      // would go green on a half-finished repair.
      expect(offendingKeys).toContain(
        'src/pages/members/CaptureMember.jsx :: form.identityType === "Passport"',
      )
      expect(offendingKeys).toContain(
        'src/pages/members/Members.jsx :: editForm.identityType === "Passport"',
      )
    })
  })

  describe('the vocabulary the server publishes', () => {
    const vocabulary = committedVocabulary()

    it('contains every payment type this browser offers', () => {
      // SUBSET, not equality, and deliberately so: the server may legitimately
      // hold values the browser does not offer. Equality would redden the day
      // the server grows, which is a normal thing for it to do.
      expect(
        vocabulary.paymentTypes.map((type) => type.displayName),
        'PAYMENT_TYPE_OPTIONS offers a payment type this server does not accept. A member ' +
          'choosing it reaches a real person as a failed capture, not as a warning.',
      ).toEqual(expect.arrayContaining(memberConstants.PAYMENT_TYPE_OPTIONS))
    })
  })

  describe('the failure envelope', () => {
    const vocabulary = committedVocabulary()

    it('publishes the keys an error response can carry', () => {
      assertNonVacuousScan(
        vocabulary.errorEnvelopeKeys,
        FLOORS.ENVELOPE_KEYS,
        'error envelope keys in the artifact',
      )
      expect(vocabulary.errorEnvelopeKeys).toEqual(
        expect.arrayContaining(['status', 'message', 'validationErrors']),
      )
    })

    it(pin(DEFECTS.A24, 'no service reads a single key of the error envelope'), () => {
      // Every service throws `HTTP ${r.status}: ${r.statusText}` -- the HTTP
      // Response's own fields, never the server's JSON body. So `message`,
      // `validationErrors` and the rest are published, sent, and discarded: a
      // 400 listing exactly which fields are invalid reaches the user as
      // "HTTP 400: Bad Request", and the form highlights nothing.
      //
      // Matched in a MEMBER position or a destructuring, not only as
      // `body.<key>` -- `const { validationErrors } = await r.json()` is the
      // more idiomatic repair, and a pin watching one syntax would stay green
      // while the defect was being fixed.
      //
      // ⚠️ THE RECEIVER IS NAMED POSITIVELY, AND IT HAS TO BE. Three of the
      // envelope's six keys collide with names this code already uses for
      // something else: `r.status` is the HTTP status line, `console.error` is
      // not the envelope's `error`, and `err.message` is a JavaScript Error.
      // A detector matching any `.status` reported A24 as FIXED on its first
      // run while nothing had changed -- found by running it, twice: a
      // blacklist of receiver names then missed `branchesResponse.status`,
      // because a blacklist has to predict every name anyone will ever choose.
      //
      // So this matches only a receiver that IS the parsed body. The envelope
      // arrives from `.json()`, and a repair binds it to something body-shaped
      // or destructures it. Both are covered; nothing else is.
      const BODY = 'body|payload|json|data|envelope|problem|errorBody|responseBody'
      const sources = discoverServiceModules()

      // Built once per KEY, not once per (key, source) pair. The pattern
      // depends only on the key, and this file already paid for that lesson 260
      // lines above: "building it inside the loop meant 119,070 RegExp
      // constructions per run to find 47 matches -- measured 2026-09-05 at
      // ~450ms cold, against ~330ms hoisted." Same slip, smaller loop.
      const keysRead = vocabulary.errorEnvelopeKeys.filter((key) => {
        const reads = new RegExp(
          `\\b(?:${BODY})\\s*\\.\\s*${key}\\b` + `|\\{[^}]*\\b${key}\\b[^}]*\\}\\s*=[^=]`,
          'i',
        )
        return sources.some((source) => reads.test(source.code))
      })

      expect(
        keysRead,
        'A service now reads the error envelope. Good -- A24 is being fixed. Assert the ' +
          'keys it reads against api-vocabulary.json rather than against a guess, then ' +
          'replace this pin with that assertion and close row A24.',
      ).toEqual([])
    })
  })
})
