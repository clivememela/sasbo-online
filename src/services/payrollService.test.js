import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '../test/msw/server'
import { deferred } from '../test/deferred'
import {
  addNote, compareAgain, downloadDiscrepancies, downloadFullReport, downloadOriginal, downloadQueryFile, getDiscrepancies, getFile,
  getFiles, produceQueryFile,
  getRows, payrollRefusalOf, raiseQueries, recordPayment, resolveDiscrepancy, typeInFile, uploadFile,
} from './payrollService'

/**
 * WHAT THE PAYROLL SERVICE PUTS ON THE WIRE -- each request as `payroll-api.md` (draft 2) states it: the multipart
 * upload (the file's name and bytes, `replace` and `columnMapping` only when chosen), the JSON bodies, the query
 * strings with nothing sent that was not given, the downloads with the name the server gave, and every id encoded.
 *
 * Node's own `File` and `FormData` here, not jsdom's -- under jsdom a file part reaches the wire empty and nameless
 * (see `multipartFields`), so this is the one place the upload's bytes are proved.
 */

/** The last request to a route, as the server would read it. */
const capture = (method, path, respond = () => HttpResponse.json({ id: 12 }, { status: 201 })) => {
  const seen = []
  server.use(http[method](path, async ({ request }) => {
    const url = new URL(request.url)
    const type = request.headers.get('content-type') ?? ''
    let body = null
    if (type.startsWith('multipart/form-data')) {
      const form = await request.formData()
      body = {}
      for (const [key, value] of form.entries()) {
        body[key] = typeof value === 'string' ? value : { name: value.name, text: await value.text() }
      }
    } else {
      const text = await request.text()
      body = text && type.startsWith('application/json') ? JSON.parse(text) : text || null
    }
    seen.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), type, body })
    return respond(request)
  }))
  return seen
}

describe('loading a file -- route 5, multipart', () => {
  it('sends the file\'s name and bytes, the employer and the month, and nothing nobody chose', async () => {
    const seen = capture('post', '*/api/payroll/files')
    const file = new File(['EMP NO,SURNAME,AMOUNT\nEMP-1,Testerson,174.00\n'], 'Invented payroll September 2026.csv', { type: 'text/csv' })

    await expect(uploadFile({ file, employerId: 1, period: '2026-09' })).resolves.toEqual({ id: 12 })

    expect(seen).toHaveLength(1)
    expect(seen[0].type).toMatch(/^multipart\/form-data; boundary=/)
    expect(seen[0].body).toEqual({
      file: { name: 'Invented payroll September 2026.csv', text: 'EMP NO,SURNAME,AMOUNT\nEMP-1,Testerson,174.00\n' },
      employerId: '1',
      period: '2026-09',
    })
  })

  it('sends `replace` and the columns only when the administrator chose them', async () => {
    const seen = capture('post', '*/api/payroll/files')
    const columnMapping = { staffNumber: 'EMP NO', idNumber: null, initials: null, surname: 'SURNAME', fullName: null, amount: 'AMOUNT' }

    await uploadFile({ file: new File(['x'], 'a.xlsx'), employerId: 1, period: '2026-09', replace: true, columnMapping })

    expect(seen[0].body.replace).toBe('true')
    expect(JSON.parse(seen[0].body.columnMapping)).toEqual(columnMapping)
  })

  it('Cancel stops the waiting: the request is abandoned as an abort, which is not a failure to report', async () => {
    const held = deferred()
    server.use(http.post('*/api/payroll/files', () => held.promise))
    const cancel = new AbortController()

    const settled = uploadFile({ file: new File(['x'], 'a.csv'), employerId: 1, period: '2026-09' }, { cancel: cancel.signal })
      .then(() => ({}), (error) => ({ error }))
    cancel.abort()
    const { error } = await settled

    expect(error).toMatchObject({ kind: 'abort', retryable: false })
    held.resolve(HttpResponse.json({ id: 12 }, { status: 201 }))
  })

  it('a refusal rejects with its code and details, for the screen to act on', async () => {
    capture('post', '*/api/payroll/files', () => HttpResponse.json({
      status: 409, code: 'FILE_EXISTS_FOR_PERIOD', message: 'A different file is loaded for this employer and month.',
      details: { fileId: '9', uploadedAt: '2026-09-28T08:15:00Z', uploadedBy: 'system' },
    }, { status: 409 }))

    const error = await uploadFile({ file: new File(['x'], 'a.csv'), employerId: 1, period: '2026-09' }).catch((e) => e)
    expect(error.message).toBe('A different file is loaded for this employer and month.')
    expect(payrollRefusalOf(error)).toEqual({ code: 'FILE_EXISTS_FOR_PERIOD', details: { fileId: '9', uploadedAt: '2026-09-28T08:15:00Z', uploadedBy: 'system' } })
    expect(payrollRefusalOf(new Error('no body'))).toBeNull()
  })
})

describe('the JSON writes, each body exactly', () => {
  it.each([
    ['typed lines (route 6)', 'post', '*/api/payroll/files/typed',
      () => typeInFile({ employerId: 7, period: '2026-09', statedTotal: '174.00', rows: [{ staffNumber: 'EMP-1', idNumber: null, initials: 'B', surname: 'Testerson', amount: '174.00' }] }),
      { employerId: 7, period: '2026-09', statedTotal: '174.00', rows: [{ staffNumber: 'EMP-1', idNumber: null, initials: 'B', surname: 'Testerson', amount: '174.00' }] }],
    ['compare again (route 10)', 'post', '*/api/payroll/files/:id/reconcile', () => compareAgain('12', { version: 3 }), { version: 3, columnMapping: null }],
    ['a note (route 19)', 'post', '*/api/payroll/discrepancies/:id/notes', () => addNote('77', 'Asked the employer.'), { text: 'Asked the employer.' }],
    ['a resolve (route 20)', 'post', '*/api/payroll/discrepancies/:id/resolve',
      () => resolveDiscrepancy('77', { outcome: 'ARREARS_RECORDED', note: 'Recorded R24.00 owed.', version: 2 }),
      { outcome: 'ARREARS_RECORDED', note: 'Recorded R24.00 owed.', version: 2 }],
    ['a payment (route 21)', 'post', '*/api/payroll/payments',
      () => recordPayment({ employerId: 1, period: '2026-09', amount: '5738.52', receivedOn: '2026-09-30' }),
      { employerId: 1, period: '2026-09', amount: '5738.52', receivedOn: '2026-09-30', reference: null }],
  ])('%s', async (_, method, path, call, body) => {
    const seen = capture(method, path)
    await call()
    expect(seen[0].type).toMatch(/^application\/json/)
    expect(seen[0].body).toEqual(body)
  })

  it('raising a query list (route 13) sends no body at all', async () => {
    const seen = capture('post', '*/api/payroll/files/:id/queries')
    await raiseQueries('12')
    expect(seen[0]).toMatchObject({ path: '/api/payroll/files/12/queries', body: null })
  })
})

describe('the reads, with nothing sent that was not given', () => {
  it('the files: only the filters given, then the page', async () => {
    const seen = capture('get', '*/api/payroll/files', () => HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }))
    await getFiles({}, 0, 20)
    await getFiles({ employerId: 1, period: '2026-09', status: 'RECONCILED' }, 2, 20)
    expect(seen.map((request) => request.query)).toEqual([
      { page: '0', size: '20' },
      { employerId: '1', period: '2026-09', status: 'RECONCILED', page: '2', size: '20' },
    ])
  })

  it('a file\'s lines and discrepancies, by what is shown and by kind and status', async () => {
    const page = () => HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
    const rows = capture('get', '*/api/payroll/files/:id/rows', page)
    const found = capture('get', '*/api/payroll/files/:id/discrepancies', page)
    await getRows('12', undefined, 0, 20)
    await getRows('12', 'NOT_MATCHED', 1, 20)
    await getDiscrepancies('12', { type: 'AMOUNT_DIFFERS', status: 'OPEN' }, 0, 20)
    expect(rows.map((request) => request.query)).toEqual([{ page: '0', size: '20' }, { show: 'NOT_MATCHED', page: '1', size: '20' }])
    expect(found[0].query).toEqual({ type: 'AMOUNT_DIFFERS', status: 'OPEN', page: '0', size: '20' })
  })

  it('🔒 an id travels encoded -- what an address held is never a path of its own', async () => {
    const seen = []
    server.use(http.get('*/api/payroll/files/*', ({ request }) => {
      seen.push(new URL(request.url).pathname)
      return HttpResponse.json({ id: 1 })
    }))
    await getFile('12/../vocabulary')
    expect(seen).toEqual(['/api/payroll/files/12%2F..%2Fvocabulary'])
  })
})

describe('the downloads, fetched with the name the server gave', () => {
  const attachment = (name) => () => new HttpResponse('synthetic bytes', {
    headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${name}"` },
  })

  it('the discrepancies list and the full report, in the format asked for', async () => {
    const list = capture('get', '*/api/payroll/files/:id/reports/discrepancies', attachment('Payroll discrepancies - Absa - September 2026.xlsx'))
    const full = capture('get', '*/api/payroll/files/:id/reports/full', attachment('Payroll reconciliation - Absa - September 2026.pdf'))

    const one = await downloadDiscrepancies('12', 'xlsx')
    const two = await downloadFullReport('12', 'pdf')

    expect(list[0].query).toEqual({ format: 'xlsx' })
    expect(full[0].query).toEqual({ format: 'pdf' })
    expect(one.filename).toBe('Payroll discrepancies - Absa - September 2026.xlsx')
    expect(two.filename).toBe('Payroll reconciliation - Absa - September 2026.pdf')
    expect(await one.blob.text()).toBe('synthetic bytes')
  })

  it('the employer\'s file, as it arrived, with its own name', async () => {
    const seen = capture('get', '*/api/payroll/files/:id/content', attachment('Absa payroll September 2026.xlsx'))
    const fetched = await downloadOriginal('12')
    expect(seen[0]).toMatchObject({ path: '/api/payroll/files/12/content', query: {} })
    expect(fetched.filename).toBe('Absa payroll September 2026.xlsx')
  })

  it('🔒 an employer\'s query list: made with only its format sent -- the system makes the password -- then fetched', async () => {
    const made = capture('post', '*/api/payroll/queries/:id/files', () => HttpResponse.json({
      file: { id: 31, fileName: 'Payroll queries - Absa - September 2026.xlsx' }, password: 'shown-once-here', passwordNote: 'Shown once.',
    }, { status: 201 }))
    const bytes = capture('get', '*/api/payroll/query-files/:id', attachment('Payroll queries - Absa - September 2026.xlsx'))

    const answer = await produceQueryFile('2', 'pdf')
    const fetched = await downloadQueryFile(answer.file.id)

    expect(made[0]).toMatchObject({ path: '/api/payroll/queries/2/files', query: {}, body: { format: 'pdf' } })
    expect(answer.password).toBe('shown-once-here')
    expect(bytes[0]).toMatchObject({ path: '/api/payroll/query-files/31', query: {} })
    expect(fetched.filename).toBe('Payroll queries - Absa - September 2026.xlsx')
  })
})
