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
 * ⚠️ With A11 -- no error boundary anywhere in the application -- a render
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

  it(pin(DEFECTS.A38, 'the unsafe expression is still in the source, one field over'), () => {
    // 🔑 A SOURCE PIN, because A38 has no runtime symptom to assert yet -- the
    // field is not sent. That is what makes it latent rather than fixed, and a
    // latent defect with no assertion is one nobody will remember. This reddens
    // the day somebody repairs the expression, which is the signal the pin is
    // for.
    //
    // Comments are blanked first: a fix that leaves the old line quoted in a
    // comment above the new one would otherwise keep this pin green.
    // Read from the project root, which is where Vitest runs, rather than
    // relative to this module -- `import.meta.url` points at the TRANSFORMED
    // module under Vitest and does not resolve back to the file on disk.
    const source = blankComments(readFileSync('src/pages/members/Members.jsx', 'utf8'))

    expect(
      /selectedMember\.becStructures\.join\(/.test(source),
      'becStructures is no longer joined unguarded -- if that is a fix, delete this pin, ' +
        'un-skip the A38 test above and close the register row',
    ).toBe(true)
  })

  it(
    pin(DEFECTS.A37, 'the guard beside the call does not protect, and this is why'),
    () => {
      // The defect in one line, isolated from React entirely. This is the shape
      // the codebase should stop writing, and it is worth pinning separately
      // because the same expression appears a second time twelve lines away --
      // register A38, latent only because that field is not sent yet.
      const fromTheApi = 'PEC,CEC'

      expect(fromTheApi?.length > 0).toBe(true) // the guard passes...
      expect(() => fromTheApi.join(', ')).toThrow(TypeError) // ...and the call throws

      // An array of the same content is what the view is written for.
      expect(['PEC', 'CEC'].join(', ')).toBe('PEC, CEC')
    },
  )
})
