// @vitest-environment jsdom -- Capture Member's bank and recruiter fields when their lists fail
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import CaptureMember from './CaptureMember'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { setupUser } from '../../test/user'

/**
 * THE LISTS, WHERE THEY ARE CHOSEN. `06.4`.
 *
 * 🔴 When the bank or recruiter list failed, the form said so once, in a notice above its tabs. Bank Where
 * Employed, Recruiter and Area's Recruiter -- two tabs away from that notice -- read as pickers with nothing in
 * them, and a capture could go on without the bank or the recruiter that was simply never offered.
 *
 * The handlers go BEFORE the catch-all in one `use` call: msw answers with the first match, and the catch-all
 * would otherwise answer every one of them with an empty list (see `CaptureMember.jobGrade.test.jsx`).
 */

const boom = () => HttpResponse.json({ status: 500, error: 'boom' }, { status: 500 })

describe('Capture Member, when a list it offers failed', () => {
  beforeEach(() => {
    // The page reports the failure through the sink as well as showing it.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('says so at Bank Where Employed', async () => {
    server.use(http.get('*/api/banks', boom), ...pageFixtures)
    const user = setupUser()
    renderWithProviders(<CaptureMember />)

    await user.click(screen.getByRole('button', { name: /^Employment & Bank/ }))
    expect(await screen.findByText('Bank Where Employed could not be loaded.')).toBeInTheDocument()
  })

  it('says so at Recruiter and Area’s Recruiter', async () => {
    server.use(http.get('*/api/representatives', boom), ...pageFixtures)
    const user = setupUser()
    renderWithProviders(<CaptureMember />)

    await user.click(screen.getByRole('button', { name: /^Recruitment Channel/ }))
    expect(await screen.findByText('Recruiter could not be loaded.')).toBeInTheDocument()
    expect(screen.getByText("Area's Recruiter could not be loaded.")).toBeInTheDocument()
  })

  it('the must-pass: lists that loaded say nothing of the kind', async () => {
    server.use(http.get('*/api/banks', () => HttpResponse.json([{ name: 'Synthetic Bank' }])), ...pageFixtures)
    const user = setupUser()
    renderWithProviders(<CaptureMember />)

    await user.click(screen.getByRole('button', { name: /^Employment & Bank/ }))
    await screen.findByText(/^Bank Where Employed/)
    expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument()
  })
})
