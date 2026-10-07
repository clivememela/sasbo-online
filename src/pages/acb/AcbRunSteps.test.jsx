// @vitest-environment jsdom -- a debit order run's steps after preparing: each for the permission that takes it
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import AcbRunSteps from './AcbRunSteps'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TestAuthProvider } from '../../test/authTestUtils'
import { PERMISSIONS } from '../../auth/permissions'
import { server } from '../../test/msw/server'
import { dodHandlers, refusal, runOf, signInRefusal } from '../../test/msw/dodApi'
import { setupUser } from '../../test/user'
import { expectNoA11yViolations } from '../../test/assertions'

/**
 * `contracts/dod-api.md` §2: approve (DOD_PREPARE, no second approval -- Stephne, DOD-10), the bank file and its
 * submission (DOD_FILE, "The CFO only" -- DOD-11), returns in and close (DOD_PREPARE), and a decline (DOD_FILE). Each
 * step sends the version the screen showed; a refusal is said in the dialog; an answer that never came is never
 * repeated. Every red case has its must-pass beside it.
 */

const PREPARER = [PERMISSIONS.DOD_PREPARE]
const CFO = [PERMISSIONS.DOD_FILE, PERMISSIONS.DOD_SETTINGS]

let sent
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  sent = []
  server.use(...dodHandlers())
  server.events.on('request:start', record)
})
afterEach(() => server.events.removeListener('request:start', record))

async function record({ request }) {
  if (request.method === 'POST') sent.push({ path: new URL(request.url).pathname, body: await request.clone().json().catch(() => null) })
}

const renderSteps = (run, permissions = PREPARER) => {
  const onChanged = vi.fn()
  renderWithProviders(
    <TestAuthProvider permissions={permissions}><AcbRunSteps run={run} onChanged={onChanged} /></TestAuthProvider>,
  )
  return onChanged
}

describe('approving (DOD_PREPARE)', () => {
  it('asks first, says there is no second approval, sends the version shown, and hands the news to the page', async () => {
    const user = setupUser()
    const onChanged = renderSteps(runOf())
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    const dialog = await screen.findByRole('dialog', { name: 'Approve the October 2026 run?' })
    expect(dialog).toHaveTextContent('There is no second approval')
    await expectNoA11yViolations(dialog, { rules: { region: { enabled: false } } })

    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledWith({
      tone: 'ok', message: 'The October 2026 run is approved. The Chief Financial Officer can now download its bank file.',
    }))
    expect(sent).toEqual([{ path: '/api/acb/runs/41/approve', body: { version: 1 } }])
  })

  it('someone else moved it first: the dialog says what it is now, offers only Close, and closing reads it again', async () => {
    server.use(http.post('*/api/acb/runs/:id/approve', () => refusal(409, 'RUN_VERSION_CONFLICT', 'Someone else changed this run first.',
      { runId: '41', status: 'CANCELLED', version: '2' })))
    const user = setupUser()
    const onChanged = renderSteps(runOf())
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    const dialog = await screen.findByRole('dialog', { name: 'Approve the October 2026 run?' })
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))

    expect(await within(dialog).findByText(/it is now cancelled\. Nothing was approved\./)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(onChanged).not.toHaveBeenCalled()
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1))
    expect(onChanged).toHaveBeenCalledWith()
  })

  it('an answer that never came is never repeated: "could not be confirmed", and no second press', async () => {
    server.use(http.post('*/api/acb/runs/:id/approve', () => HttpResponse.json({ message: 'down' }, { status: 503 })))
    const user = setupUser()
    renderSteps(runOf())
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    const dialog = await screen.findByRole('dialog', { name: 'Approve the October 2026 run?' })
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))
    expect(await within(dialog).findByText(/^The approval could not be confirmed\./)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(sent).toHaveLength(1)
  })

  it('the must-pass: a refusal wrote nothing, in the server\'s sentence', async () => {
    server.use(http.post('*/api/acb/runs/:id/approve', () => refusal(422, 'RUN_EMPTY', 'A run with no debits cannot be approved.')))
    const user = setupUser()
    renderSteps(runOf())
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    const dialog = await screen.findByRole('dialog', { name: 'Approve the October 2026 run?' })
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))
    expect(await within(dialog).findByText('The approval was not recorded. Nothing was written: A run with no debits cannot be approved.')).toBeInTheDocument()
  })
})

describe('the bank file: the Chief Financial Officer only (DOD-11)', () => {
  const originals = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
  let saved
  beforeEach(() => {
    saved = []
    URL.createObjectURL = () => 'blob:synthetic/1'
    URL.revokeObjectURL = () => {}
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function press() { saved.push(this.download) })
  })
  afterEach(() => {
    URL.createObjectURL = originals.create
    URL.revokeObjectURL = originals.revoke
  })

  it('the CFO downloads it under the server\'s name, and the run is read again to count the download', async () => {
    const user = setupUser()
    const onChanged = renderSteps(runOf({ status: 'APPROVED' }), CFO)
    expect(screen.getByText('Take the file to the bank yourself. Every download is recorded.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Download the bank file' }))
    await vi.waitFor(() => expect(saved).toEqual(['sasbosub.oct']))
    expect(onChanged).toHaveBeenCalledWith({ tone: 'ok', message: expect.stringMatching(/downloaded as sasbosub\.oct\. Take it to the bank/) })
  })

  it('anyone else is told who may, and is offered no download', () => {
    renderSteps(runOf({ status: 'APPROVED' }), PREPARER)
    expect(screen.getByText('Only the Chief Financial Officer downloads the bank file and takes it to the bank.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record as submitted' })).not.toBeInTheDocument()
  })

  it('a refused download says why in the server\'s words, and saves nothing', async () => {
    server.use(http.get('*/api/acb/runs/:id/file', () => refusal(410, 'FILE_PURGED', 'This run’s file passed its purge date.')))
    const user = setupUser()
    renderSteps(runOf({ status: 'APPROVED' }), CFO)
    await user.click(screen.getByRole('button', { name: 'Download the bank file' }))
    expect(await screen.findByText('The bank file could not be downloaded. This run’s file passed its purge date.')).toBeInTheDocument()
    expect(saved).toEqual([])
  })

  it('a CFO whose session ended is asked to sign in, by name of what is needed', async () => {
    server.use(http.get('*/api/acb/runs/:id/file', () => signInRefusal()))
    const user = setupUser()
    renderSteps(runOf({ status: 'APPROVED' }), CFO)
    await user.click(screen.getByRole('button', { name: 'Download the bank file' }))
    expect(await screen.findByText('Sign in to download the debit order file.')).toBeInTheDocument()
  })

  it('a second download says so, and the run says who downloaded it last', () => {
    renderSteps(runOf({ status: 'APPROVED', fileDownloads: 2, lastDownloadedBy: 'Demo Finance (demo.cfo)', lastDownloadedAt: '2026-10-16T07:00:00Z' }), CFO)
    expect(screen.getByRole('button', { name: 'Download again' })).toBeInTheDocument()
    expect(screen.getByText('The bank file was downloaded 2 times, last by Demo Finance (demo.cfo) on 16 Oct 2026.')).toBeInTheDocument()
  })
})

describe('recording the submission (DOD_FILE)', () => {
  it('waits for the file to have been downloaded, and says why', () => {
    renderSteps(runOf({ status: 'APPROVED', fileDownloads: 0 }), CFO)
    const submit = screen.getByRole('button', { name: 'Record as submitted' })
    expect(submit).toBeDisabled()
    expect(submit).toHaveAccessibleDescription(/Download the file first/)
  })

  it('once downloaded, records it from the version shown', async () => {
    const user = setupUser()
    const onChanged = renderSteps(runOf({ status: 'APPROVED', fileDownloads: 1, version: 3 }), CFO)
    await user.click(screen.getByRole('button', { name: 'Record as submitted' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record the October 2026 file as submitted?' })
    await user.click(within(dialog).getByRole('button', { name: 'Record as submitted' }))
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(sent).toEqual([{ path: '/api/acb/runs/41/submitted', body: { version: 3 } }])
  })

  it('a file the server never made is refused in words of the step', async () => {
    server.use(http.post('*/api/acb/runs/:id/submitted', () => refusal(409, 'FILE_NOT_RENDERED', 'No file was made.')))
    const user = setupUser()
    renderSteps(runOf({ status: 'APPROVED', fileDownloads: 1 }), CFO)
    await user.click(screen.getByRole('button', { name: 'Record as submitted' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record the October 2026 file as submitted?' })
    await user.click(within(dialog).getByRole('button', { name: 'Record as submitted' }))
    expect(await within(dialog).findByText('Download the bank file before recording that it went to the bank. Nothing was recorded.')).toBeInTheDocument()
  })
})

describe('a submitted run: returns in (DOD_PREPARE), or declined (DOD_FILE)', () => {
  it('marks the returns in', async () => {
    const user = setupUser()
    const onChanged = renderSteps(runOf({ status: 'SUBMITTED', version: 4 }))
    expect(screen.queryByRole('button', { name: 'The bank declined the file' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark returns in' }))
    const dialog = await screen.findByRole('dialog', { name: 'Mark the October 2026 returns as in?' })
    expect(dialog).toHaveTextContent('Every debit not recorded as unpaid is then marked paid')
    await user.click(within(dialog).getByRole('button', { name: 'Mark returns in' }))
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ tone: 'ok' })))
    expect(sent).toEqual([{ path: '/api/acb/runs/41/returned', body: { version: 4 } }])
  })

  it('the CFO records a decline: the reason first, the bank\'s words kept to 300 characters', async () => {
    const user = setupUser()
    const onChanged = renderSteps(runOf({ status: 'SUBMITTED' }), CFO)
    await user.click(screen.getByRole('button', { name: 'The bank declined the file' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record that the bank declined the October 2026 file' })
    const recordIt = within(dialog).getByRole('button', { name: 'Record the decline' })
    expect(recordIt).toBeDisabled()
    expect(recordIt).toHaveAccessibleDescription('Choose the bank’s reason first.')

    await user.selectOptions(within(dialog).getByLabelText('The bank’s reason'), 'WRONG_DEBIT_DATE')
    const words = within(dialog).getByLabelText(/The bank’s words/)
    await user.click(words)
    await user.paste('x'.repeat(301))
    expect(recordIt).toBeDisabled()
    await user.clear(words)
    await user.type(words, 'Heritage Day on some lines')
    await user.click(recordIt)

    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(sent).toEqual([{ path: '/api/acb/runs/41/declined', body: { version: 1, reason: 'WRONG_DEBIT_DATE', bankWords: 'Heritage Day on some lines' } }])
  })
})

describe('closing a returned run (DOD_PREPARE)', () => {
  it('is refused while an unpaid has no decision, and says where to decide', async () => {
    server.use(http.post('*/api/acb/runs/:id/close', () => refusal(409, 'UNPAIDS_UNDECIDED', '2 unpaids in this run have no decision.', { count: '2' })))
    const user = setupUser()
    renderSteps(runOf({ status: 'RETURNED' }))
    await user.click(screen.getByRole('button', { name: 'Close the run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Close the October 2026 run?' })
    expect(dialog).toHaveTextContent('Closing is final.')
    await user.click(within(dialog).getByRole('button', { name: 'Close the run' }))
    expect(await within(dialog).findByText('2 unpaids in this run have no decision. Decide each one on Manage Re-Debits, then close the run.')).toBeInTheDocument()
  })

  it('the must-pass: closes, and a closed run offers nothing more', async () => {
    const user = setupUser()
    const onChanged = renderSteps(runOf({ status: 'RETURNED' }))
    await user.click(screen.getByRole('button', { name: 'Close the run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Close the October 2026 run?' })
    await user.click(within(dialog).getByRole('button', { name: 'Close the run' }))
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledWith({ tone: 'ok', message: 'The October 2026 run is closed.' }))
  })

  it('a closed run says so, with no step to take', () => {
    renderSteps(runOf({ status: 'CLOSED' }), [...PREPARER, ...CFO])
    expect(screen.getByText('This run is closed.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
