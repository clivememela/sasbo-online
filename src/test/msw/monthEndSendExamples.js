import { http, HttpResponse } from 'msw'

/**
 * SENDING THE MONTH, ANSWERED AS `contracts/monthend-api.md` WRITES IT -- the regions' packs (§2), the banks' and
 * providers' files (§3), what was sent (§4), and the suspended lists (R5) -- until the server's golden file carries
 * them. Shaped field for field on the contract's examples; set on the golden months' taken August, so a screen that
 * opens on the newest month taken opens here. Every name, number and address is invented (`example.org`).
 *
 * Opted into like every shared handler of this suite: a test says what it depends on with `server.use(...)`.
 */

/** August's take, as the golden months answer it. */
export const AUGUST_TAKE = { takeNumber: 1, takenAt: '2026-09-29T08:00:00Z', takenBy: 'seed' }
export const BY = 'Head Office Administrator (demo.headoffice)'

/** One recipient of a region's pack (§1): six regions, Johannesburg twice (Stephne, MEN-02). */
export const packSet = (code, label, regionCode, areaLetters = [], extra = {}) => ({
  code,
  label,
  regionCode,
  regionName: regionCode,
  areaLetters,
  position: 'Regional Secretary',
  email: `regional.secretary.${code.toLowerCase()}@example.org`,
  active: true,
  version: 0,
  updatedBy: 'system',
  updatedAt: '2026-10-07T08:00:00Z',
  ...extra,
})

export const SETS = [
  packSet('BLM', 'Bloemfontein', 'BLM'),
  packSet('CPT', 'Cape Town', 'CPT'),
  packSet('DBN', 'Durban', 'DBN'),
  packSet('JHB', 'Johannesburg (first set)', 'JHB', ['A', 'F', 'K', 'X']),
  packSet('JHB2', 'Johannesburg (second set)', 'JHB', ['H', 'N', 'P']),
  packSet('PE', 'Port Elizabeth', 'PE', [], { email: null }),
  packSet('PTA', 'Pretoria', 'PTA'),
]

/** A recipient's pack for August's take (§2). */
export const regionPack = (set, extra = {}) => ({
  id: 41,
  month: '2026-08',
  takeNumber: 1,
  setCode: set.code,
  setLabel: set.label,
  regionCode: set.regionCode,
  areaLetters: set.areaLetters,
  position: set.position,
  producedAt: '2026-10-01T06:58:00Z',
  producedBy: BY,
  counts: { joined: 34, left: 12, suspended: 5 },
  files: [
    { format: 'PDF', name: `sasbo-month-end-2026-08-${set.code}.pdf`, bytes: 182344, sha256: 'invented' },
    { format: 'XLSX', name: `sasbo-month-end-2026-08-${set.code}.xlsx`, bytes: 64211, sha256: 'invented' },
  ],
  ...extra,
})

/** One delivery (§4): by default, Johannesburg's pack e-mailed as both formats. */
export const delivery = (extra = {}) => ({
  id: 90,
  at: '2026-10-01T07:02:00Z',
  by: BY,
  kind: 'REGION_PACK',
  recipientCode: 'JHB',
  recipientName: 'Johannesburg (first set)',
  channel: 'EMAIL',
  formats: ['PDF', 'XLSX'],
  address: 'regional.secretary.jhb@example.org',
  outcome: 'SENT',
  code: null,
  fileName: 'sasbo-month-end-2026-08-JHB.pdf',
  packId: 41,
  fileId: null,
  ...extra,
})

/**
 * The month's packs (§2): Johannesburg's produced and e-mailed, every other recipient's not produced yet. `mail` is
 * whether this server sends mail -- off, as on the demonstration link, unless a test says otherwise.
 */
export const regionPacks = ({ mail = false, rows } = {}) => ({
  month: '2026-08',
  take: AUGUST_TAKE,
  mail: { configured: mail },
  available: true,
  unplaced: 3,
  uncovered: { areas: [], members: 0 },
  sets: rows ?? SETS.map((set) => (set.code === 'JHB'
    ? { set, pack: regionPack(set), deliveries: [delivery()] }
    : { set, pack: null, deliveries: [] })),
})

/** What a bank's monthly file holds (§1, Stephne MEN-32 to MEN-34). */
export const bank = (code, name, tableCodes, fullList, layout, extra = {}) => ({
  code, name, tableCodes, fullList, layout, active: true, version: 0, updatedBy: 'system',
  updatedAt: '2026-10-07T08:00:00Z', ...extra,
})

export const provider = (code, name, layout, delivery, extra = {}) => ({
  code, name, layout, provisional: false, delivery, active: true, version: 0, updatedBy: 'system',
  updatedAt: '2026-10-07T08:00:00Z', ...extra,
})

/** A file as made (§3). */
export const monthEndFile = (extra = {}) => ({
  id: 7,
  month: '2026-08',
  takeNumber: 1,
  kind: 'BANK',
  recipientCode: 'ABSA',
  recipientName: 'Absa',
  layout: 'ABSA_FIXED_WIDTH',
  fullList: true,
  fileName: 'ABSAFULL_260831.zip',
  format: 'ZIP',
  protection: 'AES_256_ZIP',
  rows: 412,
  newRows: 0,
  deletedRows: 0,
  leftOut: 2,
  bytes: 5120,
  sha256: 'invented',
  producedAt: '2026-10-01T07:20:00Z',
  producedBy: BY,
  downloads: 1,
  lastDeliveredAt: '2026-10-01T07:21:00Z',
  ...extra,
})

export const ABSA = bank('ABSA', 'Absa', [24, 78, 90], true, 'ABSA_FIXED_WIDTH')
export const NEDBANK = bank('NEDBANK', 'Nedbank', [13, 14, 35, 36, 109, 114], false, 'SHEET')
export const OM_FUNERAL = provider('OM_FUNERAL', 'Old Mutual funeral benefit', 'OLD_MUTUAL_FUNERAL', 'DOWNLOAD', { provisional: true })
export const LAW_CALL = provider('LAW_CALL', 'Law Call (Azoza)', 'PROVISIONAL_MEMBER_LIST', 'SFTP', { provisional: true })
export const CRITICARE = provider('CRITICARE', 'Criticare', 'PROVISIONAL_MEMBER_LIST', 'DOWNLOAD', { provisional: true, active: false })

/** The month's files (§3): Absa's made once, Nedbank's not yet; Old Mutual's and Law Call's lists on, Criticare's off. */
export const monthFiles = ({ sftp = false } = {}) => ({
  month: '2026-08',
  take: AUGUST_TAKE,
  sftp: { configured: sftp, state: sftp ? 'CONFIGURED' : 'NOT_CONFIGURED' },
  banks: [
    { bank: ABSA, preview: { rows: 412, newRows: 0, deletedRows: 0 }, files: [monthEndFile()] },
    { bank: NEDBANK, preview: { rows: 9, newRows: 6, deletedRows: 3 }, files: [] },
  ],
  providers: [
    { provider: OM_FUNERAL, preview: { rows: 1310, newRows: 0, deletedRows: 0 }, files: [] },
    { provider: LAW_CALL, preview: { rows: 1310, newRows: 0, deletedRows: 0 }, files: [] },
    { provider: CRITICARE, preview: { rows: 0, newRows: 0, deletedRows: 0 }, files: [] },
  ],
  noTableCode: { rows: 0, newRows: 0, deletedRows: 0 },
})

/** The one-time password a produced file is answered with -- invented, and shaped as the server's (16 characters). */
export const INVENTED_ONE_TIME = 'Tq4m-Wz7r-Kp3x-Hn8c'
export const PASSWORD_NOTE = 'This password is shown once and is not kept. Give it to the bank by another channel '
  + '(telephone or SMS), never in the e-mail that carries the file.'

/** A produced file's answer (§3): the file, and its password -- in this answer only. */
export const produced = (file) => ({ file, password: INVENTED_ONE_TIME, passwordNote: PASSWORD_NOTE })

/** What was sent in the month (§4), a page of it. */
export const deliveriesPage = (items = [delivery(), delivery({ id: 89, channel: 'DOWNLOAD', formats: ['PDF'], address: null, at: '2026-10-01T07:00:00Z' })], extra = {}) => ({
  month: '2026-08', page: 0, size: 50, total: items.length, items, ...extra,
})

/** A suspended member as the lists answer one (R5) -- invented, in monthend-rules' own block of numbers. */
export const suspended = (extra = {}) => ({
  memberId: 812,
  membershipNumber: 'M-095990',
  name: 'T Invented',
  bank: 'INVENTED BANK',
  workplace: 'R/A 900001 INVENTED BRANCH',
  area: 'L',
  paymentType: 'Payroll Deduction',
  suspensionCode: 11,
  suspensionName: 'NOT ON PAYROLL',
  noDeductionReason: 'Unpaid leave',
  suspendedOn: '2026-06-02',
  lapsesOn: '2026-09-02',
  lapsed: true,
  ...extra,
})

/** A page of the suspended (R5). */
export const suspendedPage = (items = [suspended()], extra = {}) => ({
  asAt: '2026-10-07',
  lapseMonths: 3,
  page: 0,
  size: 50,
  total: items.length,
  totalPages: items.length ? 1 : 0,
  lapsed: items.filter((item) => item.lapsed).length,
  undated: items.filter((item) => !item.suspendedOn).length,
  items,
  ...extra,
})

/** A handler answering `method path` with `body`, and recording each request it was asked (`asked`). */
export const answering = (method, path, body, { status = 200, asked } = {}) =>
  http[method](`*${path}`, async ({ request, params }) => {
    asked?.push({ url: new URL(request.url), params, body: method === 'get' ? null : await request.clone().text() })
    return typeof body === 'function' ? body({ request, params }) : HttpResponse.json(body, { status })
  })
