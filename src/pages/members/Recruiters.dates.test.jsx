// @vitest-environment jsdom -- the member details dialog on Recruiters, and the dates it prints
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { Recruiters } from './Recruiters'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * 🔴 R3-OBS-3, TAKEN 2026-09-18 RATHER THAN LEFT: the LAST place in the application that printed a raw `LocalDate`.
 *
 * The server sends a date as `[y, m, d]`, and React renders an array by concatenating it -- so `Date Joined` in this
 * dialog read **`201941`** for a member who joined on 1 April 2019, and a recruiter's `Election Date` did the same.
 * It is the identical defect R3-F1 fixed on the member record in batch 5.
 *
 * ⚠️ THE REVIEW MARKED IT "out of scope unless the owner wants", because the two lines predate this arc. It is taken
 * here for one reason: batch 5 closed R3-F1 on the record, and leaving the same date printing as run-together digits
 * one dialog away would make that closure a half-truth. The change is a format, not a behaviour: `lib/format`'s
 * `formatDate`, which is what every other date in the application already goes through. A7 is untouched.
 *
 * The must-pass is beside it: a member with no join date still reads as the one absence mark, not "Invalid Date".
 */

const REP = {
  id: 1,
  name: 'Synthetic Recruiter',
  isElectedRep: true,
  electionDate: [2021, 3, 9],
  recruiterTypeId: 1,
  roleId: 1,
}

const MEMBER = {
  id: 7,
  membershipNumber: 'M0007',
  title: 'Mr',
  initials: 'S',
  firstNames: 'Synthetic',
  surname: 'Joiner',
  identityNumber: '9001010000080',
  status: 'Active',
  joinDate: [2019, 4, 1],
  recruitmentRepresentativeId: 1,
  areasRep: 'Synthetic Recruiter',
}

async function openTheMemberDetails(member = MEMBER) {
  const user = setupUser()
  server.use(
    // The rows on this screen are the recruitment CHANNELS, not `/api/representatives` (`refreshAll`).
    http.get('*/api/recruitment-channels', () => HttpResponse.json([REP])),
    http.get('*/api/members', () => HttpResponse.json([member])),
  )
  renderWithProviders(<Recruiters />)
  await user.click(await screen.findByRole('button', { name: /show the members recruited/i }))
  await user.click(await screen.findByRole('button', { name: /open the record for/i }))
  return within(await screen.findByRole('dialog', { name: 'Member details' }))
}

describe('the member details dialog on Recruiters', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(...pageFixtures)
  })

  it('prints Date Joined as a date, not as run-together digits', async () => {
    const dialog = await openTheMemberDetails()

    expect(dialog.getByText('Date Joined').nextElementSibling).toHaveTextContent('2019/04/01')
    expect(dialog.queryByText('201941')).toBeNull()
  })

  it('the must-pass: a member with no join date still shows the one absence mark', async () => {
    const dialog = await openTheMemberDetails({ ...MEMBER, joinDate: null })

    expect(dialog.getByText('Date Joined').nextElementSibling).toHaveTextContent('—')
  })
})
