// @vitest-environment jsdom -- the reasons for no payroll deduction: read by anyone, kept by REFERENCE_MAINTAIN
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import NoDeductionReasons from './NoDeductionReasons'
import { PERMISSIONS } from '../../auth/permissions'
import { TestAuthProvider } from '../../test/authTestUtils'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { monthEndAnswer, monthEndBody, monthEndExamples, monthEndRefusal } from '../../test/msw/monthEndExamples'
import { setupUser } from '../../test/user'
import { deferred } from '../../test/deferred'
import { expectNoA11yViolations } from '../../test/assertions'

/**
 * THE REASONS FOR NO PAYROLL DEDUCTION, KEPT -- `contracts/monthend-rules-api.md` R1; Stephne, MEN-17.
 *
 * Every answer and refusal is the server's own golden one (`month-end-examples.json`); where a case needs another list,
 * it is the golden list with a value changed. Every write the screen sends is recorded, so "nothing was written" is a
 * measurement.
 */

const LIST = 'GET /api/reference/no-deduction-reasons'
const ADD = 'POST /api/reference/no-deduction-reasons'
const CHANGE = 'PUT /api/reference/no-deduction-reasons/{id}'
const GOLDEN = monthEndBody(LIST)

let writes
const record = ({ request }) => {
  if (request.method !== 'GET') writes.push(`${request.method} ${new URL(request.url).pathname}`)
}
let bodies
const keepBody = async ({ request }) => {
  if (request.method !== 'GET') bodies.push(await request.clone().json())
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  writes = []
  bodies = []
  server.events.on('request:start', record)
  server.events.on('request:start', keepBody)
  server.use(monthEndAnswer(LIST), monthEndAnswer('GET /api/reference/suspension-codes'))
})

afterEach(() => {
  server.events.removeListener('request:start', record)
  server.events.removeListener('request:start', keepBody)
})

const openPage = (permissions = [PERMISSIONS.REFERENCE_MAINTAIN]) =>
  renderWithProviders(<TestAuthProvider permissions={permissions}><NoDeductionReasons /></TestAuthProvider>)

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
const cells = (row) => within(row).getAllByRole('cell').filter((cell) => !cell.hasAttribute('data-expander'))
const rowOf = (name) => bodyRows().find((row) => cells(row)[0].textContent.startsWith(name))

/** The list as read, answered `count` times in turn by `answers` (the last one again after that). */
const listAnswers = (...answers) => {
  let reads = 0
  return http.get('*/api/reference/no-deduction-reasons', () => {
    const answer = answers[Math.min(reads, answers.length - 1)]
    reads += 1
    return answer instanceof Response ? answer : HttpResponse.json(answer)
  })
}

describe('the list', () => {
  it('🔑 every reason in its place: its code by SASBO\'s number, whether it is offered, who changed it last', async () => {
    openPage()

    await screen.findByText('Unpaid leave')
    expect(bodyRows().map((row) => cells(row)[0].textContent)).toEqual(['Unpaid leaveProvisional code', 'Maternity leave',
      'Paternity leaveProvisional code', 'Insufficient fundsProvisional code', 'Sick leave'])
    expect(cells(rowOf('Unpaid leave')).slice(1, 4).map((cell) => cell.textContent))
      .toEqual(['11 · NOT ON PAYROLL', '1', 'Offered'])
    // A code with no name on record here is said by its number alone.
    expect(cells(rowOf('Maternity leave'))[1]).toHaveTextContent(/^12$/)
    expect(screen.getByText('5 reasons, 5 offered on Change status. The list holds at most 50.')).toBeInTheDocument()
    expect(screen.getByText(/A provisional code was chosen for SASBO and stands until SASBO confirms it/)).toBeInTheDocument()
    expect(screen.getAllByText(/^6 October 2026 at 00:00 by migration$/)).toHaveLength(5)
  })

  it('🔒 held: nobody signed in reads the list, finds every control shut, and is told why -- nothing is written', async () => {
    openPage([])

    await screen.findByText('Unpaid leave')
    const why = screen.getByText(/^Changing the reasons is for an administrator who has signed in with permission to maintain lists\./)
    expect(within(why).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', expect.stringMatching(/^\/login\?next=/))
    const add = screen.getByRole('button', { name: /Add a reason/ })
    expect(add).toBeDisabled()
    expect(add).toHaveAttribute('aria-describedby', why.id)
    for (const change of screen.getAllByRole('button', { name: /^Change “/ })) expect(change).toBeDisabled()
    expect(writes).toEqual([])
  })

  it('🔒 signed in without REFERENCE_MAINTAIN: the permission is named', async () => {
    openPage([PERMISSIONS.MEMBERS_VIEW])

    expect(await screen.findByText('You need permission to maintain lists to change the reasons. '
      + 'Ask your administrator if you should have it.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add a reason/ })).toBeDisabled()
  })

  it('the list full: Add a reason is shut, and says why', async () => {
    server.use(listAnswers({ ...GOLDEN, ceiling: GOLDEN.rows.length }))
    openPage()

    await screen.findByText('Unpaid leave')
    const add = screen.getByRole('button', { name: /Add a reason/ })
    expect(add).toBeDisabled()
    expect(add).toHaveAccessibleDescription('The list is full: stop offering a reason rather than adding one.')
  })
})

describe('adding and changing a reason', () => {
  it('🔑 a reason added: its name and SASBO\'s code, offered -- sent as the server reads it, and on the list at once', async () => {
    server.use(monthEndAnswer(ADD))
    const user = setupUser()
    openPage()

    await screen.findByText('Unpaid leave')
    await user.click(screen.getByRole('button', { name: /Add a reason/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a reason' })
    await user.type(within(dialog).getByLabelText(/^Reason/), 'Study leave')
    const code = within(dialog).getByLabelText(/^SASBO’s suspension code/)
    await waitFor(() => expect(within(code).getByRole('option', { name: '11 · NOT ON PAYROLL' })).toBeInTheDocument())
    await user.selectOptions(code, '11')
    await user.click(within(dialog).getByRole('button', { name: 'Add the reason' }))

    expect(await screen.findByText('“Study leave” is added under code 11, and Change status offers it.')).toBeInTheDocument()
    expect(writes).toEqual(['POST /api/reference/no-deduction-reasons'])
    // No place given, so none is sent: the server puts it last (R1).
    expect(bodies).toEqual([{ name: 'Study leave', suspensionCode: 11, active: true }])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(bodyRows().at(-1)).toHaveTextContent(/^Study leave/)
  })

  it('🔑 a reason changed sends the version it read -- and saving a provisional reason confirms its code', async () => {
    server.use(monthEndAnswer(CHANGE))
    const user = setupUser()
    openPage()

    await screen.findByText('Unpaid leave')
    await user.click(screen.getByRole('button', { name: 'Change “Unpaid leave”' }))
    const dialog = await screen.findByRole('dialog', { name: 'Change “Unpaid leave”' })
    expect(within(dialog).getByLabelText(/^Reason/)).toHaveValue('Unpaid leave')
    await user.click(within(dialog).getByRole('button', { name: 'Save the change' }))

    expect(await screen.findByText('“Unpaid leave” is saved.')).toBeInTheDocument()
    expect(bodies).toEqual([monthEndExamples.answers[CHANGE].requestBody])
    expect(cells(rowOf('Unpaid leave'))[0]).toHaveTextContent(/^Unpaid leave$/)
  })

  it('a reason whose code is not on SASBO\'s list here keeps its code on offer, by its number', async () => {
    const user = setupUser()
    openPage()

    await screen.findByText('Maternity leave')
    await user.click(screen.getByRole('button', { name: 'Change “Maternity leave”' }))
    const dialog = await screen.findByRole('dialog', { name: 'Change “Maternity leave”' })
    const code = within(dialog).getByLabelText(/^SASBO’s suspension code/)
    await waitFor(() => expect(code).toHaveValue('12'))
    expect(within(code).getByRole('option', { name: '12' })).toBeInTheDocument()
  })

  it('what the form can say before asking: a name, a code, and a place that is one -- and nothing is sent', async () => {
    const user = setupUser()
    openPage()

    await screen.findByText('Unpaid leave')
    await user.click(screen.getByRole('button', { name: /Add a reason/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a reason' })
    await user.type(within(dialog).getByLabelText(/^Place on the list/), '0')
    await user.click(within(dialog).getByRole('button', { name: 'Add the reason' }))

    expect(within(dialog).getByLabelText(/^Reason/)).toHaveAccessibleDescription(/^Give the reason a name\./)
    expect(within(dialog).getByLabelText(/^SASBO’s suspension code/))
      .toHaveAccessibleDescription(/^Choose SASBO’s suspension code for it\./)
    expect(within(dialog).getByLabelText(/^Place on the list/)).toHaveAccessibleDescription(/^A place from 1 to 999\./)
    expect(writes).toEqual([])
  })
})

describe('the refusals, each where it happened', () => {
  const addStudyLeave = async (user) => {
    await screen.findByText('Unpaid leave')
    await user.click(screen.getByRole('button', { name: /Add a reason/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a reason' })
    await user.type(within(dialog).getByLabelText(/^Reason/), 'unpaid LEAVE')
    const code = within(dialog).getByLabelText(/^SASBO’s suspension code/)
    await waitFor(() => expect(within(code).getByRole('option', { name: '11 · NOT ON PAYROLL' })).toBeInTheDocument())
    await user.selectOptions(code, '11')
    await user.click(within(dialog).getByRole('button', { name: 'Add the reason' }))
    return dialog
  }

  it.each([
    ['NO_DEDUCTION_REASON_INVALID', 'a name the server will not take'],
    ['NO_DEDUCTION_REASON_TAKEN', 'a name another reason has'],
  ])('%s: %s, said at the name in the server\'s words -- the form kept as typed', async (code) => {
    server.use(monthEndRefusal(code, ADD))
    const user = setupUser()
    openPage()

    const dialog = await addStudyLeave(user)

    const name = within(dialog).getByLabelText(/^Reason/)
    await waitFor(() => expect(name).toHaveAccessibleDescription(
      new RegExp(`^${monthEndExamples.refusals[code].body.message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)))
    expect(name).toHaveValue('unpaid LEAVE')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('🔑 NO_DEDUCTION_REASON_CHANGED_SINCE: nothing written, the list read again, and their version in the form', async () => {
    const theirs = { ...GOLDEN.rows[0], name: 'Unpaid leave, as changed', version: 3 }
    server.use(
      listAnswers(GOLDEN, { ...GOLDEN, rows: [theirs, ...GOLDEN.rows.slice(1)] }),
      monthEndRefusal('NO_DEDUCTION_REASON_CHANGED_SINCE', CHANGE),
    )
    const user = setupUser()
    openPage()

    await screen.findByText('Unpaid leave')
    await user.click(screen.getByRole('button', { name: 'Change “Unpaid leave”' }))
    const dialog = await screen.findByRole('dialog', { name: 'Change “Unpaid leave”' })
    await user.click(within(dialog).getByRole('button', { name: 'Save the change' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Someone else changed this reason since you opened it. '
      + 'Nothing was changed: look at theirs, then edit it again. It was changed by migration on 6 October 2026 at 00:00. '
      + 'Their version is in the form now.')
    expect(within(dialog).getByLabelText(/^Reason/)).toHaveValue('Unpaid leave, as changed')
    expect(await screen.findByText('Unpaid leave, as changed')).toBeInTheDocument()

    // Saved again, it carries their version.
    server.use(monthEndAnswer(CHANGE))
    await user.click(within(dialog).getByRole('button', { name: 'Save the change' }))
    await screen.findByText(/is saved\.$/)
    expect(bodies.at(-1)).toMatchObject({ name: 'Unpaid leave, as changed', version: 3 })
  })

  it('NO_DEDUCTION_REASON_NOT_FOUND: the form closes, the server\'s sentence above the list, and the list is read again', async () => {
    let reads = 0
    server.use(
      http.get('*/api/reference/no-deduction-reasons', () => {
        reads += 1
        return HttpResponse.json(GOLDEN)
      }),
      monthEndRefusal('NO_DEDUCTION_REASON_NOT_FOUND', CHANGE),
    )
    const user = setupUser()
    openPage()

    await screen.findByText('Sick leave')
    await user.click(screen.getByRole('button', { name: 'Change “Sick leave”' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save the change' }))

    expect(await screen.findByText('That reason is not on the list. The list is read again.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(reads).toBe(2))
  })

  it('a change with no answer is never said to have happened: the form says so and stays, and the list is read again', async () => {
    let reads = 0
    server.use(
      http.get('*/api/reference/no-deduction-reasons', () => {
        reads += 1
        return HttpResponse.json(GOLDEN)
      }),
      http.put('*/api/reference/no-deduction-reasons/:id', () => HttpResponse.error()),
    )
    const user = setupUser()
    openPage()

    await screen.findByText('Sick leave')
    await user.click(screen.getByRole('button', { name: 'Change “Sick leave”' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Save the change' }))

    expect(await within(dialog).findByRole('alert'))
      .toHaveTextContent('The change could not be confirmed. The list is read again: look at it before trying again.')
    await waitFor(() => expect(reads).toBe(2))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('the states', () => {
  it('loading, then a list with no reason -- said as none', async () => {
    const held = deferred()
    server.use(http.get('*/api/reference/no-deduction-reasons', async () => {
      await held.promise
      return HttpResponse.json({ ...GOLDEN, rows: [] })
    }))
    openPage()

    expect(await screen.findByRole('table', { name: 'Reasons for no payroll deduction' })).toBeInTheDocument()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('No reason is on the list.')).not.toBeInTheDocument()
    held.resolve()
    expect(await screen.findByText('No reason is on the list.')).toBeInTheDocument()
    expect(screen.getByText('0 reasons, 0 offered on Change status. The list holds at most 50.')).toBeInTheDocument()
  })

  it('a failed read is said, with Try again -- never as no reason', async () => {
    server.use(listAnswers(
      HttpResponse.json({ status: 503, error: 'Service Unavailable', message: 'The server is busy. Try again.' }, { status: 503 }),
      GOLDEN,
    ))
    const user = setupUser()
    openPage()

    expect(await screen.findByText('The server is busy. Try again.')).toBeInTheDocument()
    expect(screen.queryByText('No reason is on the list.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add a reason/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Unpaid leave')).toBeInTheDocument()
  })

  it('MV-36: an answer of another shape is not available, never an empty list', async () => {
    server.use(listAnswers([]))
    openPage()

    expect(await screen.findByText('The reasons for no payroll deduction are not available from this server yet.'))
      .toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('the list, its controls and the form have no violations (MR-ROB-37)', async () => {
    const user = setupUser()
    const { container } = openPage()

    await screen.findByText('Unpaid leave')
    await expectNoA11yViolations(container)
    await user.click(screen.getByRole('button', { name: 'Change “Unpaid leave”' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText(/^SASBO’s suspension code/)).toBeEnabled())
    await expectNoA11yViolations(document.body)
  })
})
