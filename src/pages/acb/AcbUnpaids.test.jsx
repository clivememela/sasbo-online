// @vitest-environment jsdom -- the unpaids' codes, re-debit rules and counts, and suspending with SASBO's code
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import AcbUnpaids from './AcbUnpaids'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TestAuthProvider } from '../../test/authTestUtils'
import { PERMISSIONS } from '../../auth/permissions'
import { server } from '../../test/msw/server'
import { dodHandlers, pageOf, refusal, runOf, unpaidOf } from '../../test/msw/dodApi'
import { setupUser } from '../../test/user'
import { expectNoA11yViolations } from '../../test/assertions'
import { noRepresentWhy } from './dodRules'

/**
 * Each unpaid shows the bank's code and SASBO's, whether it may be re-debited and on whose word -- "not yet confirmed
 * by SASBO" where she has not said (Friday item 9) -- and the member's unpaids so far. Present again is offered only
 * where the code allows it and the member is below three (Stephne, DOD-03, DOD-04); a Suspend decision suspends the
 * member with SASBO's suspension code (her sheet), which must be chosen where the bank's code has none (its 18).
 */

const RUN = runOf({ id: 40, actionMonth: '2026-09', status: 'RETURNED' })

const LINES = [
  unpaidOf({ id: 1, membershipNumber: 'SYN-0001', surname: 'Testperson', memberUnpaidCount: 1 }),
  unpaidOf({ id: 2, memberId: 8, membershipNumber: 'SYN-0002', surname: 'Sampleton', unpaidCode: '4', unpaidReason: 'PAYMENT_STOPPED',
    reDebit: 'NO', suspensionCode: 16, suggestedDecision: 'SUSPEND', memberUnpaidCount: 1 }),
  unpaidOf({ id: 3, memberId: 9, membershipNumber: 'SYN-0003', surname: 'Inventedson', unpaidCode: '15', unpaidReason: 'ACCOUNT_CLOSED',
    reDebit: 'UNKNOWN', reDebitSource: null, codeProvisional: true, suspensionCode: 15, suggestedDecision: 'SUSPEND', memberUnpaidCount: 2 }),
  unpaidOf({ id: 4, memberId: 10, membershipNumber: 'SYN-0004', surname: 'Madeupper', memberUnpaidCount: 3, suggestedDecision: 'SUSPEND' }),
  unpaidOf({ id: 5, memberId: 11, membershipNumber: 'SYN-0005', surname: 'Fictional', unpaidCode: '18', unpaidReason: 'ACCOUNT_HOLDER_DECEASED',
    reDebit: 'UNKNOWN', reDebitSource: null, codeProvisional: true, suspensionCode: null, decision: 'SUSPEND', suggestedDecision: null }),
]

let suspensions
const listener = async ({ request }) => {
  if (request.url.includes('/suspend-member')) suspensions.push(await request.clone().json())
}
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  suspensions = []
  server.use(...dodHandlers({ run: RUN }))
  server.use(http.get('*/api/acb/runs/:id/unpaids', () => HttpResponse.json(pageOf(LINES))))
  server.events.on('request:start', listener)
})
afterEach(() => server.events.removeListener('request:start', listener))

const renderUnpaids = (permissions = [PERMISSIONS.DOD_PREPARE]) => renderWithProviders(
  <TestAuthProvider permissions={permissions}><AcbUnpaids run={RUN} onBanking={() => {}} /></TestAuthProvider>,
)

const rowOf = async (surname) => {
  const table = await screen.findByRole('table', { name: 'Unpaid debits and their decisions' })
  return (await within(table).findByText(new RegExp(surname))).closest('tr')
}

describe('what each unpaid says', () => {
  it('the bank\'s code and SASBO\'s, the re-debit rule on whose word, and the member\'s unpaids so far', async () => {
    const { container } = renderUnpaids()
    const row = await rowOf('Testperson')
    expect(within(row).getByText('bank code 2 · SASBO code 18')).toBeInTheDocument()
    expect(within(row).getByText('May be re-debited')).toBeInTheDocument()
    expect(within(row).getByText('Stephne, DOD-03')).toBeInTheDocument()
    expect(within(row).getByText('1 of 3 unpaids')).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it('a code SASBO has not ruled on says so, provisional; a code with no SASBO code says that too', async () => {
    renderUnpaids()
    const closed = await rowOf('Inventedson')
    expect(within(closed).getByText('Re-debit not yet confirmed by SASBO')).toBeInTheDocument()
    expect(within(closed).getByText('provisional')).toBeInTheDocument()
    expect(within(await rowOf('Fictional')).getByText('bank code 18 · no SASBO code on record')).toBeInTheDocument()
  })
})

describe('Present again, only where it may be (DOD-03, DOD-04)', () => {
  const presentAgain = (row) => within(within(row).getByRole('combobox')).getByRole('option', { name: 'Present again' })

  it('is offered for code 2 below three, and the suggestion stands chosen', async () => {
    renderUnpaids()
    const row = await rowOf('Testperson')
    expect(presentAgain(row)).toBeEnabled()
    expect(within(row).getByRole('combobox')).toHaveValue('RE_PRESENT')
  })

  it('is refused for a code never re-debited, a code not yet ruled on, and a member at three -- each saying why', async () => {
    renderUnpaids()
    const stopped = await rowOf('Sampleton')
    expect(presentAgain(stopped)).toBeDisabled()
    expect(within(stopped).getByText('Code 4 is never re-debited.')).toBeInTheDocument()
    expect(presentAgain(await rowOf('Inventedson'))).toBeDisabled()
    expect(screen.getByText('Whether code 15 may be re-debited is not yet confirmed by SASBO.')).toBeInTheDocument()
    expect(presentAgain(await rowOf('Madeupper'))).toBeDisabled()
    expect(screen.getByText('The member is at three unpaids, so it is not presented again.')).toBeInTheDocument()
  })

  it('a refusal the server gives anyway is said, and nothing is recorded', async () => {
    server.use(http.post('*/api/acb/runs/:id/lines/:lineId/decision', () =>
      refusal(422, 'RE_DEBIT_NOT_ALLOWED', 'Code 2 is no longer re-debited.', { lineId: '1', code: '2', reDebit: 'NO' })))
    const user = setupUser()
    renderUnpaids()
    await user.click(within(await rowOf('Testperson')).getByRole('button', { name: /^Confirm the decision/ }))
    expect(await screen.findByText('S Testperson’s unpaid cannot be presented again: Code 2 is no longer re-debited. Nothing was recorded.')).toBeInTheDocument()
  })

  it('the rule itself, for a line from a server that does not yet say: left to the server', () => {
    expect(noRepresentWhy({ reDebit: null, memberUnpaidCount: null, unpaidCode: '2' })).toBeNull()
  })
})

describe('suspending the member (DOD-12)', () => {
  it('the SASBO code the bank\'s maps to is chosen already; suspending sends it and says so', async () => {
    server.use(http.get('*/api/acb/runs/:id/unpaids', () => HttpResponse.json(pageOf([{ ...LINES[1], decision: 'SUSPEND', suggestedDecision: null }]))))
    const user = setupUser()
    renderUnpaids()
    await user.click(within(await rowOf('Sampleton')).getByRole('button', { name: 'Suspend S Sampleton as a member' }))
    const dialog = await screen.findByRole('dialog', { name: 'Suspend S Sampleton?' })
    const code = within(dialog).getByLabelText('SASBO’s suspension code')
    await vi.waitFor(() => expect(code).toHaveValue('16'))
    await expectNoA11yViolations(dialog, { rules: { region: { enabled: false } } })
    await user.click(within(dialog).getByRole('button', { name: 'Suspend the member' }))

    expect(await screen.findByText('S Sampleton is suspended, SASBO code 16.')).toBeInTheDocument()
    expect(within(await rowOf('Sampleton')).getByText('Member suspended · SASBO code 16')).toBeInTheDocument()
    expect(suspensions).toEqual([{ suspensionCode: 16 }])
  })

  it('where the bank\'s code has no SASBO code (its 18), one must be chosen first', async () => {
    const user = setupUser()
    renderUnpaids()
    await user.click(within(await rowOf('Fictional')).getByRole('button', { name: 'Suspend S Fictional as a member' }))
    const dialog = await screen.findByRole('dialog', { name: 'Suspend S Fictional?' })
    const suspend = within(dialog).getByRole('button', { name: 'Suspend the member' })
    expect(suspend).toBeDisabled()
    expect(suspend).toHaveAccessibleDescription(/Choose SASBO’s suspension code first/)
    await vi.waitFor(() => expect(within(dialog).getByRole('option', { name: '13 Debit returned' })).toBeInTheDocument())
    await user.selectOptions(within(dialog).getByLabelText('SASBO’s suspension code'), '13')
    await user.click(suspend)
    await vi.waitFor(() => expect(suspensions).toEqual([{ suspensionCode: 13 }]))
  })
})

describe('reading without deciding', () => {
  it('the CFO sees every unpaid and its rule, with no decision or suspension to make', async () => {
    renderUnpaids([PERMISSIONS.DOD_FILE])
    const row = await rowOf('Testperson')
    expect(within(row).getByText('Undecided · suggested: Present again')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Confirm the decision/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /as a member$/ })).not.toBeInTheDocument()
  })
})
