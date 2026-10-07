// @vitest-environment jsdom -- the banks' and providers' files: produced with a one-time password, downloaded, sent by SFTP
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

/** Every file handed to the browser to save, kept -- `saveFile` itself is proved in its own file. */
const { saved } = vi.hoisted(() => ({ saved: [] }))
vi.mock('../../lib/saveFile.js', () => ({ default: (file, fallback) => saved.push({ file, fallback }) }))

import MonthEndFiles from './MonthEndFiles'
import { SFTP_OFF } from './monthEndSendRules'
import { PERMISSIONS } from '../../auth/permissions'
import { TestAuthProvider } from '../../test/authTestUtils'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { monthEndAnswer, monthEndExamples, monthEndRefusal } from '../../test/msw/monthEndExamples'
import {
  INVENTED_ONE_TIME, PASSWORD_NOTE, monthEndFile, monthFiles, produced,
} from '../../test/msw/monthEndSendExamples'
import { setupUser } from '../../test/user'
import { deferred } from '../../test/deferred'

/**
 * THE FILES THAT LEAVE SASBO -- `contracts/monthend-api.md` §3; Stephne, MEN-05 (POPIA), MEN-32 to MEN-35.
 *
 * Each bank's list -- the full list or the month's new and deleted, as the bank's setting says -- and the providers'
 * lists, every one password-protected. 🔴 THE PASSWORD IS IN THE PRODUCE ANSWER ONLY: shown once, with a button to copy
 * it and the warning to give it by phone; gone when hidden, gone when the page is left, and written nowhere. SFTP says
 * it is not set up until it is.
 */

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  saved.length = 0
  server.use(monthEndAnswer('GET /api/month-end/months'))
})

afterEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

const filesAnswer = (answer = monthFiles()) =>
  http.get('*/api/month-end/:month/files', (info) => (typeof answer === 'function' ? answer(info) : HttpResponse.json(answer)))

/** The bank file Absa is answered with on a produce: a new file, beside August's first. */
const NEW_ABSA = monthEndFile({ id: 8, fileName: 'ABSAFULL_260831_2.zip', downloads: 0, lastDeliveredAt: null })

const openPage = ({ permissions = [PERMISSIONS.MONTH_END_SEND], path = '/admin/monthly-menu/files' } = {}) =>
  renderWithProviders(<TestAuthProvider permissions={permissions}><MonthEndFiles /></TestAuthProvider>, { initialEntries: [path] })

const row = (name) => screen.getByRole('heading', { level: 3, name }).closest('li')
const rowFound = async (name) => (await screen.findByRole('heading', { level: 3, name })).closest('li')

describe('who may produce them', () => {
  it('🔒 nobody signed in is asked to sign in, and the files are never asked for', async () => {
    const asked = vi.fn()
    server.use(filesAnswer(() => {
      asked()
      return HttpResponse.json(monthFiles())
    }))
    openPage({ permissions: [] })

    expect(await screen.findByText(/^Sign in to send the month's packs and files\./)).toBeInTheDocument()
    expect(asked).not.toHaveBeenCalled()
  })

  it('a caller whose scope is not all of SASBO hears the server\'s own sentence (SCOPE_TOO_NARROW)', async () => {
    const sentence = 'The banks\' and providers\' files carry members of every region, so they are made by staff who see all of SASBO.'
    server.use(filesAnswer(() => HttpResponse.json(
      { status: 403, error: 'Forbidden', code: 'SCOPE_TOO_NARROW', message: sentence }, { status: 403 })))
    openPage()

    expect(await screen.findByText(sentence)).toBeInTheDocument()
  })
})

describe('the states of the list', () => {
  it('loading, then the banks and the providers', async () => {
    const held = deferred()
    server.use(filesAnswer(async () => {
      await held.promise
      return HttpResponse.json(monthFiles())
    }))
    openPage()

    expect(await screen.findByText('Reading the month’s files…')).toBeInTheDocument()
    held.resolve()
    expect(await screen.findByRole('heading', { level: 2, name: 'Banks' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Providers' })).toBeInTheDocument()
  })

  it('failed: said, with Try again; an answer of another shape is not available', async () => {
    let asked = 0
    server.use(filesAnswer(() => {
      asked += 1
      return asked === 1 ? HttpResponse.json({ status: 502, error: 'Bad Gateway' }, { status: 502 }) : HttpResponse.json([])
    }))
    const user = setupUser()
    openPage()

    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('The banks’ and providers’ files are not available from this server yet.')).toBeInTheDocument()
    expect(asked).toBe(2)
  })
})

describe('what each bank and provider receives (MEN-32 to MEN-35)', () => {
  it('🔑 a bank\'s full list or its new and deleted only -- its setting -- in its own layout, password-protected', async () => {
    server.use(filesAnswer())
    openPage()

    const absa = await rowFound('Absa')
    expect(absa).toHaveTextContent('Table codes 24, 78, 90')
    expect(within(absa).getByText(/^The full list, as Absa’s fixed-width text file\. Now: 412 members\.$/)).toBeInTheDocument()
    expect(absa).toHaveTextContent('ABSAFULL_260831.zip: 412 rows, produced on 1 October 2026 at 09:20 by Head Office Administrator (demo.headoffice). '
      + 'Downloaded 1 time, last on 1 October 2026 at 09:21. Password-protected, in a ZIP with a password: open it with 7-Zip, WinZip or WinRAR. '
      + '2 members could not be put in this layout and are left out.')
    expect(within(absa).getByRole('button', { name: 'Produce the file again' })).toBeEnabled()

    const nedbank = row('Nedbank')
    expect(within(nedbank).getByText(/^New and deleted members only, as an Excel workbook\. Now: 6 new and 3 deleted\.$/)).toBeInTheDocument()
    expect(within(nedbank).getByRole('button', { name: 'Produce the file' })).toBeEnabled()
  })

  it('payroll members in no bank\'s file are counted and said -- never named', async () => {
    server.use(filesAnswer({ ...monthFiles(), noTableCode: { rows: 3, newRows: 1, deletedRows: 0 } }))
    openPage()

    expect(await screen.findByText('3 members who pay by payroll deduction are in no bank’s file: no workplace, or a '
      + 'workplace with no table code, is on record for them.')).toBeInTheDocument()
  })

  it('the providers: Old Mutual\'s list, Law Call\'s by SFTP -- not set up, so said -- and Criticare suspended, not dropped', async () => {
    server.use(filesAnswer())
    openPage()

    const lawCall = await rowFound('Law Call (Azoza)')
    expect(lawCall).toHaveTextContent('A member list, provisional until SASBO confirms it. Now: 1 310 members.')
    expect(within(lawCall).getByText(SFTP_OFF)).toBeInTheDocument()
    expect(row('Old Mutual funeral benefit')).toHaveTextContent('Old Mutual’s funeral benefit list, provisional until SASBO '
      + 'confirms it. Now: 1 310 members.')
    const criticare = row('Criticare')
    expect(criticare).toHaveTextContent('Suspended for now: nothing is made for it, and it can be used again.')
    expect(within(criticare).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('🔴 the one-time password (MEN-05, POPIA)', () => {
  const produceAbsa = () => http.post('*/api/month-end/:month/files/banks/:code', () => HttpResponse.json(produced(NEW_ABSA), { status: 201 }))

  it('🔑 shown once, with its warning and the server\'s note -- focus on it, and the file to download beside it', async () => {
    server.use(filesAnswer(), produceAbsa())
    const user = setupUser()
    openPage()

    await user.click(within(await rowFound('Absa')).getByRole('button', { name: 'Produce the file again' }))
    const panel = await screen.findByRole('group', { name: 'The password for ABSAFULL_260831_2.zip' })
    expect(within(panel).getByText(INVENTED_ONE_TIME)).toHaveAttribute('data-one-time-password')
    expect(panel).toHaveTextContent('Give this password to the bank by phone — it will not be shown again.')
    expect(panel).toHaveTextContent(PASSWORD_NOTE)
    await waitFor(() => expect(panel).toHaveFocus())
    expect(within(row('Absa')).getByRole('status')).toHaveTextContent('ABSAFULL_260831_2.zip is produced. Its password is below, this once.')
    expect(within(panel).getByRole('button', { name: 'Download the file' })).toBeEnabled()
  })

  it('copied with one press -- and said so', async () => {
    server.use(filesAnswer(), produceAbsa())
    const user = setupUser()
    openPage()

    await user.click(within(await rowFound('Absa')).getByRole('button', { name: 'Produce the file again' }))
    const panel = await screen.findByRole('group', { name: 'The password for ABSAFULL_260831_2.zip' })
    await user.click(within(panel).getByRole('button', { name: 'Copy the password' }))
    expect(await within(panel).findByText('Copied. Paste it nowhere the file goes.')).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe(INVENTED_ONE_TIME)
  })

  it('🔴 gone when hidden -- and never written to the browser\'s storage', async () => {
    server.use(filesAnswer(), produceAbsa())
    const user = setupUser()
    openPage()

    await user.click(within(await rowFound('Absa')).getByRole('button', { name: 'Produce the file again' }))
    const panel = await screen.findByRole('group', { name: 'The password for ABSAFULL_260831_2.zip' })
    const stored = [...Object.values(localStorage), ...Object.values(sessionStorage)].join(' ')
    expect(stored).not.toContain(INVENTED_ONE_TIME)
    await user.click(within(panel).getByRole('button', { name: 'Hide the password' }))
    expect(screen.queryByText(INVENTED_ONE_TIME)).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /^The password for/ })).not.toBeInTheDocument()
  })

  it('🔴 gone when the page is left: coming back shows the file, never its password', async () => {
    server.use(filesAnswer(), produceAbsa())
    const user = setupUser()
    const first = openPage()

    await user.click(within(await rowFound('Absa')).getByRole('button', { name: 'Produce the file again' }))
    expect(await screen.findByText(INVENTED_ONE_TIME)).toBeInTheDocument()
    first.unmount()

    server.use(filesAnswer(monthFiles()))
    openPage()
    await rowFound('Absa')
    expect(screen.queryByText(INVENTED_ONE_TIME)).not.toBeInTheDocument()
  })

  it('🔴 shown even when the list cannot be read again after it -- the one copy is never lost with the list', async () => {
    let reads = 0
    server.use(filesAnswer(() => {
      reads += 1
      return reads === 1 ? HttpResponse.json(monthFiles()) : HttpResponse.error()
    }), produceAbsa())
    const user = setupUser()
    openPage()

    await user.click(within(await rowFound('Absa')).getByRole('button', { name: 'Produce the file again' }))
    expect(await screen.findByText(/^The files could not be read again:/)).toBeInTheDocument()
    expect(screen.getByText(INVENTED_ONE_TIME)).toBeInTheDocument()
  })

  it('a produce whose answer never came: said -- and that no password can be shown for it', async () => {
    server.use(filesAnswer(), http.post('*/api/month-end/:month/files/banks/:code', () => HttpResponse.error()))
    const user = setupUser()
    openPage()

    await user.click(within(await rowFound('Nedbank')).getByRole('button', { name: 'Produce the file' }))
    expect(await within(row('Nedbank')).findByRole('alert')).toHaveTextContent(/^The file could not be confirmed, and its password cannot be shown\./)
  })
})

describe('downloading and sending a file', () => {
  it('🔑 fetched with the session and handed to the browser under the server\'s name -- the file is already encrypted', async () => {
    const asked = []
    server.use(filesAnswer(), http.get('*/api/month-end/files/:id', ({ params }) => {
      asked.push(params.id)
      return new HttpResponse(new Blob(['PK invented']), {
        headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="ABSAFULL_260831.zip"' },
      })
    }))
    const user = setupUser()
    openPage()

    await user.click(within(await rowFound('Absa')).getByRole('button', { name: 'Download ABSAFULL_260831.zip' }))
    expect(await within(row('Absa')).findByText('ABSAFULL_260831.zip is downloaded.')).toBeInTheDocument()
    expect(asked).toEqual(['7'])
    expect(saved.map(({ file, fallback }) => [file.filename, fallback])).toEqual([['ABSAFULL_260831.zip', 'ABSAFULL_260831.zip']])
  })

  it('Law Call by SFTP: shut while SFTP is not set up -- and, where the server refuses it, said and shut for the visit', async () => {
    const lawCallFile = monthEndFile({ id: 9, kind: 'PROVIDER', recipientCode: 'LAW_CALL', recipientName: 'Law Call (Azoza)',
      layout: 'PROVISIONAL_MEMBER_LIST', fileName: 'LAW_CALL_260831.zip' })
    const withFile = (sftp) => {
      const answer = monthFiles({ sftp })
      answer.providers[1] = { ...answer.providers[1], files: [lawCallFile] }
      return answer
    }
    server.use(filesAnswer(withFile(false)))
    const first = openPage()
    expect(within(await rowFound('Law Call (Azoza)')).getByRole('button', { name: 'Send LAW_CALL_260831.zip by SFTP' })).toBeDisabled()
    first.unmount()

    // The read said SFTP was set up; the server refused all the same.
    server.use(filesAnswer(withFile(true)), monthEndRefusal('SFTP_NOT_CONFIGURED', 'POST /api/month-end/files/{id}/sftp'))
    const user = setupUser()
    openPage()
    const lawCall = await rowFound('Law Call (Azoza)')
    expect(within(lawCall).getByText('Delivered by SFTP.')).toBeInTheDocument()
    await user.click(within(lawCall).getByRole('button', { name: 'Send LAW_CALL_260831.zip by SFTP' }))
    expect(await within(row('Law Call (Azoza)')).findByRole('alert')).toHaveTextContent(monthEndExamples.refusals.SFTP_NOT_CONFIGURED.body.message)
    await waitFor(() => expect(within(row('Law Call (Azoza)')).getByRole('button', { name: 'Send LAW_CALL_260831.zip by SFTP' })).toBeDisabled())
    expect(within(row('Law Call (Azoza)')).getByText(SFTP_OFF)).toBeInTheDocument()
  })
})
