import { http, HttpResponse } from 'msw'

import committed from '../api-vocabulary.json'

/**
 * THE PAYROLL API'S ANSWERS, IN ITS CONTRACT'S SHAPES -- `C:/tmp/sasbo-work/oct/contracts/payroll-api.md`, draft 2.
 *
 * Every person here is invented (Testerson, Invented, Example...), every ID number arrives masked to its last four as
 * the server sends it, and every amount is a decimal string. The discrepancy types, their labels, rules, query actions
 * and outcomes are read from the committed vocabulary artifact itself, so the fixtures cannot name a type the server
 * does not publish; `payrollRules.test.js` holds every handler below to the committed surface.
 *
 * One file is told in full: Absa, September 2026 -- 34 lines, 32 matched, one discrepancy of every kind, and payments
 * short of the lines' total by Absa's 3% fee alone, which the payment check expects (PAY-27, PAY-28).
 */

const ABSA = { id: 1, code: 'ABSA', name: 'Absa' }
const NEDBANK = { id: 2, code: 'NEDBANK', name: 'Nedbank' }
const GBS = { id: 7, code: 'GBS', name: 'GBS' }

/** What to do about each type -- the contract's sentences, as the server writes `whatToDo`. */
export const WHAT_TO_DO = {
  NOT_A_MEMBER: 'On the file but not a member: query it with the employer.',
  MEMBERSHIP_ENDED: 'Membership has ended but the member is still deducted: ask the employer to stop, without a refund.',
  MISSING_FROM_FILE: 'A payroll member is missing from the file: query the unpaid with the employer. Members are usually '
    + 'suspended while it is followed up (PAY-20), and deleted after three months without a deduction (PAY-15).',
  AMOUNT_DIFFERS: 'The amount differs from the subscription: ask the employer to correct it, and record the difference as '
    + 'arrears or a credit.',
  DEDUCTED_TWICE: 'Deducted twice in the same month, with no missed month on record: refund the member directly.',
  POSSIBLE_CATCH_UP: 'Listed twice, and the member has missed months on record: confirm it is the employer catching up, not '
    + 'a double deduction.',
  EMPLOYEE_NUMBER_DIFFERS: 'A different employee number from the one on record: check with the member, then update the '
    + 'record (PAY-17).',
  NAME_DIFFERS: 'The name does not match the ID number or the employee number on record: check with the member (PAY-17).',
  DETAILS_DIFFER: 'Other details on the file differ from the record (the ID number, or the employer on record): check with '
    + 'the member, then update the record.',
  DEBIT_ORDER_MEMBER: 'A member who pays by debit order is on the payroll file: query it with the member, then switch them '
    + 'to payroll and stop the debit order if they agree.',
  UNREADABLE_ROW: 'A line of the file could not be read (the reason is given): check it with the employer.',
  FILE_TOTAL_DIFFERS: 'The total printed on the file is not the sum of its lines: ask the employer.',
  PAYMENT_DIFFERS: 'The money paid in differs from the file\'s total less the employer\'s fee: follow it up with the employer.',
}

const OUTCOME_LABELS = {
  JOINED_AND_CAPTURED: 'Joined, and captured as a member',
  DEDUCTION_STOPPED: 'The employer stopped the deduction',
  MEMBER_REINSTATED: 'The member was reinstated',
  DEDUCTION_RESTARTED: 'The employer restarted the deduction',
  MEMBER_SUSPENDED: 'The member was suspended',
  MEMBER_LEFT_EMPLOYER: 'The member left the employer',
  ON_LEAVE: 'The member is on leave',
  MEMBER_DELETED: 'The member was deleted',
  CORRECTED_BY_EMPLOYER: 'The employer corrected it',
  ARREARS_RECORDED: 'Recorded as arrears',
  CREDIT_RECORDED: 'Recorded as a credit',
  REFUNDED: 'Refunded to the member',
  CATCH_UP_CONFIRMED: 'Confirmed as a catch-up',
  RECORD_UPDATED: 'SASBO’s record was updated',
  EMPLOYER_ASKED_TO_CORRECT: 'The employer was asked to correct it',
  SAME_PERSON_CONFIRMED: 'Confirmed as the same person',
  NOT_THE_SAME_PERSON: 'Not the same person',
  SWITCHED_TO_PAYROLL: 'Switched to payroll',
  STAYS_ON_DEBIT_ORDER: 'Stays on debit order',
  IGNORED: 'Ignored',
  CORRECTED_FILE_RECEIVED: 'A corrected file was received',
  EXPLAINED: 'Explained',
  BALANCE_RECEIVED: 'The balance was received',
  OTHER: 'Other',
  NO_LONGER_APPLIES: 'No longer found when compared again',
  SUPERSEDED: 'The file was replaced',
}

const published = committed.payroll

/** Route 1, `PayrollVocabularyDto`. */
export const VOCABULARY = {
  discrepancyTypes: published.discrepancyTypes.map((entry) => ({ ...entry, whatToDo: WHAT_TO_DO[entry.type] })),
  outcomes: Object.entries(OUTCOME_LABELS).map(([outcome, label]) => ({ outcome, label })),
  statuses: published.statuses,
  matchRules: published.matchRules,
  confidences: published.confidences,
  amountStatuses: published.amountStatuses,
  limits: { maxBytes: 10485760, maxRows: 20000, maxTypedRows: 5000, noteMaxLength: 1000, pageMaxSize: 100 },
  accepted: ['xlsx', 'xls', 'csv'],
}

const typeOf = (type) => published.discrepancyTypes.find((entry) => entry.type === type)

/** Route 2, `PayrollEmployerDto[]`. GBS sends a PDF: its lines are typed in (`readable: false`). */
export const EMPLOYERS = [
  {
    ...ABSA, delivery: 'EMAIL', readable: true, layoutKey: 'absa', adminFeePercent: '3.00', columnMapping: null,
    sasboEmployers: ['ABSA BANK'], latestFile: { id: 12, period: '2026-09', status: 'RECONCILED', openDiscrepancies: 9 }, version: 0,
  },
  {
    ...NEDBANK, delivery: 'EMAIL', readable: true, layoutKey: 'nedbank', adminFeePercent: '0.00', columnMapping: null,
    sasboEmployers: ['NEDBANK'], latestFile: { id: 13, period: '2026-09', status: 'RECONCILED', openDiscrepancies: 0 }, version: 0,
  },
  {
    ...GBS, delivery: 'EMAIL', readable: false, layoutKey: null, adminFeePercent: '0.00', columnMapping: null,
    sasboEmployers: ['GBS MUTUAL BANK'], latestFile: null, version: 0,
  },
]

const fileItem = (fields) => ({
  originalName: null, entry: 'UPLOAD', format: 'XLSX', sizeBytes: 18234, sha256: 'a'.repeat(64), status: 'RECONCILED',
  uploadedBy: 'system', uploadedAt: '2026-09-28T08:15:00Z', retainUntil: '2027-09-28', lastRunAt: '2026-09-28T08:15:02Z',
  version: 1, ...fields,
})

/** Route 4's list items (`PayrollFileDto`). */
export const FILES = [
  fileItem({
    id: 12, employer: ABSA, period: '2026-09', originalName: 'Absa payroll September 2026.xlsx',
    rows: 34, matched: 32, discrepancies: 13, openDiscrepancies: 9, fileTotal: '5916.00', paymentStatus: 'EXACT',
  }),
  fileItem({
    id: 13, employer: NEDBANK, period: '2026-09', originalName: 'Nedbank September 2026.xlsx',
    rows: 21, matched: 20, discrepancies: 2, openDiscrepancies: 0, fileTotal: '3654.00', paymentStatus: 'NOT_RECORDED',
  }),
  fileItem({
    id: 14, employer: GBS, period: '2026-09', entry: 'TYPED', format: null, sizeBytes: null, sha256: null,
    rows: 7, matched: 7, discrepancies: 0, openDiscrepancies: 0, fileTotal: '1218.00', paymentStatus: 'SHORT',
  }),
  fileItem({
    id: 9, employer: ABSA, period: '2026-08', status: 'SUPERSEDED', originalName: 'Absa payroll August 2026.xlsx',
    rows: 33, matched: 31, discrepancies: 4, openDiscrepancies: 0, fileTotal: '5742.00', paymentStatus: 'EXACT',
  }),
]

/** A page as the server answers one (`PayrollPage<T>`). */
export const pageOf = (content, { page = 0, size = 20, totalElements = content.length } = {}) => ({
  content, page, size, totalElements, totalPages: Math.ceil(totalElements / size),
})

const zeroes = () => published.discrepancyTypes.map(({ type }) => ({ type, open: 0, queried: 0, resolved: 0 }))

/** Route 7 for file 12 -- `PayrollFileSummaryDto`. */
export const ABSA_SEPTEMBER = {
  ...FILES[0],
  alreadyLoaded: false,
  layout: {
    key: 'absa', sheet: 'Sheet1', headingRow: 4,
    headings: { staffNumber: 'EMP NO', idNumber: 'ID NUMBER', initials: 'INITIALS', surname: 'SURNAME', fullName: null, amount: 'AMOUNT' },
    columns: ['EMP NO', 'ID NUMBER', 'INITIALS', 'SURNAME', 'AMOUNT', 'BRANCH'],
  },
  counts: {
    rowsRead: 34, rowsUnreadable: 1, matched: 32, matchedByStaffNumber: 28, matchedByIdNumber: 3, matchedByName: 1,
    notMembers: 1, missingMembers: 1, catchUps: 1, listedTwice: 2,
  },
  // One of every kind, as the list below holds them: 7 open, 2 queried, 4 resolved.
  discrepanciesByType: zeroes().map((entry) => ({
    ...entry,
    ...{
      NOT_A_MEMBER: { queried: 1 }, MEMBERSHIP_ENDED: { open: 1 }, MISSING_FROM_FILE: { queried: 1 }, AMOUNT_DIFFERS: { open: 1 },
      DEDUCTED_TWICE: { open: 1 }, POSSIBLE_CATCH_UP: { open: 1 }, EMPLOYEE_NUMBER_DIFFERS: { resolved: 1 }, NAME_DIFFERS: { open: 1 },
      DETAILS_DIFFER: { resolved: 1 }, DEBIT_ORDER_MEMBER: { open: 1 }, UNREADABLE_ROW: { open: 1 },
      FILE_TOTAL_DIFFERS: { resolved: 1 }, PAYMENT_DIFFERS: { resolved: 1 },
    }[entry.type],
  })),
  // Absa keeps 3% (PAY-27): R5,916.00 less R177.48 is the R5,738.52 it is expected to pay, and paid in two parts.
  totals: {
    fileTotal: '5916.00', statedTotal: '5916.00', statedTotalAgrees: true,
    subscription: { amount: '174.00', effectiveFrom: '2026-01-01' },
    expectedTotal: '5568.00',
    adminFeePercent: '3.00', adminFee: '177.48', expectedPayment: '5738.52',
    received: '5738.52', paymentDifference: '0.00', paymentStatus: 'EXACT',
  },
  payments: [
    {
      id: 3, employer: ABSA, period: '2026-09', amount: '5564.52', receivedOn: '2026-09-29', reference: 'EFT 0923',
      recordedBy: 'system', recordedAt: '2026-09-29T15:00:00Z',
    },
    {
      id: 4, employer: ABSA, period: '2026-09', amount: '174.00', receivedOn: '2026-10-01', reference: 'EFT 1001',
      recordedBy: 'system', recordedAt: '2026-10-01T07:30:00Z',
    },
  ],
  queries: [{ id: 2, raisedAt: '2026-09-29T09:00:00Z', raisedBy: 'system', add: 2, delete: 3, correct: 2 }],
  runs: 1,
  lastRunBy: 'system',
}

const member = (id, number, name, status = 'Active', paymentType = 'Payroll Deduction') =>
  ({ id, membershipNumber: number, name, status, paymentType })

const row = (rowNumber, staffNumber, idNumber, initials, surname, amount) =>
  ({ rowNumber, staffNumber, idNumber, initials, surname, amount })

/** One discrepancy of each kind on file 12, as the lists answer them (route 9). */
const discrepancy = (id, type, fields) => ({
  id, fileId: 12, employer: ABSA, period: '2026-09', type, rule: typeOf(type).rule, whatToDo: WHAT_TO_DO[type],
  status: 'OPEN', detail: '', member: null, row: null, amountOnFile: null, expectedAmount: null, difference: null,
  months: null, queryAction: typeOf(type).queryAction, query: null, outcomes: typeOf(type).outcomes, resolution: null,
  noteCount: 0, lastNote: null, createdAt: '2026-09-28T08:15:02Z', version: 0, ...fields,
})

export const DISCREPANCIES = [
  discrepancy(70, 'NOT_A_MEMBER', {
    detail: 'Z. Invented, staff number EMP-77001, is deducted R174.00 but is not a member.',
    row: row(12, 'EMP-77001', '****4410', 'Z', 'Invented', '174.00'), amountOnFile: '174.00', status: 'QUERIED',
    query: { id: 2, raisedAt: '2026-09-29T09:00:00Z' },
  }),
  discrepancy(71, 'MEMBERSHIP_ENDED', {
    detail: 'A.B. Example resigned on 31 August 2026 and is still deducted R174.00.',
    member: member(201, 'M-095101', 'A.B. Example', 'Resigned'), row: row(14, 'EMP-40019', '****2207', 'AB', 'Example', '174.00'),
    amountOnFile: '174.00',
  }),
  discrepancy(72, 'MISSING_FROM_FILE', {
    detail: 'C. Sample, who pays through Absa’s payroll, is not on the file: 1 month missing.',
    member: member(202, 'M-095102', 'C. Sample'), expectedAmount: '174.00', months: 1, status: 'QUERIED',
    query: { id: 2, raisedAt: '2026-09-29T09:00:00Z' },
  }),
  discrepancy(77, 'AMOUNT_DIFFERS', {
    detail: 'R150.00 deducted; R174.00 expected: R24.00 short.',
    member: member(123, 'M-095012', 'B.K. Testerson'), row: row(9, 'EMP-40231', '****5081', 'BK', 'Testerson', '150.00'),
    amountOnFile: '150.00', expectedAmount: '174.00', difference: '-24.00', noteCount: 1,
    lastNote: { id: 5, text: 'Asked the employer by e-mail.', by: 'system', at: '2026-09-29T10:00:00Z' }, version: 2,
  }),
  discrepancy(73, 'DEDUCTED_TWICE', {
    detail: 'D. Placeholder is deducted twice: R348.00 against R174.00 expected, with no missed month on record.',
    member: member(203, 'M-095103', 'D. Placeholder'), row: row(16, 'EMP-40102', '****9930', 'D', 'Placeholder', '174.00'),
    amountOnFile: '348.00', expectedAmount: '174.00', difference: '174.00',
  }),
  discrepancy(74, 'POSSIBLE_CATCH_UP', {
    detail: 'E. Fictional is listed twice, and owes 2 months: likely the employer catching up.',
    member: member(204, 'M-095104', 'E. Fictional'), row: row(18, 'EMP-40150', '****1188', 'E', 'Fictional', '174.00'),
    amountOnFile: '348.00', expectedAmount: '348.00', difference: '0.00', months: 2,
  }),
  discrepancy(75, 'EMPLOYEE_NUMBER_DIFFERS', {
    detail: 'Staff number EMP-40300 on the file; EMP-40030 on record.',
    member: member(205, 'M-095105', 'F. Madeup'), row: row(20, 'EMP-40300', '****7702', 'F', 'Madeup', '174.00'),
    status: 'RESOLVED', resolution: { outcome: 'RECORD_UPDATED', by: 'system', at: '2026-09-30T08:00:00Z' },
  }),
  discrepancy(76, 'NAME_DIFFERS', {
    detail: 'The file says G. Notreal; the record for this ID number says G. Unreal.',
    member: member(206, 'M-095106', 'G. Unreal'), row: row(22, 'EMP-40333', '****6619', 'G', 'Notreal', '174.00'),
  }),
  discrepancy(78, 'DETAILS_DIFFER', {
    detail: 'The ID number on the file differs from the record’s.',
    member: member(207, 'M-095107', 'H. Imagined'), row: row(24, 'EMP-40410', '****3301', 'H', 'Imagined', '174.00'),
    status: 'RESOLVED', resolution: { outcome: 'RECORD_UPDATED', by: 'system', at: '2026-09-30T08:05:00Z' },
  }),
  discrepancy(79, 'DEBIT_ORDER_MEMBER', {
    detail: 'J. Hypothetical pays by debit order and is deducted R174.00 on this file.',
    member: member(208, 'M-095108', 'J. Hypothetical', 'Active', 'Debit Order'), row: row(26, 'EMP-40455', '****8842', 'J', 'Hypothetical', '174.00'),
    amountOnFile: '174.00',
  }),
  discrepancy(80, 'UNREADABLE_ROW', {
    detail: 'Row 31 could not be read: the amount is not a number.',
    row: row(31, 'EMP-40999', null, 'K', 'Pretend', null),
  }),
  discrepancy(81, 'FILE_TOTAL_DIFFERS', {
    detail: 'The file prints R6,090.00; its lines add up to R5,916.00.', status: 'RESOLVED',
    resolution: { outcome: 'EXPLAINED', by: 'system', at: '2026-09-29T12:00:00Z' },
  }),
  discrepancy(82, 'PAYMENT_DIFFERS', {
    detail: 'R5,564.52 received on 29 September; R5,738.52 expected after Absa’s 3% fee: R174.00 short.', status: 'RESOLVED',
    resolution: { outcome: 'BALANCE_RECEIVED', by: 'system', at: '2026-10-01T07:30:00Z' },
  }),
]

/** Route 18 for discrepancy 77: the list's row, with every note. */
export const AMOUNT_DIFFERS_77 = {
  ...DISCREPANCIES.find((entry) => entry.id === 77),
  notes: [{ id: 5, text: 'Asked the employer by e-mail.', by: 'system', at: '2026-09-29T10:00:00Z' }],
}

const line = (id, rowNumber, staffNumber, idNumber, initials, surname, amount, match, extra = {}) =>
  ({ id, rowNumber, staffNumber, idNumber, initials, surname, amount, valid: true, problem: null, match, ...extra })

const matched = (memberId, number, name, rule, fields = {}) => ({
  memberId, membershipNumber: number, memberName: name, rule, confidence: 'HIGH', reason: 'Staff number and ID number agree',
  expectedAmount: '174.00', amountStatus: 'MATCHES', months: 1, rateUnknownFor: null, ...fields,
})

/** Route 8's lines of file 12: a match by each rule, a catch-up, a rate unknown, no match, a blank ID, unreadable. */
export const LINES = [
  line(501, 5, 'EMP-40001', '****1001', 'L', 'Testerson', '174.00', matched(301, 'M-095201', 'L. Testerson', 'STAFF_NUMBER')),
  line(502, 6, 'EMP-40002', '****1002', 'M', 'Invented', '174.00', matched(302, 'M-095202', 'M. Invented', 'ID_NUMBER', { reason: 'ID number agrees; no staff number on record' })),
  line(503, 7, 'EMP-40003', null, 'NO', 'Example', '348.00', matched(303, 'M-095203', 'N.O. Example', 'NAME', { confidence: 'MEDIUM', reason: 'Initials and surname: the only member who fits', amountStatus: 'CATCH_UP', months: 2 })),
  line(504, 8, 'EMP-40004', '****1004', 'P', 'Sample', '348.00', matched(304, 'M-095204', 'P. Sample', 'STAFF_NUMBER', { amountStatus: 'RATE_UNKNOWN', months: 2, rateUnknownFor: '2025-12' })),
  line(505, 9, 'EMP-40231', '****5081', 'BK', 'Testerson', '150.00', matched(123, 'M-095012', 'B.K. Testerson', 'STAFF_NUMBER', { amountStatus: 'DIFFERS' })),
  line(506, 12, 'EMP-77001', '****4410', 'Z', 'Invented', '174.00', null),
  line(507, 31, 'EMP-40999', null, 'K', 'Pretend', null, null, { valid: false, problem: 'The amount is not a number.' }),
]

/** Route 14 for file 12 (`PayrollQueryDto[]`). */
export const QUERIES = [{
  id: 2, fileId: 12, employer: ABSA, period: '2026-09', raisedBy: 'system', raisedAt: '2026-09-29T09:00:00Z',
  counts: { add: 1, delete: 1, correct: 1 },
  lines: [
    {
      action: 'ADD', discrepancyId: 72, type: 'MISSING_FROM_FILE', staffNumber: 'EMP-40020', idNumber: '****3320',
      name: 'C. Sample', membershipNumber: 'M-095102', amountOnFile: null, expectedAmount: '174.00',
      reason: 'A member of SASBO who is not deducted: please start deducting R174.00.',
    },
    {
      action: 'DELETE', discrepancyId: 70, type: 'NOT_A_MEMBER', staffNumber: 'EMP-77001', idNumber: '****4410',
      name: 'Z. Invented', membershipNumber: null, amountOnFile: '174.00', expectedAmount: null,
      reason: 'Not a member of SASBO: please stop this deduction.',
    },
    {
      action: 'CORRECT', discrepancyId: 77, type: 'AMOUNT_DIFFERS', staffNumber: 'EMP-40231', idNumber: '****5081',
      name: 'B.K. Testerson', membershipNumber: 'M-095012', amountOnFile: '150.00', expectedAmount: '174.00',
      reason: 'Deducted R150.00: please deduct R174.00.',
    },
  ],
}]

/** A refusal in the application's envelope (`{timestamp, status, error, message, path, code, details}`). */
export const refusal = (status, code, message, details = {}) => HttpResponse.json({
  timestamp: '2026-10-07T08:00:00.000+00:00', status, error: 'Refused', message, path: '/api/payroll', code, details,
}, { status })

/**
 * Every read the screens make, answered from the fixtures above. Pass `overrides` to replace one, keyed by
 * `'METHOD path'` exactly as written here -- a test that needs a failure says so.
 */
export function payrollHandlers(overrides = {}) {
  const answer = (key, resolver) => overrides[key] ?? resolver
  const routes = {
    'GET */api/payroll/vocabulary': () => HttpResponse.json(VOCABULARY),
    'GET */api/payroll/employers': () => HttpResponse.json(EMPLOYERS),
    'GET */api/payroll/files': () => HttpResponse.json(pageOf(FILES)),
    'GET */api/payroll/files/:id': ({ params }) => (String(params.id) === '12'
      ? HttpResponse.json(ABSA_SEPTEMBER)
      : refusal(404, 'FILE_NOT_FOUND', 'There is no payroll file with that number.')),
    'GET */api/payroll/files/:id/rows': () => HttpResponse.json(pageOf(LINES)),
    'GET */api/payroll/files/:id/discrepancies': () => HttpResponse.json(pageOf(DISCREPANCIES)),
    'GET */api/payroll/files/:id/queries': () => HttpResponse.json(QUERIES),
    'GET */api/payroll/discrepancies/:id': () => HttpResponse.json(AMOUNT_DIFFERS_77),
  }
  return Object.entries(routes).map(([key, resolver]) => {
    const [method, path] = key.split(' ')
    return http[method.toLowerCase()](path, answer(key, resolver))
  })
}

/**
 * A multipart body's fields, read from its text -- `{ name: value }`, a file by its contents.
 *
 * ⚠️ NOT `request.formData()`: under jsdom, Node's multipart parser refuses jsdom's `File` (an assertion inside undici,
 * measured 7 Oct), and the handler's throw reaches the page as a 500 -- which the page rightly reads as "could not be
 * confirmed". jsdom's `File` also reaches the wire nameless (`filename="blob"`), so a test asserts what was sent by its
 * contents. A browser sends the name; this environment cannot.
 */
export const multipartFields = async (request) => {
  const boundary = /boundary=([^;]+)/.exec(request.headers.get('content-type') ?? '')?.[1]
  const text = await request.text()
  const fields = {}
  for (const part of boundary ? text.split(`--${boundary}`) : []) {
    const match = /Content-Disposition: form-data; name="([^"]+)"[^\r\n]*\r\n(?:Content-Type: [^\r\n]*\r\n)?\r\n([\s\S]*?)\r\n$/.exec(part)
    if (match) fields[match[1]] = match[2]
  }
  return fields
}

/** The file chooser's kinds of file, built in the test -- never a real employer's file. */
export const csvFile = (name = 'Invented payroll September 2026.csv', text = 'EMP NO,SURNAME,AMOUNT\nEMP-1,Testerson,174.00\n') =>
  new File([text], name, { type: 'text/csv' })
