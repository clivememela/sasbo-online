import { describe, expect, it } from 'vitest'

import { formatInt, formatZar } from '../../lib/format'
import { committedSurface, committedVocabulary } from '../../test/apiContractScan'
import { WHAT_TO_DO, payrollHandlers } from '../../test/msw/payrollExamples'
import {
  AMOUNT_STATUS, DEFAULT_LIMITS, DISCREPANCY_LABEL, DISCREPANCY_STATUS, ENTRY, FILE_STATUS, MATCH_RULE, PAYMENT_STATUS,
  PURGED, QUERY_ACTION, RECONCILED, REFUSAL, RESOLVED, ROW_FILTER, SUPERSEDED, amountOf, amountStatusLabel,
  differenceLabel, discrepancyLabel, fileProblem, fileState, idOf, limitsOf, mappingOf, mappingProblems, noteProblem,
  outcomeLabel, percentLabel, rands, recentMonths, sizeLabel, sniffKind, typedAmountOf,
} from './payrollRules'

/**
 * Payroll Deductions and Reconciliation's rules, and their parity with the server's published vocabulary
 * (`payroll-api.md` draft 2; the committed `api-vocabulary.json` "payroll" section). Every rule has its must-pass
 * beside it: a check that refused everything would pass every "refuses" row.
 */
const payroll = committedVocabulary().payroll
const sorted = (values) => [...values].sort()

describe('the words are the server\'s', () => {
  it('names exactly the discrepancy types the server publishes, with its labels', () => {
    expect(payroll.discrepancyTypes.length).toBeGreaterThan(10) // the section was read at all
    expect(sorted(Object.keys(DISCREPANCY_LABEL))).toEqual(sorted(payroll.discrepancyTypes.map((entry) => entry.type)))
    for (const { type, label } of payroll.discrepancyTypes) expect(DISCREPANCY_LABEL[type], type).toBe(label)
  })

  it.each([
    ['discrepancy statuses', DISCREPANCY_STATUS, 'statuses'],
    ['amount statuses', AMOUNT_STATUS, 'amountStatuses'],
    ['payment statuses', PAYMENT_STATUS, 'paymentStatuses'],
    ['query actions', QUERY_ACTION, 'queryActions'],
    ['line filters', ROW_FILTER, 'rowFilters'],
    ['file statuses', FILE_STATUS, 'fileStatuses'],
    ['entries', ENTRY, 'entries'],
    ['match rules', MATCH_RULE, 'matchRules'],
  ])('words for exactly the server\'s %s', (_, table, key) => {
    expect(sorted(Object.keys(table))).toEqual(sorted(payroll[key]))
  })

  it('compares states by names the server publishes', () => {
    expect(payroll.fileStatuses).toEqual(expect.arrayContaining([RECONCILED, SUPERSEDED, PURGED]))
    expect(payroll.statuses).toContain(RESOLVED)
  })

  it('acts only on refusal codes the server publishes', () => {
    const codes = payroll.refusalCodes.map((refusal) => refusal.code)
    for (const [key, code] of Object.entries(REFUSAL)) {
      expect(code, key).toBe(key)
      expect(codes, `${code} is acted on by a screen and not published by the server`).toContain(code)
    }
  })

  it('the fixtures carry the server\'s sentence of what to do for every type', () => {
    for (const { type } of payroll.discrepancyTypes) expect(WHAT_TO_DO[type], type).toMatch(/\w/)
  })

  it('every fixture handler answers a route the server serves', () => {
    const surface = new Set(committedSurface())
    const handlers = payrollHandlers()
    expect(handlers.length).toBeGreaterThan(5)
    for (const handler of handlers) {
      const route = `${handler.info.method} ${handler.info.path.replace(/^\*/, '').replaceAll(':id', '{id}')}`
      expect(surface.has(route), `${route} is answered by the fixtures and not served by the server`).toBe(true)
    }
  })
})

describe('an address and an amount', () => {
  it.each([['12', '12'], ['900719925474099', '900719925474099']])('the id %s is %s', (raw, id) => {
    expect(idOf(raw)).toBe(id)
  })

  it.each([[':fileId'], ['0'], ['-1'], ['12abc'], [''], [undefined], ['1234567890123456789']])('%j is no id', (raw) => {
    expect(idOf(raw)).toBeNull()
  })

  it('reads the server\'s decimal strings as numbers, and nothing else as one', () => {
    expect(amountOf('174.00')).toBe(174)
    expect(amountOf('-24.00')).toBe(-24)
    expect(amountOf(5)).toBe(5)
    for (const value of ['', null, undefined, 'abc', [], {}]) expect(amountOf(value)).toBeNull()
    expect(rands('5916.00')).toBe(formatZar(5916))
    expect(rands(null)).toBe('—')
  })

  it.each([
    ['174', '174.00'], ['174.5', '174.50'], ['174,5', '174.50'], [' 168.78 ', '168.78'], ['1234567.89', '1234567.89'],
  ])('a typed amount %j is %s', (typed, amount) => {
    expect(typedAmountOf(typed)).toBe(amount)
  })

  it.each([['174.555'], ['-5'], ['abc'], [''], ['12345678'], ['1.2.3'], [null]])('%j is not an amount', (typed) => {
    expect(typedAmountOf(typed)).toBeNull()
  })

  it('a difference reads short, over or none, in rands', () => {
    expect(differenceLabel('-174.00')).toBe(`${formatZar(174)} short`)
    expect(differenceLabel('12.00')).toBe(`${formatZar(12)} over`)
    expect(differenceLabel('0.00')).toBe('None')
    expect(differenceLabel(null)).toBe('—')
  })

  it('a fee\'s rate reads as Stephne wrote it', () => {
    expect(percentLabel('3.00')).toBe('3%')
    expect(percentLabel('2.50')).toBe(`${formatInt(2.5)}%`)
    expect(percentLabel(null)).toBe('—')
  })
})

describe('a file in the list', () => {
  const file = (fields) => ({ status: RECONCILED, discrepancies: 0, openDiscrepancies: 0, ...fields })

  it.each([
    ['still to follow up', file({ discrepancies: 13, openDiscrepancies: 9 }), '9 open', 'pending'],
    ['all resolved', file({ discrepancies: 4 }), 'All resolved', 'active'],
    ['nothing found', file({}), 'Processed, nothing to follow up', 'active'],
    ['replaced', file({ status: SUPERSEDED, openDiscrepancies: 3 }), 'Replaced by a later file', 'unknown'],
    ['a year old', file({ status: PURGED }), 'Contents deleted after a year', 'unknown'],
    ['unknown', file({ status: 'SOMETHING_NEW' }), 'SOMETHING_NEW', 'unknown'],
  ])('%s', (_, given, label, tone) => {
    expect(fileState(given)).toEqual({ label, tone })
  })
})

describe('choosing a file -- checked before anything is sent', () => {
  const named = (name, size = 2048) => ({ name, size })
  const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const ZIP = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]
  const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

  it('knows a PDF and a picture by their first bytes, and claims nothing else', () => {
    expect(sniffKind(PDF)).toBe('pdf')
    expect(sniffKind(PNG)).toBe('picture')
    expect(sniffKind([0xff, 0xd8, 0xff, 0xe0])).toBe('picture')
    expect(sniffKind(ZIP)).toBeNull()
    expect(sniffKind(OLE)).toBeNull()
    expect(sniffKind([])).toBeNull()
  })

  it('🔴 a PDF named .xlsx is still a PDF: its lines are to be typed in', () => {
    const problem = fileProblem(named('Invented payroll.xlsx'), { head: new Uint8Array(PDF) })
    expect(problem).toEqual({ typeIn: true, message: expect.stringMatching(/is a PDF, which cannot be read\. Type the lines in/) })
  })

  it('a picture, by its name alone, is to be typed in', () => {
    expect(fileProblem(named('Reserve bank notice.png'))).toMatchObject({ typeIn: true, message: expect.stringMatching(/a picture/) })
  })

  it('a kind that is no spreadsheet is refused with the kinds that are read', () => {
    expect(fileProblem(named('notes.docx')).message).toBe('Only Excel and CSV files can be loaded (.xlsx, .xls, .csv); this one is a .docx file.')
    expect(fileProblem(named('no-extension')).message).toMatch(/of a type that is not recognised/)
  })

  it('an empty file, and one over the limit, are refused with the sizes', () => {
    expect(fileProblem(named('empty.csv', 0)).message).toBe('This file is empty. Choose the file the employer sent.')
    expect(fileProblem(named('big.xlsx', 11 * 1024 * 1024)).message).toBe('This file is 11 MB; files up to 10 MB can be loaded.')
    expect(fileProblem(named('big.xlsx', 3 * 1024 * 1024), { maxBytes: 2 * 1024 * 1024 }).message).toMatch(/up to 2 MB/)
  })

  it('the must-pass: a spreadsheet of each kind, under the limit, is sent', () => {
    expect(fileProblem(named('Invented.xlsx'), { head: new Uint8Array(ZIP) })).toBeNull()
    expect(fileProblem(named('Invented.XLS'), { head: new Uint8Array(OLE) })).toBeNull()
    expect(fileProblem(named('Invented.csv'), { head: new TextEncoder().encode('EMP NO,') })).toBeNull()
    expect(fileProblem(named('exactly.xlsx', DEFAULT_LIMITS.maxBytes))).toBeNull()
  })

  it('nothing chosen says so', () => {
    expect(fileProblem(null)).toEqual({ message: 'Choose the employer’s file first.' })
  })

  it('states sizes as a file chooser does, and the server\'s limits where it gave them', () => {
    expect(sizeLabel(10485760)).toBe('10 MB')
    expect(sizeLabel(18234)).toBe('18 KB')
    expect(sizeLabel(10)).toBe('1 KB')
    expect(sizeLabel(-1)).toBe('—')
    expect(limitsOf(null)).toEqual(DEFAULT_LIMITS)
    expect(limitsOf({ limits: { maxBytes: 2048, maxTypedRows: 0, noteMaxLength: 'x' } }))
      .toEqual({ ...DEFAULT_LIMITS, maxBytes: 2048 })
  })
})

describe('the columns of a file', () => {
  it('needs the amount, and one way to know who the line is', () => {
    expect(mappingProblems({})).toEqual([
      'Give the heading of the column with the amount deducted.',
      'Give the heading of the staff number, the ID number or the surname: a line is matched on one of them.',
    ])
    expect(mappingProblems({ amount: '   ', surname: 'SURNAME' })).toEqual(['Give the heading of the column with the amount deducted.'])
  })

  it('refuses one heading for two fields, whatever its case, and a heading too long to be one', () => {
    expect(mappingProblems({ amount: 'AMOUNT', staffNumber: 'amount' })).toEqual(['The same heading is given for two fields. Give each column once.'])
    expect(mappingProblems({ amount: 'A'.repeat(81), surname: 'SURNAME' })).toEqual(['A heading is at most 80 characters.'])
  })

  it('the must-pass: an amount and any one identifier will do, and the headings are sent trimmed', () => {
    for (const field of ['staffNumber', 'idNumber', 'surname', 'fullName']) {
      expect(mappingProblems({ amount: 'AMOUNT', [field]: 'X' }), field).toEqual([])
    }
    expect(mappingOf({ amount: ' AMOUNT ', staffNumber: 'EMP NO', surname: '' })).toEqual({
      staffNumber: 'EMP NO', idNumber: null, initials: null, surname: null, fullName: null, amount: 'AMOUNT',
    })
  })
})

describe('notes and words', () => {
  it('a note says what was done, within the server\'s limit', () => {
    expect(noteProblem('')).toBe('Write what was done first.')
    expect(noteProblem('   ')).toBe('Write what was done first.')
    expect(noteProblem('x'.repeat(1001))).toBe(`Keep the note to ${formatInt(1000)} characters.`)
    expect(noteProblem('x'.repeat(41), 40)).toBe('Keep the note to 40 characters.')
    expect(noteProblem('Asked the employer by e-mail.')).toBeNull()
  })

  it('a type\'s name: the vocabulary\'s when it answered, else the same words held here, else its code', () => {
    expect(discrepancyLabel('AMOUNT_DIFFERS')).toBe('Amount differs')
    expect(discrepancyLabel('AMOUNT_DIFFERS', { discrepancyTypes: [{ type: 'AMOUNT_DIFFERS', label: 'Server words' }] })).toBe('Server words')
    expect(discrepancyLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
  })

  it('an outcome\'s words: the server\'s, the system\'s own, or its code in words', () => {
    const vocabulary = { outcomes: [{ outcome: 'REFUNDED', label: 'Refunded to the member' }] }
    expect(outcomeLabel('REFUNDED', vocabulary)).toBe('Refunded to the member')
    expect(outcomeLabel('NO_LONGER_APPLIES')).toBe('No longer found when compared again')
    expect(outcomeLabel('SUPERSEDED')).toBe('The file was replaced')
    expect(outcomeLabel('DEDUCTION_STOPPED')).toBe('Deduction stopped')
  })

  it('a matched line\'s amount, with its months or the month that has no rate', () => {
    expect(amountStatusLabel({ amountStatus: 'MATCHES' })).toBe('As expected')
    expect(amountStatusLabel({ amountStatus: 'CATCH_UP', months: 2 })).toBe('Catch-up of 2 months')
    expect(amountStatusLabel({ amountStatus: 'RATE_UNKNOWN', months: 2, rateUnknownFor: '2025-12' }))
      .toBe('No subscription on record for December 2025')
    expect(amountStatusLabel(null)).toBe('—')
  })

  it('the months offered: this one and the twelve before it, newest first', () => {
    const months = recentMonths({ y: 2026, m: 10, d: 7 })
    expect(months).toHaveLength(13)
    expect(months[0]).toEqual({ value: '2026-10', label: 'October 2026' })
    expect(months.at(-1).value).toBe('2025-10')
  })
})
