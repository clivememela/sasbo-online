// @vitest-environment jsdom -- Recruiters: each channel's figures are the members recruited THROUGH it (RC15)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { Recruiters } from './Recruiters'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import fixture from '../../test/fixtures/recruitment-channel-fixture.json'

/**
 * RC15 AT THE SCREEN. The table counted a channel's members by the member's RECRUITER id matched against the channel's
 * id. From the shared fixture: RO has two members of its own and one member of recruiter 4 -- the old count said 1.
 */

const channels = fixture.channels.map((name, i) => ({ id: i + 1, name, enabled: true }))
const members = fixture.members.map((m, i) => ({
  id: i + 1, membershipNumber: m.membershipNumber, title: m.title, initials: m.initials, firstNames: m.firstNames,
  surname: m.surname, bankName: m.bankName, branch: m.branch, status: m.status, recruitedHow: m.channel,
  recruitmentRepresentativeId: m.recruiterId,
}))

/** The table row of a channel, by its name. */
async function rowOf(name) {
  const open = await screen.findByRole('button', { name: new RegExp(`^${name} — show the members recruited`) })
  return open.closest('tr')
}

describe('Recruiters -- RC15, the figures of each channel', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(...pageFixtures)
    server.use(
      http.get('*/api/recruitment-channels', () => HttpResponse.json(channels)),
      http.get('*/api/members', () => HttpResponse.json(members)),
      http.get('*/api/banks/branches', () => HttpResponse.json(fixture.banks)),
    )
  })

  it('🔴 RO counts the two members recruited through it, not the one whose recruiter shares its number', async () => {
    renderWithProviders(<Recruiters />)

    expect((await rowOf('RO')).querySelector('td[data-col="count"]')).toHaveTextContent(/^2$/)
  })

  it('the BEC lists the branches of its own three members, in reading order', async () => {
    renderWithProviders(<Recruiters />)

    const bec = await rowOf('BEC')
    expect(bec.querySelector('td[data-col="count"]')).toHaveTextContent(/^3$/)
    expect(bec.querySelector('td[data-col="branches"]')).toHaveTextContent('Harbour, Main Street')
  })

  it('the must-pass: a channel nobody was recruited through reads 0', async () => {
    renderWithProviders(<Recruiters />)

    expect((await rowOf('EORO')).querySelector('td[data-col="count"]')).toHaveTextContent(/^0$/)
  })
})
