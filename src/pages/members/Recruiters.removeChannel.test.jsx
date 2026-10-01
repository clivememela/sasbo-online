// @vitest-environment jsdom -- Recruiters: Remove recruiter removes the channel it listed (A49, MO21)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { Recruiters } from './Recruiters'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * REGISTER A49, CORRECTED ON THE OWNER'S DECISION OF 2026-10-01 (MO21).
 *
 * The screen lists recruitment channels and calls each a recruiter. *Remove recruiter* used to PUT every member it
 * matched -- by a REPRESENTATIVE's id compared with the CHANNEL's -- as `Inactive`, a status no list knows, and then
 * DELETE the representative that happened to share the channel's number. Now it removes the channel it listed, by one
 * request the server does whole, and the members recruited through it keep their status; only their channel is
 * cleared. Nothing about it was tested, which is how it lasted.
 */

const CHANNEL = { id: 5, name: 'Synthetic Channel', enabled: true }
const member = (id, status, recruitedHow, recruitmentRepresentativeId = null) => ({
  id, membershipNumber: `M-90000${id}`, initials: 'S', surname: `Synthetic ${id}`, status, recruitedHow,
  recruitmentRepresentativeId,
})

/** The writes the screen makes, in order, as `VERB what id`. */
function recordWrites(deleteAnswer = () => new HttpResponse(null, { status: 204 })) {
  const writes = []
  server.use(
    http.get('*/api/recruitment-channels', () => HttpResponse.json([CHANNEL])),
    http.get('*/api/members', () => HttpResponse.json([
      member(1, 'Active', 'Synthetic Channel'),
      member(2, 'Suspended', 'Synthetic Channel'),
      // A49's own trap: a member whose REPRESENTATIVE id is the channel's number, recruited through another channel.
      member(3, 'Active', 'Another Channel', CHANNEL.id),
    ])),
    http.delete('*/api/recruitment-channels/:id', ({ params }) => {
      writes.push(`DELETE channel ${params.id}`)
      return deleteAnswer()
    }),
    http.delete('*/api/representatives/:id', ({ params }) => {
      writes.push(`DELETE representative ${params.id}`)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put('*/api/members/:id', ({ params }) => {
      writes.push(`PUT member ${params.id}`)
      return HttpResponse.json({})
    }),
  )
  return writes
}

async function askToRemove(user) {
  const [open] = await screen.findAllByRole('button', { name: /Synthetic Channel — show the members recruited/ })
  await user.click(open)
  await user.click(await screen.findByRole('button', { name: /Remove recruiter/ }))
  return screen.findByRole('dialog', { name: 'Remove this recruiter?' })
}

describe('Recruiters — Remove recruiter (A49, MO21)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(...pageFixtures)
  })

  it('🔒 says what will happen: the channel goes, and the members recruited through it keep their status', async () => {
    recordWrites()
    const user = setupUser()
    renderWithProviders(<Recruiters />)

    const dialog = await askToRemove(user)

    expect(dialog).toHaveTextContent(
      'Synthetic Channel will be removed. 2 member(s) recruited through it keep their status; only their recruitment channel is cleared.')
    expect(dialog, 'no status is written, least of all one no list knows').not.toHaveTextContent(/Inactive/)
  })

  it('🔒 removes the channel it listed by one request -- no member written, no representative deleted', async () => {
    const writes = recordWrites()
    const user = setupUser()
    renderWithProviders(<Recruiters />)

    const dialog = await askToRemove(user)
    await user.click(within(dialog).getByRole('button', { name: 'Remove recruiter' }))

    await waitFor(() => expect(writes).toEqual(['DELETE channel 5']))
    expect(await screen.findByText(
      'Synthetic Channel was removed. Its members keep their status; only their recruitment channel was cleared.')).toBeInTheDocument()
  })

  it('the must-pass: a removal the server refused says it was not saved -- and nothing else was written', async () => {
    const writes = recordWrites(() => HttpResponse.json({ status: 409, message: 'In use elsewhere.' }, { status: 409 }))
    const user = setupUser()
    renderWithProviders(<Recruiters />)

    const dialog = await askToRemove(user)
    await user.click(within(dialog).getByRole('button', { name: 'Remove recruiter' }))

    expect(await screen.findByText(/Synthetic Channel's removal was not saved\./)).toBeInTheDocument()
    expect(writes).toEqual(['DELETE channel 5'])
  })
})
