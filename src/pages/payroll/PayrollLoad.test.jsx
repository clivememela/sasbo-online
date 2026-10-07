// @vitest-environment jsdom -- Load a file: the employer, the month and the file chosen, checked, sent and compared
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'

import PayrollFile from './PayrollFile'
import PayrollLoad from './PayrollLoad'
import { PERMISSIONS } from '../../auth/permissions'
import { TestAuthProvider } from '../../test/authTestUtils'
import { expectNoA11yViolations } from '../../test/assertions'
import { deferred } from '../../test/deferred'
import { server } from '../../test/msw/server'
import { ABSA_SEPTEMBER, VOCABULARY, csvFile, multipartFields, payrollHandlers, refusal } from '../../test/msw/payrollExamples'
import { renderWithProviders } from '../../test/renderWithProviders'
import { setupUser } from '../../test/user'

/**
 * LOAD A FILE: an employer's file for a month, checked BEFORE anything is sent -- its type by name and by its first
 * bytes, its size against the limit the server states -- then read and compared in one request (route 5), or its lines
 * typed in when the employer sends a PDF or a picture (route 6, PAY-03). The refusals that change the screen are each
 * driven: a file already loaded for the month (replace only when asked), no row of headings found (ask for them), a
 * document that cannot be read (type it in). A send whose answer never arrives is said as unconfirmed: loading again
 * is safe, because the same bytes are never loaded twice.
 */

const PROCESS = [PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_PROCESS]

const openLoad = (permissions = PROCESS) => renderWithProviders(
  <TestAuthProvider permissions={permissions}>
    <Routes>
      <Route path="/admin/payroll/load" element={<PayrollLoad />} />
      <Route path="/admin/payroll/files/:fileId" element={<PayrollFile />} />
    </Routes>
  </TestAuthProvider>,
  { initialEntries: ['/admin/payroll/load'] },
)

/**
 * Every upload's fields as they arrived. Under jsdom a file part reaches the wire empty and nameless (`multipartFields`
 * says why), so the page is held to the fields it sends; the file's bytes and name on the wire are
 * `payrollService.test.js`'s, under Node's own `File` and `FormData`.
 */
let uploads
let typedBodies
let answerUpload

let stopWatching = () => {}
const watchRequests = () => {
  const seen = []
  const listener = ({ request }) => seen.push(`${request.method} ${new URL(request.url).pathname}`)
  server.events.on('request:start', listener)
  stopWatching = () => server.events.removeListener('request:start', listener)
  return seen
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  uploads = []
  typedBodies = []
  answerUpload = () => HttpResponse.json(ABSA_SEPTEMBER, { status: 201 })
  server.use(
    ...payrollHandlers(),
    http.post('*/api/payroll/files', async ({ request }) => {
      uploads.push(await multipartFields(request))
      return answerUpload(uploads.length)
    }),
    http.post('*/api/payroll/files/typed', async ({ request }) => {
      typedBodies.push(await request.json())
      return HttpResponse.json({ ...ABSA_SEPTEMBER, entry: 'TYPED' }, { status: 201 })
    }),
  )
})

afterEach(() => {
  stopWatching()
  stopWatching = () => {}
})

/** The employer and last month, as the controls offer them; the month's value is read from the control, never a clock. */
const chooseEmployerAndMonth = async (user, employer = 'Absa') => {
  await screen.findByRole('option', { name: new RegExp(`^${employer}`) })
  await user.selectOptions(screen.getByLabelText(/^Employer/), screen.getByRole('option', { name: new RegExp(`^${employer}`) }))
  const month = within(screen.getByLabelText(/^Month the deductions are for/)).getAllByRole('option')[2]
  await user.selectOptions(screen.getByLabelText(/^Month the deductions are for/), month)
  return month.value
}

const fileInput = () => screen.getByLabelText(/^The employer.s file/)

describe('who may load a file', () => {
  it('🔒 reading alone is not enough: the notice says what is needed, and nothing is asked of the server', async () => {
    const seen = watchRequests()
    openLoad([PERMISSIONS.PAYROLL_VIEW])
    expect(screen.getByRole('heading', { level: 1, name: 'Load an employer’s file' })).toBeInTheDocument()
    expect(screen.getByText(/You need permission to process payroll files\./)).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(seen).toEqual([])
  })

  it('🔒 nobody signed in is asked to sign in', () => {
    openLoad([])
    expect(screen.getByText(/Sign in to process payroll files\./)).toBeInTheDocument()
  })
})

describe('the file is checked before anything is sent', () => {
  it('states the limit the server gives, and refuses a larger file without sending it', async () => {
    server.use(http.get('*/api/payroll/vocabulary', () => HttpResponse.json({ ...VOCABULARY, limits: { ...VOCABULARY.limits, maxBytes: 1024 } })))
    const user = setupUser({ applyAccept: false })
    openLoad()
    await chooseEmployerAndMonth(user)
    expect(await screen.findByText('Excel or CSV (.xlsx, .xls, .csv), up to 1 KB.')).toBeInTheDocument()

    await user.upload(fileInput(), csvFile('Invented big.csv', 'x'.repeat(2048)))
    await waitFor(() => expect(fileInput()).toHaveAccessibleDescription('This file is 2 KB; files up to 1 KB can be loaded.'))
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))
    expect(uploads).toEqual([])
  })

  it('🔴 a PDF named .xlsx is known by its first bytes, refused, and its lines offered to be typed in', async () => {
    const user = setupUser({ applyAccept: false })
    openLoad()
    await chooseEmployerAndMonth(user)
    await user.upload(fileInput(), new File(['%PDF-1.7 invented'], 'Invented payroll.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    await waitFor(() => expect(fileInput()).toHaveAccessibleDescription('This file is a PDF, which cannot be read. Type the lines in from it instead.'))
    expect(screen.getByText(/This employer’s file cannot be read\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))
    expect(uploads).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Type its lines in instead' }))
    expect(screen.getByRole('heading', { name: 'The lines, typed in' })).toBeInTheDocument()
  })

  it('refuses a kind that is no spreadsheet, and an empty file, without sending either', async () => {
    const user = setupUser({ applyAccept: false })
    openLoad()
    await chooseEmployerAndMonth(user)
    await user.upload(fileInput(), new File(['invented'], 'notes.docx'))
    await waitFor(() => expect(fileInput()).toHaveAccessibleDescription('Only Excel and CSV files can be loaded (.xlsx, .xls, .csv); this one is a .docx file.'))
    await user.upload(fileInput(), new File([], 'empty.csv', { type: 'text/csv' }))
    await waitFor(() => expect(fileInput()).toHaveAccessibleDescription('This file is empty. Choose the file the employer sent.'))
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))
    expect(uploads).toEqual([])
  })

  it('says what is still to choose, and sends nothing until it is chosen', async () => {
    const user = setupUser()
    openLoad()
    await screen.findByRole('option', { name: 'Absa' })
    expect(screen.getByText('Choose the employer.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))
    expect(uploads).toEqual([])
  })
})

describe('loading and comparing', () => {
  it('🔑 sends the file, the employer and the month -- and nothing it was not asked -- then opens the file\'s results', async () => {
    const user = setupUser()
    openLoad()
    const month = await chooseEmployerAndMonth(user)
    await user.upload(fileInput(), csvFile())
    expect(await screen.findByText(/Invented payroll September 2026\.csv, 1 KB: ready to load\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Absa — September 2026' })).toBeInTheDocument()
    // A file part, the employer and the month -- and no `replace` or `columnMapping`, which nobody chose.
    expect(uploads).toEqual([{ file: expect.any(String), employerId: '1', period: month }])
    expect(screen.getByText('Loaded and compared: 34 lines, 9 discrepancies to follow up.')).toBeInTheDocument()
  })

  it('the same file again is said as already loaded -- nothing was loaded twice', async () => {
    answerUpload = () => HttpResponse.json({ ...ABSA_SEPTEMBER, alreadyLoaded: true }, { status: 200 })
    const user = setupUser()
    openLoad()
    await chooseEmployerAndMonth(user)
    await user.upload(fileInput(), csvFile())
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))
    expect(await screen.findByText(/already loaded for the employer and month, so nothing was loaded twice/)).toBeInTheDocument()
  })

  it('a different file for a month already loaded is replaced only when the administrator says so', async () => {
    answerUpload = (n) => (n === 1
      ? refusal(409, 'FILE_EXISTS_FOR_PERIOD', 'A different file is loaded for this employer and month.', {
        fileId: '9', uploadedAt: '2026-09-28T08:15:00Z', uploadedBy: 'system',
      })
      : HttpResponse.json(ABSA_SEPTEMBER, { status: 201 }))
    const user = setupUser()
    openLoad()
    const month = await chooseEmployerAndMonth(user)
    await user.upload(fileInput(), csvFile())
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))

    const dialog = await screen.findByRole('dialog', { name: 'Replace the file already loaded?' })
    expect(dialog).toHaveTextContent('loaded on 28 September 2026 at 10:15 by system')
    expect(within(dialog).getByRole('link', { name: 'Open the file already loaded' })).toHaveAttribute('href', '/admin/payroll/files/9')
    expect(uploads).toHaveLength(1)

    await user.click(within(dialog).getByRole('button', { name: 'Replace the file' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Absa — September 2026' })).toBeInTheDocument()
    expect(uploads[1]).toEqual({ file: expect.any(String), employerId: '1', period: month, replace: 'true' })
  })

  it('no row of headings found: the screen asks for each heading as printed, and sends them with the file', async () => {
    answerUpload = (n) => (n === 1
      ? refusal(422, 'HEADING_ROW_NOT_FOUND', 'No row of headings this system recognises was found.', { lookedFor: 'EMP NO, SURNAME, AMOUNT' })
      : HttpResponse.json(ABSA_SEPTEMBER, { status: 201 }))
    const user = setupUser()
    openLoad()
    await chooseEmployerAndMonth(user)
    await user.upload(fileInput(), csvFile())
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))

    expect(await screen.findByText(/No row of headings this system recognises was found\. Give the heading of each column below/)).toBeInTheDocument()
    const headings = screen.getByRole('group', { name: 'The file’s headings' })
    expect(headings).toHaveTextContent('The system looked for headings such as: EMP NO, SURNAME, AMOUNT.')

    await user.click(screen.getByRole('button', { name: 'Load and compare' }))
    expect(within(headings).getByText('Give the heading of the column with the amount deducted.')).toBeInTheDocument()
    expect(uploads).toHaveLength(1)

    await user.type(within(headings).getByLabelText('Amount deducted'), 'DEDUCTION')
    await user.type(within(headings).getByLabelText('Staff number'), 'PERS NO')
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))
    await screen.findByRole('heading', { level: 1, name: 'Absa — September 2026' })
    expect(JSON.parse(uploads[1].columnMapping)).toEqual({
      staffNumber: 'PERS NO', idNumber: null, initials: null, surname: null, fullName: null, amount: 'DEDUCTION',
    })
  })

  it('a document the server cannot read switches the screen to typing its lines in', async () => {
    answerUpload = () => refusal(415, 'TYPED_ENTRY_REQUIRED', 'This file is a picture, which cannot be read.')
    const user = setupUser()
    openLoad()
    await chooseEmployerAndMonth(user)
    await user.upload(fileInput(), csvFile())
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))
    expect(await screen.findByText('This file is a picture, which cannot be read. Type its lines in below.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The lines, typed in' })).toBeInTheDocument()
  })

  it('a refusal says nothing was loaded, in the server\'s words', async () => {
    answerUpload = () => refusal(422, 'FILE_UNREADABLE', 'The workbook is damaged or protected by a password.')
    const user = setupUser()
    openLoad()
    await chooseEmployerAndMonth(user)
    await user.upload(fileInput(), csvFile())
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))
    expect(await screen.findByText('Nothing was loaded. The workbook is damaged or protected by a password.')).toBeInTheDocument()
  })

  it('🔴 a send whose answer never arrived is unconfirmed -- never "nothing was loaded"', async () => {
    answerUpload = () => HttpResponse.json({ message: 'boom' }, { status: 502 })
    const user = setupUser()
    openLoad()
    await chooseEmployerAndMonth(user)
    await user.upload(fileInput(), csvFile())
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))
    expect(await screen.findByText(/whether it was loaded could not be confirmed\. Load it again: the same file is never loaded twice\./)).toBeInTheDocument()
    expect(screen.queryByText(/Nothing was loaded/)).not.toBeInTheDocument()
  })

  it('Cancel stops the waiting, and says the file may still have arrived', async () => {
    const held = deferred()
    answerUpload = () => held.promise
    const user = setupUser()
    openLoad()
    await chooseEmployerAndMonth(user)
    await user.upload(fileInput(), csvFile())
    await user.click(screen.getByRole('button', { name: 'Load and compare' }))
    expect(await screen.findByText('Loading the file and comparing it with SASBO’s members…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load and compare' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText(/Stopped waiting\. The file may still have reached the server/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load and compare' })).toBeEnabled()
    held.resolve(HttpResponse.json(ABSA_SEPTEMBER, { status: 201 }))
  })
})

describe('typing the lines in -- GBS sends a PDF and SA Reserve Bank a picture (PAY-03)', () => {
  it('an employer whose file cannot be read goes straight to typing, and the lines are sent with the total printed', async () => {
    const user = setupUser()
    openLoad()
    const month = await chooseEmployerAndMonth(user, 'GBS')
    expect(screen.queryByLabelText(/^The employer.s file/)).not.toBeInTheDocument()
    expect(screen.getByText(/GBS sends its deductions as a document that cannot be read/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Line 1: Staff number'), 'EMP-1')
    await user.type(screen.getByLabelText('Line 1: Surname'), 'Testerson')
    await user.type(screen.getByLabelText('Line 1: Amount (R)'), '174')
    await user.click(screen.getByRole('button', { name: 'Add a line' }))
    await user.type(screen.getByLabelText('Line 2: Initials'), 'BK')
    await user.type(screen.getByLabelText('Line 2: Surname'), 'Example')
    await user.type(screen.getByLabelText('Line 2: Amount (R)'), '174,5')
    expect(screen.getByText(/2 lines, totalling/)).toHaveTextContent('R 348,50')
    await user.type(screen.getByLabelText(/^Total printed on the document/), '348.50')
    await user.click(screen.getByRole('button', { name: 'Compare the typed lines' }))

    await screen.findByRole('heading', { level: 1, name: 'Absa — September 2026' })
    expect(typedBodies).toEqual([{
      employerId: 7, period: month, statedTotal: '348.50',
      rows: [
        { staffNumber: 'EMP-1', idNumber: null, initials: null, surname: 'Testerson', amount: '174.00' },
        { staffNumber: null, idNumber: null, initials: 'BK', surname: 'Example', amount: '174.50' },
      ],
    }])
    expect(uploads).toEqual([])
  })

  it('a line with no one to match, or no amount in rands and cents, is named and nothing is sent', async () => {
    const user = setupUser()
    openLoad()
    await chooseEmployerAndMonth(user, 'GBS')
    await user.type(screen.getByLabelText('Line 1: Surname'), 'Testerson')
    await user.type(screen.getByLabelText('Line 1: Amount (R)'), 'a lot')
    await user.click(screen.getByRole('button', { name: 'Compare the typed lines' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Line 1: Give the amount in rands and cents, such as 174.00.')
    expect(screen.getByLabelText('Line 1: Amount (R)')).toHaveAttribute('aria-invalid', 'true')
    expect(typedBodies).toEqual([])
  })

  it('a line the server refuses is marked where it is', async () => {
    server.use(http.post('*/api/payroll/files/typed', () =>
      refusal(400, 'TYPED_ROWS_INVALID', 'Line 1 has an ID number that cannot be one.', { row: '1', field: 'idNumber' })))
    const user = setupUser()
    openLoad()
    await chooseEmployerAndMonth(user, 'GBS')
    await user.type(screen.getByLabelText('Line 1: ID number'), '123')
    await user.type(screen.getByLabelText('Line 1: Amount (R)'), '174')
    await user.click(screen.getByRole('button', { name: 'Compare the typed lines' }))
    expect(await screen.findByText('Line 1 has an ID number that cannot be one.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Line 1: ID number')).toHaveAttribute('aria-invalid', 'true'))
  })
})

// One scan a test, as the file page's: two whole-page scans in one test are the work a contended box cannot finish in time.
describe('accessibility', () => {
  it('the form, with a file chosen, has no violations', async () => {
    const user = setupUser()
    const { container } = openLoad()
    await chooseEmployerAndMonth(user)
    await user.upload(fileInput(), csvFile())
    await screen.findByText(/ready to load/)
    await expectNoA11yViolations(container)
  })

  it('the typed lines have no violations', async () => {
    const user = setupUser()
    const { container } = openLoad()
    await chooseEmployerAndMonth(user, 'GBS')
    await screen.findByRole('heading', { name: 'The lines, typed in' })
    await expectNoA11yViolations(container)
  })
})
