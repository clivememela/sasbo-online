import { http, HttpResponse } from 'msw'

/**
 * Debit Order Deductions as `contracts/dod-api.md` (v1, 2026-10-07) describes it -- every `/api/acb` route, answered
 * with the contract's shapes and INVENTED people only (obviously invented names, `SYN-` membership numbers, an account's
 * last four digits and nothing more). The bank codes and SASBO's suspension codes are SASBO's reference data, from
 * Stephne's "Suspension codes" sheet, as the server seeds them.
 *
 * Opted into, like every shared handler of this suite: `server.use(...dodHandlers())`, then a test's own handlers,
 * which take precedence. The answers keep a little state per call -- an approved run reads back approved -- so a test
 * can walk the run's steps in order. `dodApi.test.js` holds `DOD_ROUTES` to the committed API surface, route for route.
 */

export const pageOf = (content, size = 50) => ({
  content, page: 0, size, totalElements: content.length, totalPages: content.length ? 1 : 0,
})

/** The application's refusal envelope, exactly as the server writes it. */
export const refusal = (status, code, message, details = {}) => HttpResponse.json({
  timestamp: '2026-10-07T08:00:00.000+00:00', status, error: 'Refused', code, message, path: '/api/acb', details,
}, { status })

/** A caller nobody has signed in as, on a guarded route (dod-api §1). */
export const signInRefusal = (permission) => refusal(403, 'IDENTITY_REQUIRED',
  'Sign in to do this: it needs a permission nobody signed out holds.', { permission })

/** A signed-in caller without the permission -- the sign-in contract's answer. */
export const permissionRefusal = (permission) => HttpResponse.json({
  code: 'PERMISSION_REQUIRED', message: 'You do not have permission to do this.', permission,
}, { status: 403 })

export const ADMIN = 'Demo Head Office (demo.headoffice)'
export const CFO = 'Demo Finance (demo.cfo)'

export const runOf = (overrides = {}) => ({
  id: 41, actionMonth: '2026-10', status: 'PREPARED', version: 1, setupDate: '2026-10-07', creationDate: null,
  purgeDate: '2026-11-09', firstDueDate: '2026-10-20', lastDueDate: '2026-10-30', makeBy: '2026-10-17',
  makeByPassed: false, lineCount: 30, totalAmount: 5220, totalsAgree: true, calendarAgrees: true, rateAmount: 174,
  rateEffectiveFrom: '2026-01-01', holidaySet: 'za-statutory', holidaysKnown: true, createdBy: ADMIN, approvedBy: null,
  startedAt: '2026-10-07T08:00:00Z', heartbeatAt: '2026-10-07T08:00:05Z', failureReason: null, declinedReason: null,
  declinedWords: null, replacesRunId: null, exclusions: [], fileDownloads: 0, lastDownloadedBy: null,
  lastDownloadedAt: null, fileSha256: null, ...overrides,
})

export const summaryOf = (run) => ({
  id: run.id, actionMonth: run.actionMonth, status: run.status, version: run.version, setupDate: run.setupDate,
  lineCount: run.lineCount, totalAmount: run.totalAmount, totalsAgree: run.totalsAgree,
  calendarAgrees: run.calendarAgrees, holidaysKnown: run.holidaysKnown, failureReason: run.failureReason,
  declinedReason: run.declinedReason,
})

export const lineOf = (overrides = {}) => ({
  id: 3, memberId: 7, membershipNumber: 'SYN-0007', surname: 'Testperson', initials: 'S', bankName: 'Synthetic Bank',
  branchCode: '632005', accountLastFour: '9911', accountType: 1, debitDay: 25, actionDate: '2026-10-26', amount: 174,
  outcome: 'PENDING', rePresentsLineId: null, fileSequence: 4, unpaidCode: null, unpaidReason: null, decision: null,
  suggestedDecision: null, permissionNote: null, letterStatus: null, reDebit: null, reDebitSource: null,
  suspensionCode: null, memberUnpaidCount: null, codeProvisional: false, ...overrides,
})

/** An unpaid as the unpaids list reads it: bank code 2, which may be re-debited (Stephne, DOD-03). */
export const unpaidOf = (overrides = {}) => lineOf({
  id: 2000, outcome: 'UNPAID', unpaidCode: '2', unpaidReason: 'NOT_PROVIDED_FOR', suggestedDecision: 'RE_PRESENT',
  letterStatus: 'RENDERED', reDebit: 'YES', reDebitSource: 'Stephne, DOD-03', suspensionCode: 18,
  memberUnpaidCount: 1, ...overrides,
})

/** Her sheet as the server seeds it (dod-api §7.1); provisional rows say why. */
export const BANK_CODES = [
  ['2', 'NOT_PROVIDED_FOR', 'Not provided for (insufficient funds)', 'YES', 'Stephne, DOD-03', 18, 'Insufficient funds', false, null],
  ['4', 'PAYMENT_STOPPED', 'Payment stopped', 'NO', 'Stephne, DOD-03', 16, 'Payment stopped', false, null],
  ['6', 'ACCOUNT_FROZEN', 'Account frozen (SASBO: debit returned)', 'UNKNOWN', null, 13, 'Debit returned', true, 'Re-debit not said (Friday item 9)'],
  ['15', 'ACCOUNT_CLOSED', 'Account closed', 'UNKNOWN', null, 15, 'Account closed', true, 'Re-debit not said (Friday item 9)'],
  ['18', 'ACCOUNT_HOLDER_DECEASED', 'Account holder deceased', 'UNKNOWN', null, null, null, true, 'Which SASBO code, and re-debit (Friday items 1 and 9)'],
  ['26', 'INVALID_ACCOUNT_NUMBER', 'Invalid account', 'UNKNOWN', null, 19, 'Invalid account', true, 'Re-debit not said (Friday item 9)'],
  ['30', 'NO_AUTHORITY_TO_DEBIT', 'No authority to debit', 'NO', 'Stephne, DOD-04', 30, 'No authority to debit', true, 'Which of SASBO\'s 30-33 to record (Friday item 3)'],
].map(([bankCode, reason, wording, reDebit, reDebitSource, suspensionCode, suspensionName, provisional, note]) => ({
  bankCode, reason, wording, reDebit, reDebitSource, suspensionCode, suspensionName, provisional, note,
  source: 'Suspension codes sheet, 6 Oct 2026', updatedBy: 'system', updatedAt: '2026-10-07T06:00:00Z', version: 1,
}))

export const SUSPENSION_CODES = [
  [11, 'Not paid on payroll', []], [12, 'Maternity leave', []], [13, 'Debit returned', ['6']],
  [15, 'Account closed', ['15']], [16, 'Payment stopped', ['4']], [18, 'Insufficient funds', ['2']],
  [19, 'Invalid account', ['26']], [21, 'Sick leave', []], [30, 'No authority to debit', ['30']],
  [31, 'No authority to debit', []], [32, 'No authority to debit', []], [33, 'No authority to debit', []],
].map(([code, name, bankCodes]) => ({ code, name, bankCodes }))

export const CODES = { bankCodes: BANK_CODES, suspensionCodes: SUSPENSION_CODES }

export const calendarOf = (overrides = {}) => ({
  name: 'za-statutory', knownUntil: '2028-12-31', endingSoon: false, year: 2026, bankClosuresCount: true,
  holidays: [
    { date: '2026-10-23', name: 'Invented bank closure', source: 'ADDED', kind: 'BANK_CLOSED' },
    { date: '2026-12-16', name: 'Day of Reconciliation', source: 'STATUTORY', kind: 'PUBLIC_HOLIDAY' },
    { date: '2026-12-25', name: 'Christmas Day', source: 'STATUTORY', kind: 'PUBLIC_HOLIDAY' },
    { date: '2026-12-26', name: 'Day of Goodwill', source: 'STATUTORY', kind: 'PUBLIC_HOLIDAY' },
  ],
  ...overrides,
})

export const RATES = {
  rates: [
    { effectiveFrom: '2025-01-01', amount: 166.65, source: 'The subscription-increase letter of 26 Nov 2025', provisional: true },
    { effectiveFrom: '2026-01-01', amount: 174, source: 'The subscription-increase letter of 26 Nov 2025', provisional: false },
  ],
  januaryNotice: null,
}

export const BANKS = [
  { bankId: 3, name: 'Synthetic Bank', defaultDay: 25, debitOrderMembers: 45, byDay: { 20: 12, 25: 33 } },
  { bankId: 5, name: 'Second Synthetic Bank', defaultDay: 20, debitOrderMembers: 8, byDay: { 20: 8 } },
]

export const moveOf = (overrides = {}) => ({
  bankId: 3, bankName: 'Synthetic Bank', newDay: 27, toMove: 45, alreadyOnDay: 0, byCurrentDay: { 20: 12, 25: 33 },
  liveRuns: [{ runId: 41, actionMonth: '2026-10', status: 'PREPARED' }], ...overrides,
})

export const DEBIT_DAYS = [
  { actionDate: '2026-10-20', lines: 12, unpaid: 2, batches: 1 },
  { actionDate: '2026-10-26', lines: 18, unpaid: 0, batches: 0 },
]

export const batchOf = (overrides = {}) => ({
  id: 7, runId: 40, actionDate: '2026-10-26', reportDate: '2026-10-27', source: 'MANUAL', entries: 1, recorded: 1,
  alreadyRecorded: 0, lettersQueued: 1, recordedBy: ADMIN, recordedAt: '2026-10-27T08:15:00Z', ...overrides,
})

export const COUNTS = [{
  memberId: 7, membershipNumber: 'SYN-0007', surname: 'Testperson', unpaidCount: 2, countedOn: '2026-10-07',
  source: 'Legacy re-debit list, October 2026', enteredBy: ADMIN, enteredAt: '2026-10-07T07:30:00Z',
}]

export const OPENING_POSITION = { members: 0, enteredBy: null, enteredAt: null, locked: false, lockedSince: null, disagreements: [] }

export const candidateOf = (overrides = {}) => ({
  memberId: 7, membershipNumber: 'SYN-0007', surname: 'Testperson', unpaidCount: 3, terminate: true, twelveMonthTotal: 3,
  unpaidMonths: ['2026-08', '2026-09', '2026-10'], openingUnpaids: 0, status: 'Active', thirdUnpaidOn: '2026-10-26',
  ...overrides,
})

export const TERMINATION = {
  countingFrom: '2025-10', blindness: null, members: pageOf([candidateOf(), candidateOf({ memberId: 8, membershipNumber: 'SYN-0008', surname: 'Inventedson', unpaidCount: 2, terminate: false, thirdUnpaidOn: null })]),
}

const PDF = '%PDF-1.4\n% invented specimen\n'
const json = (body, status = 200) => HttpResponse.json(body, { status })

/**
 * Every DOD route, `METHOD path` exactly as the API surface writes it, with its answer. `state` is the call's own.
 */
export const dodRoutes = (state) => ({
  'POST /api/acb/calendar/known-until': async ({ request }) => json(calendarOf({ knownUntil: (await request.json()).knownUntil })),
  'PUT /api/acb/calendar/settings': async ({ request }) => json(calendarOf({ bankClosuresCount: (await request.json()).bankClosuresCount })),
  'GET /api/acb/banks': () => json(BANKS),
  'GET /api/acb/banks/{bankId}/debit-day-move': ({ request }) => json(moveOf({ newDay: Number(new URL(request.url).searchParams.get('day')) })),
  'POST /api/acb/banks/{bankId}/debit-day-move': async ({ request }) => {
    const { newDay } = await request.json()
    return json(moveOf({ newDay, moved: 45 }))
  },
  'GET /api/acb/codes': () => json(CODES),
  'POST /api/acb/codes': async ({ request }) => {
    const body = await request.json()
    return json({ ...BANK_CODES[0], ...body, reason: 'OTHER', reDebitSource: null, suspensionName: null, provisional: true, version: 1 }, 201)
  },
  'PUT /api/acb/codes/{bankCode}': async ({ params, request }) => {
    const body = await request.json()
    const code = BANK_CODES.find((c) => c.bankCode === params.bankCode) ?? BANK_CODES[0]
    return json({ ...code, ...body, version: code.version + 1, updatedBy: ADMIN })
  },
  'GET /api/acb/holidays': ({ request }) => json(calendarOf({ year: Number(new URL(request.url).searchParams.get('year') ?? 2026) })),
  'POST /api/acb/holidays': async ({ request }) => json({ ...(await request.json()), source: 'ADDED' }),
  'DELETE /api/acb/holidays/{date}': ({ params }) => json(calendarOf({ holidays: calendarOf().holidays.filter((d) => d.date !== params.date) })),
  'GET /api/acb/letters/specimen/{template}': () => new HttpResponse(PDF, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="specimen-re_debit.pdf"' },
  }),
  'POST /api/acb/members/search': () => json(pageOf([], 25)),
  'POST /api/acb/members/{memberId}/reactivate': ({ params }) => json({ memberId: Number(params.memberId), membershipNumber: 'SYN-0007', status: 'Active', reason: 'REINSTATED', withdrawnReDebits: 0 }),
  'POST /api/acb/members/{memberId}/rejoin': ({ params }) => json({ memberId: Number(params.memberId), membershipNumber: 'SYN-0007', status: 'Active', reason: 'CAPTURED', joinedOn: '2026-10-07', withdrawnReDebits: 0 }),
  'GET /api/acb/opening-position': () => json(OPENING_POSITION),
  'POST /api/acb/opening-position': () => json({ ...OPENING_POSITION, members: 30, enteredBy: ADMIN, enteredAt: '2026-10-07T09:00:00Z' }),
  'GET /api/acb/rates': () => json(RATES),
  'POST /api/acb/rates': async ({ request }) => {
    const body = await request.json()
    return json({ ...RATES, rates: [...RATES.rates, { ...body, provisional: false }] })
  },
  'GET /api/acb/runs': () => json(pageOf([summaryOf(state.run)], 12)),
  'POST /api/acb/runs': async ({ request }) => json(runOf({ id: 42, actionMonth: (await request.json()).actionMonth, status: 'PREPARING', lineCount: 0, totalAmount: 0 }), 202),
  'GET /api/acb/runs/{id}': () => json(state.run),
  'POST /api/acb/runs/{id}/approve': () => step(state, 'APPROVED', { approvedBy: ADMIN }),
  'POST /api/acb/runs/{id}/cancel': () => step(state, 'CANCELLED'),
  'POST /api/acb/runs/{id}/close': () => step(state, 'CLOSED'),
  'GET /api/acb/runs/{id}/debit-days': () => json(DEBIT_DAYS),
  'POST /api/acb/runs/{id}/declined': async ({ request }) => {
    const { reason, bankWords } = await request.json()
    return step(state, 'DECLINED', { declinedReason: reason, declinedWords: bankWords ?? null })
  },
  'GET /api/acb/runs/{id}/exclusions': () => json(pageOf([])),
  'GET /api/acb/runs/{id}/file': () => {
    state.run = { ...state.run, fileDownloads: state.run.fileDownloads + 1, lastDownloadedBy: CFO, lastDownloadedAt: '2026-10-16T07:00:00Z' }
    return new HttpResponse('invented bank file\n', {
      headers: {
        'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="sasbosub.oct"',
        'X-File-Sha256': 'invented', 'X-File-Downloads': String(state.run.fileDownloads),
      },
    })
  },
  'GET /api/acb/runs/{id}/held-over': () => json(pageOf([])),
  'GET /api/acb/runs/{id}/letters/held': () => json(pageOf([])),
  'POST /api/acb/runs/{id}/letters/{letterId}/handled': async ({ params, request }) => json({ letterId: Number(params.letterId), lineId: 3, memberId: 7, membershipNumber: 'SYN-0007', surname: 'Testperson', template: 'RE_DEBIT', status: 'HANDLED', reason: (await request.json()).note, canSend: false }),
  'POST /api/acb/runs/{id}/letters/{letterId}/send': ({ params }) => json({ letterId: Number(params.letterId), lineId: 3, memberId: 7, membershipNumber: 'SYN-0007', surname: 'Testperson', template: 'RE_DEBIT', status: 'SENT', reason: null, canSend: false }),
  'GET /api/acb/runs/{id}/lines': () => json(pageOf([lineOf()])),
  'POST /api/acb/runs/{id}/lines/{lineId}/decision': async ({ params, request }) => json(unpaidOf({ id: Number(params.lineId), decision: (await request.json()).decision })),
  'POST /api/acb/runs/{id}/lines/{lineId}/permission': async ({ params, request }) => json(unpaidOf({ id: Number(params.lineId), decision: 'RE_PRESENT', permissionNote: (await request.json()).note })),
  'POST /api/acb/runs/{id}/lines/{lineId}/suspend-member': async ({ request }) => {
    const { suspensionCode } = await request.json()
    return json({ memberId: 7, membershipNumber: 'SYN-0007', status: 'Suspended', reason: 'UNPAID_SUSPENDED', suspensionCode: suspensionCode ?? 18 })
  },
  'POST /api/acb/runs/{id}/lines/{lineId}/unpaid': async ({ params, request }) => {
    const { code, decision } = await request.json()
    return json(unpaidOf({ id: Number(params.lineId), unpaidCode: code, decision: decision ?? null }))
  },
  'POST /api/acb/runs/{id}/returned': () => step(state, 'RETURNED'),
  'GET /api/acb/runs/{id}/returns': () => json({ runId: state.run.id, linesByOutcome: { PAID: 28, UNPAID: 2 }, unpaidByReason: { NOT_PROVIDED_FOR: 2 }, undecided: 0, unrecognisedCodes: 0, lettersByStatus: { RENDERED: 2 } }),
  'POST /api/acb/runs/{id}/returns': async ({ request }) => {
    const { actionDate, reportDate, entries } = await request.json()
    state.batches.push(batchOf({ id: 7 + state.batches.length, actionDate, reportDate: reportDate ?? null, entries: entries.length, recorded: entries.length, lettersQueued: entries.length }))
    return json({ ...state.batches.at(-1), lines: entries.map((e, i) => unpaidOf({ id: 3000 + i, fileSequence: e.fileSequence ?? null, unpaidCode: e.code, decision: e.decision ?? null })) })
  },
  'GET /api/acb/runs/{id}/returns/batches': () => json(pageOf(state.batches, 20)),
  'POST /api/acb/runs/{id}/submitted': () => step(state, 'SUBMITTED'),
  'GET /api/acb/runs/{id}/unpaids': () => json(pageOf([unpaidOf()])),
  'GET /api/acb/termination-report': () => json(TERMINATION),
  'POST /api/acb/termination-report/{memberId}/terminate': ({ params }) => json({ memberId: Number(params.memberId), membershipNumber: 'SYN-0007', status: 'Terminated', reason: 'SUBS_IN_ARREARS', letterId: 91, letterStatus: 'RENDERED', thirdUnpaidOn: '2026-10-26' }),
  'GET /api/acb/unpaid-counts': () => json(pageOf(COUNTS)),
  'PUT /api/acb/unpaid-counts': async ({ request }) => {
    const { entries } = await request.json()
    return json({ captured: entries.length, unchanged: 0, countedOn: '2026-10-07', atThree: entries.filter((e) => e.unpaidCount === 3).length })
  },
})

/** A run's step: the state the contract says, a version on, read back by the next `GET /api/acb/runs/{id}`. */
function step(state, status, fields = {}) {
  state.run = { ...state.run, ...fields, status, version: state.run.version + 1 }
  return json(state.run)
}

/** A route as the surface writes it -- `/api/acb/runs/{id}` -- as MSW matches it: `/api/acb/runs/:id`. */
const mswPath = (path) => path.replace(/\{(\w+)\}/g, ':$1')

/** Every DOD route, answered; `run` is where the walk starts. */
export const dodHandlers = ({ run = runOf() } = {}) => {
  const state = { run, batches: [] }
  return Object.entries(dodRoutes(state)).map(([route, answer]) => {
    const [method, path] = route.split(' ')
    return http[method.toLowerCase()](`*${mswPath(path)}`, answer)
  })
}
