// @vitest-environment jsdom -- renders the member detail panel
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'

import MembersPage from './Members'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'
import { DEFECTS, disabled, pin } from '../../test/knownDefects'
import { blankComments } from '../../test/sourceScan'

/**
 * A LIST-VALUED FIELD THAT ARRIVES AS A STRING -- register A37, and A38 beside it.
 *
 * 🔴 WHY THIS IS WORTH ITS OWN FILE. The server stores COSATU positions as one
 * delimited string: `MemberDto.cosatuPositions` is a `String`, and
 * `StringArrayToCommaSeparatedDeserializer` folds an incoming array into
 * `"PEC,CEC"` on the way IN. Nothing unfolds it on the way OUT, so the browser
 * receives a string where its own code expects an array.
 *
 * The detail view then calls `.join(", ")` on it and throws. The guard beside
 * the call -- `cosatuPositions?.length > 0` -- does NOT protect, and that is the
 * whole trap: a non-empty STRING has a length, so the guard passes and hands a
 * string to a method only arrays have.
 *
 * 🔑 AND THE HALF-FIX IS THE INTERESTING PART. The page DOES normalise this
 * string into an array -- but into `editForm`, for the edit controls. The
 * read-only `Detail` renders `selectedMember`, which is never normalised. So
 * somebody met this exact bug, fixed the path they were looking at, and left
 * the other one; the two live twelve lines apart in the same component.
 *
 * ⚠️ Until 2026-09-09 (retired row A11) there was no error boundary anywhere, so a render
 * error is not a broken panel. It unmounts the whole tree, and the
 * administrator gets a white screen with no message and no way back.
 *
 * The pair below is this repository's standard shape for a known defect: a
 * SKIPPED test written to the correct behaviour, and a LIVE pin asserting what
 * actually happens today. The pin reddens on the day the defect is fixed, which
 * is what stops the skipped test being forgotten.
 */

/** Exactly what the API sends for a member with two positions set. */
const MEMBER_WITH_POSITIONS = {
  id: 1,
  membershipNumber: 'M0001',
  firstNames: 'Synthetic',
  surname: 'Testperson',
  identityNumber: '9001010000080',
  status: 'Active',
  // `isCosatu`, and the value is the STRING 'Y' -- the detail panel gates the
  // whole COSATU block on `isCosatu === "Y" || isCosatu === true`. Named
  // wrongly at first here, and the pin then passed by rendering nothing at all,
  // which is worth knowing: a pin whose fixture misses the gate is a pin that
  // proves the defect is absent.
  isCosatu: 'Y',
  cosatuPositions: 'PEC,CEC',
  // 🔴 `isBec`, AND IT IS LOAD-BEARING -- added when upstream moved the gate.
  // The COSATU detail block used to sit at the top level of the panel. It is
  // now nested inside `{selectedMember.isBec && (...)}`, so a member who is not
  // a BEC member never renders it. Without this line the pin below stops
  // throwing -- not because the defect was fixed, but because the fixture no
  // longer reaches the code that has it. That reads as green-turned-red and
  // would have been "closed" on the next pass. The `.join(", ")` on line 825 of
  // Members.jsx is still exactly where it was.
  isBec: true,
}

/**
 * What A38 needs on top: the BEC block is gated separately, and the field is a
 * delimited string for the same reason the COSATU one is.
 */
const BEC_STRUCTURES = {
  isBec: true,
  isBecStructureRep: true,
  becStructures: 'BEC A,BEC B',
}

const membersRespond = (body) => http.get('*/api/members', () => HttpResponse.json(body))

/** Open the member, then the tab the positions are rendered on. */
async function openStructuresTab(user) {
  await user.click(await screen.findByText(/Testperson/))
  await user.click(await screen.findByRole('button', { name: /Sasbo Structures/i }))
}

describe('a member whose COSATU positions arrive as a delimited string', () => {
  beforeEach(() => {
    // Silencing only. React logs a render error before rethrowing it and an
    // unmocked console makes this file's output unreadable -- but the log is
    // NOT asserted on. The throw is the claim; whether React happened to log
    // first is an implementation detail of React, and pinning it would make
    // this pin redden on a React upgrade for a reason that is not the defect.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // TWO CALLS, not one. `pageFixtures` ends in a catch-all for `*/api/*`, and
    // handlers registered in a single `use` are matched in the order given --
    // so passing both together lets the catch-all answer `/api/members` with an
    // empty list and the page renders "no members". A second `use` prepends.
    server.use(...pageFixtures)
    server.use(membersRespond([MEMBER_WITH_POSITIONS]))
  })

  it.skip(
    disabled(DEFECTS.A37, 'the detail view renders the positions as text'),
    async () => {
      // Written to the correct behaviour. Neither side should have to know how
      // the other stores a list: the view renders what it was given, whether
      // that arrived as an array or as a delimited string. The repair is one
      // line -- normalise `selectedMember` the way `editForm` already is, or
      // render `editForm`, which is already normalised.
      const user = setupUser()
      renderWithProviders(<MembersPage />)
      await openStructuresTab(user)

      expect(await screen.findByText('PEC, CEC')).toBeInTheDocument()
    },
  )

  it(pin(DEFECTS.A37, 'opening the member throws instead of rendering'), async () => {
    // 🔑 ASSERTS THE CURRENT, WRONG BEHAVIOUR ON PURPOSE. The message is
    // asserted rather than just "it threw", because the useful half of this
    // finding is WHICH method was missing on WHAT -- "join is not a function"
    // is what tells the next reader the value was a string.
    const user = setupUser()
    renderWithProviders(<MembersPage />)

    await expect(openStructuresTab(user)).rejects.toThrow(/\.join is not a function/)
  })

  it.skip(
    disabled(DEFECTS.A38, 'a list-valued field renders whether it arrives as an array or a string'),
    async () => {
      // The same expression, one field over. It cannot be exercised through the
      // UI today because the server has no `becStructures` field at all, so the
      // value is `undefined` and the guard is false -- which is exactly why it
      // is recorded rather than left to be found in production.
      const user = setupUser()
      renderWithProviders(<MembersPage />)
      await openStructuresTab(user)

      expect(await screen.findByText('BEC A, BEC B')).toBeInTheDocument()
    },
  )

  it(pin(DEFECTS.A38, 'the same call, one field over, throws the same way'), async () => {
    // 🔑 BEHAVIOURAL, not a source scan. The first version of this pin regexed
    // Members.jsx for the unguarded `.join(`, on the reasoning that A38 has no
    // runtime symptom because the server does not send the field.
    //
    // That reasoning was wrong in the one way that matters: msw IS the server
    // here, and `selectedMember` is the raw API object with nothing
    // whitelisting its fields. So the symptom is one fixture away -- and the
    // text pin was strictly worse than this, because the actual repair
    // (normalising `selectedMember` upstream, which is what the skipped test
    // above describes) leaves the `.join(` call exactly where it is. The source
    // pin would have stayed GREEN through the fix it exists to detect.
    const user = setupUser()
    server.use(membersRespond([{ ...MEMBER_WITH_POSITIONS, ...BEC_STRUCTURES }]))
    renderWithProviders(<MembersPage />)

    await expect(openStructuresTab(user)).rejects.toThrow(/\.join is not a function/)
  })

})
