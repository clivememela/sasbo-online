// @vitest-environment jsdom -- the letters to members: a specimen of each, shown from the browser's own copy
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import DodLetters, { LETTER_WHEN } from './DodLetters'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TestAuthProvider } from '../../test/authTestUtils'
import { PERMISSIONS } from '../../auth/permissions'
import { server } from '../../test/msw/server'
import { dodHandlers, refusal } from '../../test/msw/dodApi'
import { committedVocabulary } from '../../test/apiContractScan'
import { setupUser } from '../../test/user'
import { expectNoA11yViolations } from '../../test/assertions'

/**
 * dod-api §6: a specimen of each letter, rendered by the server with invented details (behind DOD_PREPARE, as the
 * server's preview is), for the letters review SASBO asked for (DOD-30, DOD-33). Nothing reaches a member until that
 * review switches sending on, and the screen says so. The PDF is fetched and shown from an object URL -- jsdom has
 * none, so the two calls are stood in for and recorded.
 */

const originals = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
let created
let revoked
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  created = []
  revoked = []
  URL.createObjectURL = (blob) => { created.push(blob); return `blob:synthetic/${created.length}` }
  URL.revokeObjectURL = (url) => revoked.push(url)
  server.use(...dodHandlers())
})
afterEach(() => {
  URL.createObjectURL = originals.create
  URL.revokeObjectURL = originals.revoke
})

const asPreparer = (ui) =>
  renderWithProviders(<TestAuthProvider permissions={[PERMISSIONS.DOD_PREPARE]}>{ui}</TestAuthProvider>)

describe('who may see the letters', () => {
  it('nobody signed in is asked to sign in, and no letter is offered; the page head stays', () => {
    renderWithProviders(<DodLetters />, { initialEntries: ['/admin/acb/letters'] })
    expect(screen.getByRole('heading', { level: 1, name: 'Letters' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Sign in to prepare debit order runs.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('the CFO, who holds the settings, is told the letters are for whoever prepares the runs', () => {
    renderWithProviders(<TestAuthProvider permissions={[PERMISSIONS.DOD_SETTINGS]}><DodLetters /></TestAuthProvider>)
    expect(screen.getByRole('status')).toHaveTextContent('You need permission to prepare debit order runs.')
    expect(screen.queryByRole('button', { name: /^Show the / })).not.toBeInTheDocument()
  })
})

describe('the letters', () => {
  it('lists every letter the server publishes, each with when it goes -- and says nothing is sent yet', async () => {
    const { container } = asPreparer(<DodLetters />)
    const table = screen.getByRole('table', { name: 'The letters to members' })
    expect(within(table).getAllByRole('button', { name: /^Show the / })).toHaveLength(6)
    expect(within(table).getByText('A staff member confirms an ending after the third unpaid')).toBeInTheDocument()
    expect(screen.getByText('Letters are not being sent yet: nothing reaches a member until SASBO has reviewed them.')).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it('names every letter the server publishes, and no other (the vocabulary)', () => {
    expect(Object.keys(LETTER_WHEN).sort()).toEqual([...committedVocabulary().acb.letterTemplates].sort())
  })

  it('shows a specimen in a frame from the browser\'s own copy, and lets it go when another is shown', async () => {
    const asked = []
    server.use(http.get('*/api/acb/letters/specimen/:template', ({ params }) => {
      asked.push(params.template)
      return new HttpResponse('%PDF-1.4 invented', { headers: { 'Content-Type': 'application/pdf' } })
    }))
    const user = setupUser()
    asPreparer(<DodLetters />)
    await user.click(screen.getByRole('button', { name: 'Show the Re-debit letter' }))
    const frame = await screen.findByTitle('Specimen of the Re-debit letter')
    expect(frame).toHaveAttribute('src', 'blob:synthetic/1')
    expect(screen.getByRole('heading', { name: 'Re-debit letter' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show the Membership ended letter' }))
    expect(await screen.findByTitle('Specimen of the Membership ended letter')).toHaveAttribute('src', 'blob:synthetic/2')
    expect(asked).toEqual(['RE_DEBIT', 'MEMBERSHIP_ENDED'])
    expect(revoked).toEqual(['blob:synthetic/1'])
  })

  it('downloads the specimen shown', async () => {
    const pressed = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function press() { pressed.push(this.download) })
    const user = setupUser()
    asPreparer(<DodLetters />)
    await user.click(screen.getByRole('button', { name: 'Show the Payment stopped letter' }))
    await screen.findByTitle('Specimen of the Payment stopped letter')
    await user.click(screen.getByRole('button', { name: 'Download' }))
    // The server's own name for it, from Content-Disposition.
    expect(pressed).toEqual(['specimen-re_debit.pdf'])
  })

  it('a specimen that cannot be loaded says so, with a retry, and shows no frame', async () => {
    server.use(http.get('*/api/acb/letters/specimen/:template', () => HttpResponse.json({ message: 'boom' }, { status: 500 })))
    const user = setupUser()
    asPreparer(<DodLetters />)
    await user.click(screen.getByRole('button', { name: 'Show the Account closed letter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The specimen could not be loaded.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByTitle(/^Specimen of/)).not.toBeInTheDocument()
  })

  it('a refusal is not offered a retry that cannot work', async () => {
    server.use(http.get('*/api/acb/letters/specimen/:template', () => refusal(400, 'REQUEST_MALFORMED', 'There is no such letter.')))
    const user = setupUser()
    asPreparer(<DodLetters />)
    await user.click(screen.getByRole('button', { name: 'Show the No authority to debit letter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('There is no such letter.')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})
