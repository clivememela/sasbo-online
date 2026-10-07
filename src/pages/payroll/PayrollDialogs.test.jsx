// @vitest-environment jsdom -- a payroll file's dialogs: a discrepancy's notes and outcome, a payment received, the columns
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { ColumnsDialog, DiscrepancyDialog, PaymentDialog } from './PayrollDialogs'
import { formatZar, parseDate, toWireDate } from '../../lib/format'
import { expectNoA11yViolations } from '../../test/assertions'
import { deferred } from '../../test/deferred'
import { server } from '../../test/msw/server'
import { ABSA_SEPTEMBER, AMOUNT_DIFFERS_77, VOCABULARY, payrollHandlers, refusal } from '../../test/msw/payrollExamples'
import { renderWithProviders } from '../../test/renderWithProviders'
import { setupUser } from '../../test/user'

/**
 * THE THREE DIALOGS OF A PAYROLL FILE.
 *
 * A discrepancy stays open, with its notes, until an administrator resolves it with an outcome and a note (PAY-20); a
 * resolve sends the version last read, and one refused for a change made since is read again and said so. A payment
 * received is checked against the file (PAY-28) -- and, because two records are two payments, one whose answer never
 * arrived is never sent again from the dialog. The columns are chosen from the headings the file has (route 10).
 */

/** Rands as the page prints them, with the no-break spaces jest-dom's text matching reads as plain ones. */
const money = (amount) => formatZar(amount).replace(/\s/g, ' ')

/** Requests to a route, with their JSON bodies. */
const posted = (path, respond) => {
  const seen = []
  server.use(http.post(path, async ({ request }) => {
    const text = await request.text()
    seen.push(text ? JSON.parse(text) : null)
    return respond(seen.length)
  }))
  return seen
}

/** The discrepancy's reads, counted. */
const readsOf = (answer = () => HttpResponse.json(AMOUNT_DIFFERS_77)) => {
  const reads = { count: 0 }
  server.use(http.get('*/api/payroll/discrepancies/:id', () => {
    reads.count += 1
    return answer(reads.count)
  }))
  return reads
}

const resolved = {
  ...AMOUNT_DIFFERS_77,
  status: 'RESOLVED',
  resolution: { outcome: 'ARREARS_RECORDED', by: 'system', at: '2026-10-07T08:00:00Z' },
  notes: [...AMOUNT_DIFFERS_77.notes, { id: 6, text: 'Recorded R24.00 owed.', by: 'system', at: '2026-10-07T08:00:00Z' }],
  version: 3,
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  server.use(...payrollHandlers())
})

const openDiscrepancy = ({ canProcess = true, onClose = vi.fn() } = {}) => {
  renderWithProviders(<DiscrepancyDialog discrepancyId="77" vocabulary={VOCABULARY} canProcess={canProcess} onClose={onClose} />)
  return onClose
}

describe('a discrepancy -- why it is listed, what to do, its notes and its outcome', () => {
  it('reads it first, then shows the member, the line on the file, what happened, what to do, the amounts and the notes', async () => {
    const held = deferred()
    readsOf(() => held.promise)
    openDiscrepancy({ canProcess: false })
    expect(await screen.findByText('Reading the discrepancy…')).toBeInTheDocument()
    held.resolve(HttpResponse.json(AMOUNT_DIFFERS_77))

    const dialog = await screen.findByRole('dialog', { name: 'Amount differs' })
    expect(dialog).toHaveAccessibleDescription('B.K. Testerson (M-095012) · Absa, September 2026')
    expect(await within(dialog).findByText('What happened')).toBeInTheDocument()
    const term = (name) => within(dialog).getByText(name).nextElementSibling
    expect(term('Member')).toHaveTextContent('B.K. Testerson (M-095012)')
    expect(within(term('Member')).getByText('Active')).toBeInTheDocument()
    expect(term('On the file')).toHaveTextContent(`Row 9: staff number EMP-40231 · ID number ****5081 · BK Testerson · ${money(150)}`)
    expect(term('What happened')).toHaveTextContent('R150.00 deducted; R174.00 expected: R24.00 short.')
    expect(term('What to do')).toHaveTextContent('ask the employer to correct it, and record the difference as arrears or a credit. (PAY-16)')
    expect(term('Amounts')).toHaveTextContent(`${money(150)} on the file · ${money(174)} expected · ${money(24)} short`)
    expect(within(dialog).getByText('Asked the employer by e-mail.').closest('li')).toHaveTextContent('system, 29 September 2026 at 12:00')
  })

  it('🔒 reading alone: no note, no outcome, only Close', async () => {
    openDiscrepancy({ canProcess: false })
    const dialog = await screen.findByRole('dialog', { name: 'Amount differs' })
    await within(dialog).findByText('What happened')
    expect(within(dialog).queryByRole('textbox', { name: 'Note' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Add the note' })).not.toBeInTheDocument()
    // The footer's Close, beside the X: the one way out offered.
    expect(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1)).toHaveTextContent('Close')
  })

  it('a note is added and shown; closing then says something changed', async () => {
    const notes = posted('*/api/payroll/discrepancies/:id/notes', () => HttpResponse.json({
      ...AMOUNT_DIFFERS_77, noteCount: 2,
      notes: [...AMOUNT_DIFFERS_77.notes, { id: 6, text: 'The employer will correct it next month.', by: 'system', at: '2026-10-07T08:00:00Z' }],
    }, { status: 201 }))
    const user = setupUser()
    const onClose = openDiscrepancy()
    const dialog = await screen.findByRole('dialog', { name: 'Amount differs' })
    await user.type(await within(dialog).findByRole('textbox', { name: 'Note' }), '  The employer will correct it next month.  ')
    await user.click(within(dialog).getByRole('button', { name: 'Add the note' }))

    expect(await within(dialog).findByText('The note was added.')).toBeInTheDocument()
    expect(within(dialog).getByText('The employer will correct it next month.')).toBeInTheDocument()
    expect(notes).toEqual([{ text: 'The employer will correct it next month.' }])
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1))
    expect(onClose).toHaveBeenCalledWith(true)
  })

  it('🔑 resolving needs an outcome and a note, sends the version read, and then shows how it was resolved', async () => {
    const resolves = posted('*/api/payroll/discrepancies/:id/resolve', () => HttpResponse.json(resolved))
    const user = setupUser()
    openDiscrepancy()
    const dialog = await screen.findByRole('dialog', { name: 'Amount differs' })
    await within(dialog).findByText('What happened')

    await user.click(within(dialog).getByRole('button', { name: 'Resolve' }))
    expect(within(dialog).getByText('Write what was done first.')).toBeInTheDocument()
    expect(within(dialog).getByText('Choose the outcome first.')).toBeInTheDocument()
    expect(resolves).toEqual([])

    // Only the outcomes the server offers for this kind.
    const outcome = within(dialog).getByLabelText(/^Outcome, to resolve it/)
    expect(within(outcome).getAllByRole('option').map((option) => option.textContent))
      .toEqual(['Choose the outcome', 'The employer corrected it', 'Recorded as arrears', 'Recorded as a credit', 'Other'])
    await user.selectOptions(outcome, 'Recorded as arrears')
    await user.type(within(dialog).getByRole('textbox', { name: 'Note' }), 'Recorded R24.00 owed.')
    await user.click(within(dialog).getByRole('button', { name: 'Resolve' }))

    expect(await within(dialog).findByText('Resolved: Recorded as arrears.')).toBeInTheDocument()
    expect(resolves).toEqual([{ outcome: 'ARREARS_RECORDED', note: 'Recorded R24.00 owed.', version: 2 }])
    expect(within(dialog).getByText('Resolved')).toBeInTheDocument()
    expect(within(dialog).getByText(/Recorded as arrears, by system on 7 October 2026 at 10:00\./)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox', { name: 'Note' })).not.toBeInTheDocument()
  })

  it('a note alone never complains of a missing outcome', async () => {
    posted('*/api/payroll/discrepancies/:id/notes', () => HttpResponse.json(AMOUNT_DIFFERS_77, { status: 201 }))
    const user = setupUser()
    openDiscrepancy()
    const dialog = await screen.findByRole('dialog', { name: 'Amount differs' })
    await user.click(await within(dialog).findByRole('button', { name: 'Add the note' }))
    expect(within(dialog).getByText('Write what was done first.')).toBeInTheDocument()
    expect(within(dialog).queryByText('Choose the outcome first.')).not.toBeInTheDocument()
  })

  it('a discrepancy changed since it was read is read again -- never written over -- and said so', async () => {
    const reads = readsOf()
    posted('*/api/payroll/discrepancies/:id/resolve', () =>
      refusal(409, 'DISCREPANCY_CHANGED_SINCE', 'Someone changed this discrepancy since you opened it.'))
    const user = setupUser()
    openDiscrepancy()
    const dialog = await screen.findByRole('dialog', { name: 'Amount differs' })
    await user.selectOptions(await within(dialog).findByLabelText(/^Outcome, to resolve it/), 'Other')
    await user.type(within(dialog).getByRole('textbox', { name: 'Note' }), 'Explained by phone.')
    await user.click(within(dialog).getByRole('button', { name: 'Resolve' }))

    expect(await within(dialog).findByText('Someone changed this discrepancy since you opened it. It has been read again, as it now stands.')).toBeInTheDocument()
    await waitFor(() => expect(reads.count).toBe(2))
  })

  it('🔴 a write whose answer never arrived is read again before anything is said of it', async () => {
    const reads = readsOf()
    posted('*/api/payroll/discrepancies/:id/notes', () => HttpResponse.json({ message: 'boom' }, { status: 503 }))
    const user = setupUser()
    openDiscrepancy()
    const dialog = await screen.findByRole('dialog', { name: 'Amount differs' })
    await user.type(await within(dialog).findByRole('textbox', { name: 'Note' }), 'Asked again.')
    await user.click(within(dialog).getByRole('button', { name: 'Add the note' }))
    expect(await within(dialog).findByText(/Whether that was saved could not be confirmed\. It has been read again/)).toBeInTheDocument()
    await waitFor(() => expect(reads.count).toBe(2))
    expect(within(dialog).queryByText(/Nothing was saved/)).not.toBeInTheDocument()
  })

  it('a refusal says nothing was saved, in the server\'s words', async () => {
    posted('*/api/payroll/discrepancies/:id/notes', () => refusal(400, 'NOTE_INVALID', 'A note is at most 1,000 characters.'))
    const user = setupUser()
    openDiscrepancy()
    const dialog = await screen.findByRole('dialog', { name: 'Amount differs' })
    await user.type(await within(dialog).findByRole('textbox', { name: 'Note' }), 'Too long, says the server.')
    await user.click(within(dialog).getByRole('button', { name: 'Add the note' }))
    expect(await within(dialog).findByText('Nothing was saved. A note is at most 1,000 characters.')).toBeInTheDocument()
  })

  it('a discrepancy that could not be read says so, with a retry', async () => {
    readsOf((n) => (n === 1 ? HttpResponse.error() : HttpResponse.json(AMOUNT_DIFFERS_77)))
    const user = setupUser()
    openDiscrepancy()
    const dialog = await screen.findByRole('dialog', { name: 'Discrepancy' })
    expect(await within(dialog).findByText('The discrepancy could not be read.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('dialog', { name: 'Amount differs' })).toBeInTheDocument()
  })

  it('a resolved discrepancy offers no note and no outcome, even to an administrator who processes payroll', async () => {
    readsOf(() => HttpResponse.json(resolved))
    openDiscrepancy()
    const dialog = await screen.findByRole('dialog', { name: 'Amount differs' })
    await within(dialog).findByText('What happened')
    expect(within(dialog).queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
    expect(within(dialog).getByText(/Recorded as arrears, by system/)).toBeInTheDocument()
  })

  it('has no violations, with its notes and its fields', async () => {
    openDiscrepancy()
    const dialog = await screen.findByRole('dialog', { name: 'Amount differs' })
    await within(dialog).findByRole('textbox', { name: 'Note' })
    await expectNoA11yViolations(dialog, { rules: { region: { enabled: false } } })
  })
})

/** The first day the calendar lets a person choose, and its wire form -- read from the cell, never from a clock. */
const chooseADay = async (user, dialog) => {
  await user.click(within(dialog).getByRole('combobox', { name: /Received on/ }))
  const cell = screen.getAllByRole('gridcell').find((candidate) => !candidate.hasAttribute('aria-disabled'))
  const day = toWireDate(parseDate(cell.getAttribute('aria-label').replace(', today', '')))
  await user.click(cell)
  return day
}

describe('a payment received (PAY-28)', () => {
  const openPayment = (onClose = vi.fn()) => {
    renderWithProviders(<PaymentDialog file={ABSA_SEPTEMBER} onClose={onClose} />)
    return onClose
  }

  it('needs the amount and the day, then sends them with the reference', async () => {
    const payments = posted('*/api/payroll/payments', () => HttpResponse.json({ id: 9 }, { status: 201 }))
    const user = setupUser()
    const onClose = openPayment()
    const dialog = screen.getByRole('dialog', { name: 'Record a payment received' })
    expect(dialog).toHaveAccessibleDescription('From Absa, for September 2026.')

    await user.click(within(dialog).getByRole('button', { name: 'Record the payment' }))
    expect(within(dialog).getByText('Give the amount in rands and cents, such as 5738.52.')).toBeInTheDocument()
    expect(payments).toEqual([])

    await user.type(within(dialog).getByLabelText(/^Amount received/), '5738.52')
    const day = await chooseADay(user, dialog)
    await user.type(within(dialog).getByLabelText(/^Reference/), 'EFT 0923')
    await user.click(within(dialog).getByRole('button', { name: 'Record the payment' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledWith('saved'))
    expect(payments).toEqual([{ employerId: 1, period: '2026-09', amount: '5738.52', receivedOn: day, reference: 'EFT 0923' }])
  })

  it('🔴 a payment whose answer never arrived is not sent again from here: the dialog closes for the file to be read', async () => {
    const payments = posted('*/api/payroll/payments', () => HttpResponse.json({ message: 'boom' }, { status: 502 }))
    const user = setupUser()
    const onClose = openPayment()
    const dialog = screen.getByRole('dialog', { name: 'Record a payment received' })
    await user.type(within(dialog).getByLabelText(/^Amount received/), '174')
    await chooseADay(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Record the payment' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledWith('unconfirmed'))
    expect(payments).toHaveLength(1)
  })

  it('a refused payment says it was not recorded, in the server\'s words, and stays open', async () => {
    posted('*/api/payroll/payments', () => refusal(400, 'PAYMENT_INVALID', 'The day received cannot be in the future.', { field: 'receivedOn' }))
    const user = setupUser()
    const onClose = openPayment()
    const dialog = screen.getByRole('dialog', { name: 'Record a payment received' })
    await user.type(within(dialog).getByLabelText(/^Amount received/), '174')
    await chooseADay(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Record the payment' }))
    expect(await within(dialog).findByText('The payment was not recorded. The day received cannot be in the future.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('the columns (route 10) -- chosen from the headings the file has', () => {
  const openColumns = (file = ABSA_SEPTEMBER, onClose = vi.fn()) => {
    renderWithProviders(<ColumnsDialog file={file} onClose={onClose} />)
    return onClose
  }

  it('🔑 starts from the columns read, offers every heading on the file, and compares again with the ones chosen', async () => {
    const compares = posted('*/api/payroll/files/:id/reconcile', () => HttpResponse.json({ ...ABSA_SEPTEMBER, version: 2 }))
    const user = setupUser()
    const onClose = openColumns()
    const dialog = screen.getByRole('dialog', { name: 'Change the columns' })
    expect(within(dialog).getByLabelText('Staff number')).toHaveValue('EMP NO')
    expect(within(dialog).getByLabelText('Full name, in one column')).toHaveValue('')
    expect(within(within(dialog).getByLabelText('Amount deducted')).getAllByRole('option').map((option) => option.textContent))
      .toEqual(['Not on the file', 'EMP NO', 'ID NUMBER', 'INITIALS', 'SURNAME', 'AMOUNT', 'BRANCH'])
    expect(dialog).toHaveTextContent('Read from the sheet “Sheet1”, row 4.')

    await user.selectOptions(within(dialog).getByLabelText('ID number'), 'Not on the file')
    await user.selectOptions(within(dialog).getByLabelText('Initials'), 'Not on the file')
    await user.click(within(dialog).getByRole('button', { name: 'Compare again with these columns' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledWith({ answer: expect.objectContaining({ id: 12, version: 2 }) }))
    expect(compares).toEqual([{
      version: 1,
      columnMapping: { staffNumber: 'EMP NO', idNumber: null, initials: null, surname: 'SURNAME', fullName: null, amount: 'AMOUNT' },
    }])
  })

  it('refuses columns with no amount, or one heading for two fields, and sends nothing', async () => {
    const compares = posted('*/api/payroll/files/:id/reconcile', () => HttpResponse.json(ABSA_SEPTEMBER))
    const user = setupUser()
    openColumns()
    const dialog = screen.getByRole('dialog', { name: 'Change the columns' })
    await user.selectOptions(within(dialog).getByLabelText('Amount deducted'), 'Not on the file')
    await user.click(within(dialog).getByRole('button', { name: 'Compare again with these columns' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Give the heading of the column with the amount deducted.')

    await user.selectOptions(within(dialog).getByLabelText('Amount deducted'), 'EMP NO')
    expect(within(dialog).getByRole('alert')).toHaveTextContent('The same heading is given for two fields. Give each column once.')
    expect(compares).toEqual([])
  })

  it('a file changed since it was read is read again, and the page says so', async () => {
    posted('*/api/payroll/files/:id/reconcile', () => refusal(409, 'FILE_CHANGED_SINCE', 'Someone compared this file again since you opened it.'))
    const user = setupUser()
    const onClose = openColumns()
    await user.click(within(screen.getByRole('dialog', { name: 'Change the columns' })).getByRole('button', { name: 'Compare again with these columns' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledWith({ message: 'Someone compared this file again since you opened it. The file has been read again.' }))
  })

  it('with no list of headings from the server, each heading is typed as printed', () => {
    openColumns({ ...ABSA_SEPTEMBER, layout: { ...ABSA_SEPTEMBER.layout, columns: undefined } })
    const dialog = screen.getByRole('dialog', { name: 'Change the columns' })
    expect(within(dialog).getByRole('textbox', { name: 'Staff number' })).toHaveValue('EMP NO')
    expect(within(dialog).getAllByText('As printed on the heading row.')).toHaveLength(6)
  })
})
