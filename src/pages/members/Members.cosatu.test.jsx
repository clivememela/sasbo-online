// @vitest-environment jsdom -- renders the member detail panel
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'

import MembersPage from './Members'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'
import { DEFECTS, disabled, pin } from '../../test/knownDefects'

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
  // ⚠️ `isBec` IS STILL HERE, AND THE REASON HAS CHANGED -- which is worth writing
  // down, because a line kept for a reason that has expired is how a fixture quietly
  // stops testing what it claims to.
  //
  // It was added when `07cd8ec` nested the COSATU block inside
  // `{selectedMember.isBec && (...)}`: without it the A37 pin stopped throwing, not
  // because the defect was fixed but because the fixture no longer reached the code that
  // had it. `04.2` UN-NESTED that block (N5 / BR-15), so A37 is now reachable for any
  // COSATU member, BEC or not.
  //
  // 🔑 It stays because A38 needs it. `becStructures` is still inside the BEC gate,
  // so the second pin -- the same `.join(", ")` one field over -- would go quiet without
  // it. Same line, different pin, and the two must not be confused: the `04.2` test below
  // asserts the un-nesting precisely so nothing has to infer it from this fixture.
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

/**
 * Open the member, then the section the positions are rendered on.
 *
 * ⚠️ THE FIRST STEP CHANGED IN `04.2` AND THE PINS ARE OTHERWISE UNTOUCHED. The row
 * used to be a `<tr onClick>`, so clicking the member's NAME opened the record -- and only
 * a mouse could do it. The register is the `Table` primitive now, which offers no
 * `onRowClick` at all, so the action is a real button on the membership number. That is a
 * presentation change to the register; A37 and A38 are the Capture Member arc's to fix
 * (IMPLEMENTATION.md: "A37 and A38 are not ours to fix"), and the `.join(", ")` they pin
 * is exactly where it was.
 */
async function openStructuresTab(user) {
  await user.click(await screen.findByRole('button', { name: /open the record for/i }))
  await user.click(await screen.findByRole('button', { name: /Structures/i }))
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

/**
 * N5 / BR-15 -- COSATU IS PARALLEL TO BEC, NOT NESTED INSIDE IT.
 *
 * 🔴 THE DEFECT: `07cd8ec` put the whole COSATU block inside `editForm.isBec &&` in
 * this file while leaving it UNGATED in `CaptureMember.jsx`. So the same member could be
 * captured as COSATU and then have that disappear from their record the moment they were
 * not also a BEC member -- data that exists, was entered deliberately, and cannot be seen
 * or edited. `V19` models COSATU parallel to BEC, and a stakeholder confirmed via the
 * owner on 2026-09-09 that there is no eligibility gate. Two independent sources.
 *
 * 🔑 THIS IS THE ASSERTION THAT MAKES THE FIX PERMANENT. A comment saying "un-nested"
 * is undone by one well-meaning edit that re-adds the guard; a fixture with `isBec: false`
 * and COSATU data is not.
 */
describe('a COSATU member who is not a BEC member', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(...pageFixtures)
    server.use(
      membersRespond([
        {
          ...MEMBER_WITH_POSITIONS,
          isBec: false,
          cosatuPositions: ['PEC'],
          cosatuLocal: 'Braamfontein',
          cosatuRegion: 'Gauteng South',
        },
      ]),
    )
  })

  it('can still see their COSATU record', async () => {
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructuresTab(user)

    // The three facts that used to vanish with the BEC flag.
    expect(await screen.findByText('Braamfontein')).toBeInTheDocument()
    expect(screen.getByText('Gauteng South')).toBeInTheDocument()
    expect(screen.getByText('PEC')).toBeInTheDocument()
  })

  it('can still EDIT their COSATU record', async () => {
    // 🔴 THE READ SIDE AND THE EDIT SIDE ARE TWO GATES, AND THE FIRST VERSION OF THIS
    // FILE ONLY COVERED ONE. Proved by mutation: re-adding `editForm.isBec &&` to the
    // edit branch left every assertion above GREEN, because they all read the record
    // rather than edit it. A member whose COSATU data is visible but uneditable is half
    // of N5, and half of a defect is still a defect.
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructuresTab(user)
    await user.click(screen.getByRole('button', { name: /Edit Member/i }))

    expect(await screen.findByLabelText(/^COSATU Local/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Region within Local/i)).toBeInTheDocument()
  })

  it('and the BEC-only detail is still absent, so the un-nesting did not flatten everything', () => {
    // 🔑 THE MUST-PASS HALF. "COSATU shows for a non-BEC member" is also satisfied by a
    // panel that renders every block unconditionally -- which would be a different defect,
    // showing BEC roles for someone who has none. This asserts the BEC gate SURVIVED.
    // Synchronous and query-based: the point is what is NOT there.
    renderWithProviders(<MembersPage />)
    expect(screen.queryByText(/BEC Executive Position/i)).not.toBeInTheDocument()
  })
})

/**
 * BR-14 -- THE TWO UNLABELLED CHECKBOXES ARE GONE.
 *
 * 🔴 What was there: `["COSATU Local", "Region within Local"].map(...)` rendering a
 * `<label>` containing a checkbox and NO TEXT AT ALL. Two controls with an empty
 * accessible name, side by side -- and they wrote their labels into `cosatuPositions`, the
 * POSITIONS array, so a member's STRUCTURE was recorded as though it were a role. The
 * agreed `cosatuPositions` wire shape is positions only.
 */
describe('BR-14 -- COSATU structure is two named fields, not two nameless checkboxes', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(...pageFixtures)
    server.use(membersRespond([{ ...MEMBER_WITH_POSITIONS, cosatuPositions: [], isCosatu: 'Y' }]))
  })

  it('offers COSATU Local and Region as labelled text fields while editing', async () => {
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructuresTab(user)
    await user.click(screen.getByRole('button', { name: /Edit Member/i }))

    // By LABEL, which is the whole point: the controls these replace had none.
    expect(await screen.findByLabelText(/^COSATU Local/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Region within Local/i)).toBeInTheDocument()
  })

  it('leaves no control on the form without an accessible name', async () => {
    const user = setupUser()
    renderWithProviders(<MembersPage />)
    await openStructuresTab(user)
    await user.click(screen.getByRole('button', { name: /Edit Member/i }))

    // 🔑 THE CLASS, NOT THE INSTANCE (contract 17). Naming the two checkboxes would
    // have fixed the two the register happened to describe. This asks the same question
    // of every checkbox on the panel, so the next one to arrive nameless is caught by the
    // test that was written for the last one.
    const nameless = [...document.querySelectorAll('input[type="checkbox"]')].filter(
      (box) => !(box.labels?.[0]?.textContent || box.getAttribute('aria-label') || '').trim(),
    )
    expect(
      nameless.length,
      'A checkbox on the member panel has no accessible name -- the BR-14 shape, back ' +
        'again. A screen-reader user meets a box and cannot know what ticking it means.',
    ).toBe(0)
  })
})
