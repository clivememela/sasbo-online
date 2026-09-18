// @vitest-environment jsdom -- searching from a later page, and the frame in between
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Outlet, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'

import MembersPage from './Members'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * 🔴 SEARCH FROM PAGE 3 AND THE REGISTER SAID "NO MEMBER MATCHES" -- FOR MEMBERS IT WAS ABOUT TO SHOW. `10.4`.
 *
 * The register pages at 100 rows. When the list shrinks, `page` has to come down with it, and it did -- through an
 * effect (`setPage(p => Math.min(p, totalPages))`), which `react-hooks/set-state-in-effect` makes an error this
 * phase. The warning looked like a style complaint. It was describing a real frame:
 *
 *   1. the user is on page 3 and types a surname into the topbar search that 5 members share;
 *   2. React renders with `page` still 3 and `totalPages` now 1, so the slice is rows 200-5 -- EMPTY;
 *   3. that render COMMITS, and the table draws its empty state: **No member matches "needle"**;
 *   4. only then does the effect run, clamp `page` to 1, and the five rows appear.
 *
 * One frame, and it is a false statement about the union's own register -- the exact thing this arc exists to stop.
 * Criteria changes never showed it, because they call `setPage(1)` themselves. The TOPBAR search does not, and
 * that is the only path that needs the clamp at all.
 *
 * ⚠️ WHY NOTHING EVER CAUGHT IT: `Members.jsx` reads the topbar search through the OUTLET CONTEXT, and its own comment
 * says it plainly -- *"Mounted without the shell -- every test does -- there is no context and no query."* So the one
 * path that needs the clamp had never been driven by a single test. This file mounts the page under a minimal shell
 * that supplies the search, which is the whole of what it takes.
 *
 * 🔑 THE FIX IS TO DERIVE, NOT TO SYNC: `page` becomes `Math.min(requestedPage, totalPages)`, computed during render,
 * so there is no frame in which it can be out of range. A `findBy` assertion could not tell the two apart -- it
 * waits, and the rows do arrive in both -- so the empty title is watched with a MutationObserver for the whole
 * transition. Written against the code BEFORE the fix, so that it goes red for the real reason first.
 */

const PAGE_SIZE = 100
const NEEDLES = 5

// 250 members, so page 3 exists; five of them share a surname nobody else has.
const MEMBERS = Array.from({ length: 250 }, (_, i) => ({
  id: i + 1,
  membershipNumber: `M${String(i + 1).padStart(5, '0')}`,
  firstNames: 'Synthetic',
  surname: i < NEEDLES ? 'Needleworth' : `Haystack${i}`,
  identityNumber: '9001010000080',
  status: 'Active',
}))

/** The smallest shell that gives the page what the real one does: the topbar's search, through the outlet. */
function Shell({ search }) {
  return <Outlet context={{ search, setSearch: () => {} }} />
}

const page = (search) => (
  <Routes>
    <Route element={<Shell search={search} />}>
      <Route path="/" element={<MembersPage />} />
    </Route>
  </Routes>
)

/**
 * Records whether `pattern` was EVER written into the document while the observer ran -- including for a frame
 * that was removed again before anybody looked.
 *
 * 🔴 THE FIRST VERSION OF THIS READ `document.body.textContent` IN THE CALLBACK, AND IT COULD NOT SEE THE FRAME
 * IT EXISTS TO CATCH. A MutationObserver callback is a microtask; inside `act()` React flushes the clamping effect
 * synchronously, so by the time the callback ran the empty title had been written AND removed, and the current
 * text was clean. It reported "never seen" against the unfixed code -- and its must-pass passed too, because that
 * one only proved it could see a title that STAYS. So it reads the MUTATION RECORDS instead: every node added is
 * delivered in `addedNodes` even if it is gone by delivery time, which is the one thing a transient frame leaves.
 */
function watchFor(pattern) {
  let seen = false
  const inspect = (records) => {
    for (const record of records) {
      if (record.type === 'characterData' && pattern.test(record.target.textContent ?? '')) seen = true
      for (const node of record.addedNodes) {
        if (pattern.test(node.textContent ?? '')) seen = true
      }
    }
  }
  const observer = new MutationObserver(inspect)
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  if (pattern.test(document.body.textContent ?? '')) seen = true
  return {
    stop: () => {
      inspect(observer.takeRecords())
      observer.disconnect()
      return seen
    },
  }
}

let watcher

describe('the register, searched from a later page', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(...pageFixtures)
    server.use(http.get('*/api/members', () => HttpResponse.json(MEMBERS)))
  })

  afterEach(() => watcher?.stop())

  async function onPageThree() {
    const user = setupUser()
    const view = renderWithProviders(page(''))
    await screen.findByText('M00001')
    await user.click(screen.getByRole('button', { name: /Next/ }))
    await user.click(screen.getByRole('button', { name: /Next/ }))
    // Page 3 is rows 201-250.
    expect(await screen.findByText(`M${String(2 * PAGE_SIZE + 1).padStart(5, '0')}`)).toBeInTheDocument()
    return view
  }

  it('never claims "no member matches" on the way to the members that do', async () => {
    const { rerender } = await onPageThree()

    watcher = watchFor(/No member matches/)
    rerender(page('needleworth'))

    // Every one of the five arrives...
    expect(await screen.findByText('M00001')).toBeInTheDocument()
    expect(screen.getByText('M00005')).toBeInTheDocument()

    // ...and at NO point on the way did the page say none of them existed.
    expect(
      watcher.stop(),
      'The register drew "No member matches" for a search that matches five members -- the frame where ' +
        '`page` was still 3 and the list had one page. Derive the page; do not clamp it in an effect.',
    ).toBe(false)
  })

  it('the must-pass: a search that genuinely matches nothing DOES say so, so the watch above can see it', async () => {
    // 🔑 WITHOUT THIS THE TEST ABOVE COULD PASS VACUOUSLY -- an observer that was never able to
    // see the empty title (wrong text, wrong node, never attached) reports "not seen" whether or
    // not the frame happened. Here the title is the right answer, and the watch must catch it.
    const { rerender } = await onPageThree()

    watcher = watchFor(/No member matches/)
    rerender(page('nobody-has-this-surname'))

    expect(await screen.findByText(/No member matches/)).toBeInTheDocument()
    expect(watcher.stop()).toBe(true)
  })

  it('the clamp is kept: clear the search afterwards and you are on page 1, not thrown back to page 3', async () => {
    /*
     * 🔑 THIS GUARDS THE FIX, NOT THE DEFECT -- and it was written after catching the obvious fix
     * breaking it. The old effect clamped PERMANENTLY. The natural replacement, `Math.min(asked,
     * total)` alone, clamps only what is SHOWN and leaves what was asked for at 3 -- so the moment
     * the search is cleared and the list is long again, the register jumps to a page the user
     * never chose. Green against the old code; red against the naive derivation.
     */
    const { rerender } = await onPageThree()

    rerender(page('needleworth'))
    expect(await screen.findByText('M00005')).toBeInTheDocument()

    rerender(page(''))
    expect(await screen.findByText('M00001')).toBeInTheDocument()
    expect(screen.queryByText(`M${String(2 * PAGE_SIZE + 1).padStart(5, '0')}`)).not.toBeInTheDocument()
  })
})
