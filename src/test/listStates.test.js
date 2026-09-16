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
 * 🔴 A27 WAS ONE INSTANCE OF A CLASS, AND THE PLAN SAID SO BEFORE ANYONE LOOKED.
 * `IMPLEMENTATION.md`: *"A27 is probably one instance of a class — MobiZone found the same
 * defect on 15 surfaces."* `04.2` closed it on the member register. `04.3` then found the
 * same shape on two more screens, and both were WORSE than A27 had been:
 *
 *     bankService.getBanks().then(setBanks)
 *     memberService.getMembers().then(setMembersList)
 *
 * No `.catch` at all. A failed request became an unhandled rejection and the screen
 * rendered *"No banks match your search"* — a confident wrong answer with not even a
 * console line behind it. A27 at least logged.
 *
 * 🔑 SO THE FIX IS A RULE, NOT THREE REPAIRS. This asserts the property that made all
 * three defects possible: **a page that fetches must be able to say the fetch failed.**
 * The next list screen anybody adds is covered by a test written for the last one.
 *
 * ⚠️ WHAT IT DELIBERATELY DOES NOT CHECK. It cannot tell a GOOD error state from a
 * present one — that is what `Members.states.test.jsx` does, by driving a 500 and asserting
 * both halves of the three-state rule. This is the cheap structural half: it catches the
 * page that never had the option, which is the one that ships.
 */

/** A page that fetches: it calls a service module and renders. */
const FETCHES = /\b\w+Service\s*\.\s*\w+\s*\(/

/**
 * A REJECTION PATH — something that actually runs when the promise rejects.
 *
 * 🔴 THE FIRST VERSION OF THIS WAS TOO GENEROUS, AND THE MUTATION PROOF IS WHAT SAID SO.
 * It also accepted `setListState`, `setError` and an `error` binding, on the reasoning
 * that a narrower pattern would convict correct code and get switched off. Deleting the
 * `.catch` from `BankBranch` — the exact defect this guard exists for — left
 * `setListState('loading')` and `setListState('ready')` in the file, so the pattern still
 * matched and the guard stayed GREEN.
 *
 * 🔑 IT WAS MATCHING THE MACHINERY, NOT THE WIRING. A page carrying an error state
 * variable and no `.catch` is not a page that handles failure; it is a page that LOOKS
 * like one, which is strictly worse — the next reader sees the state variable and stops
 * asking. Only a rejection handler runs on a rejection, so only a rejection handler
 * counts.
 *
 * ⚠️ The reasoning that produced the loose version was not silly, and it is kept here
 * because it is the trap: "do not be so strict that the guard gets switched off" is good
 * advice that, applied without a mutation to check it against, produces a guard that
 * cannot fail.
 */
const HANDLES_FAILURE = /\.catch\s*\(|\bcatch\s*\(|\.then\s*\([^)]*,\s*(?:\(|function)/

/**
 * Pages that fetch nothing of their own, or fetch through a component that does.
 *
 * Each is here with a reason, and the reason is checked: a page on this list that DOES
 * fetch reddens the test, so the list cannot quietly become an exemption.
 */
const NO_FETCH_OF_THEIR_OWN = {}

function pages() {
  return readSources(join(REPO_ROOT, 'src', 'pages'), { root: REPO_ROOT, pattern: /\.jsx$/ })
    .filter((source) => !/\.test\./.test(source.path))
}

describe('every page that fetches can say the fetch failed', () => {
  it('finds no page whose only outcome is data', () => {
    const sources = pages()

    assertNothingWasSkipped(unreadableDirectories(), 'the list-state scan')
    assertBlankingPreservedCode(blankingDestroyedCode(sources))
    assertNonVacuousScan(sources, FLOORS.PAGE_FILES, 'page components under src/pages/')

    // 🔑 THE MUST-PASS HALF, and without it this whole file is satisfied by a regex that
    // matches nothing. If `FETCHES` stopped matching, no page would fetch, none could be
    // an offender, and the suite would report the rule holding over an empty population.
    const fetching = sources.filter((source) => FETCHES.test(source.code))

    expect(
      fetching.length,
      'No page appears to call a service at all. That is a broken pattern, not an ' +
        'application that stopped fetching — and it makes every assertion below vacuous.',
    ).toBeGreaterThan(5)

    const silent = fetching
      .filter((source) => !HANDLES_FAILURE.test(source.code))
      .map((source) => source.path)

    expect(
      silent,
      'These pages call a service and have no way to represent a failure — no `.catch`, ' +
        'no `try`, no error state. A rejected request becomes an unhandled rejection and ' +
        'the screen renders its EMPTY state: "no members match your search" when the ' +
        'backend is down. That is register row A27, which `04.2` closed on the member ' +
        'register, and the plan predicted it was one instance of a class.',
    ).toEqual([])
  })

  it('the exemption list names only pages that genuinely do not fetch', () => {
    // The list is empty today. The assertion exists so that the day somebody adds to it,
    // the entry has to be TRUE — a page listed as "fetches nothing" that calls a service
    // reddens this immediately, which is what stops the list becoming a way to pass.
    const sources = pages()
    const wronglyListed = Object.keys(NO_FETCH_OF_THEIR_OWN).filter((path) => {
      const source = sources.find((candidate) => candidate.path === path)
      return source && FETCHES.test(source.code)
    })

    expect(
      wronglyListed,
      'A page is exempted as "fetches nothing of its own" and calls a service. Either the ' +
        'exemption is stale or it was never true.',
    ).toEqual([])

    const missing = Object.keys(NO_FETCH_OF_THEIR_OWN).filter(
      (path) => !sources.some((source) => source.path === path),
    )
    expect(missing, 'An exempted page is not on disk under that path.').toEqual([])
  })
})
