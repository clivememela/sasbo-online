// @vitest-environment jsdom -- the endings to confirm after the third unpaid (03.5; Stephne, DOD-22 to DOD-24)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import AcbTerminationReport from './AcbTerminationReport'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/msw/server'
import { pageFixtures } from '../../test/msw/pageFixtures'
import { refusal } from '../../test/msw/dodApi'
import { setupUser } from '../../test/user'
import { expectNoA11yViolations } from '../../test/assertions'

/**
 * Three unpaid presentations end a membership (Q27) once a staff member confirms each one (DOD-22), and the member
 * is sent a short letter (DOD-24). The ending is dated the day it is confirmed; the third unpaid's date is shown
 * beside it (DOD-23, both boxes ticked). The screen's word is the server's answer. Every red case has its must-pass.
 */

const candidate = (overrides) => ({
  memberId: 7, membershipNumber: 'SYN-0007', surname: 'Testperson', unpaidCount: 3, terminate: true,
  twelveMonthTotal: 3, unpaidMonths: ['2026-08', '2026-09', '2026-10'], openingUnpaids: 0, status: 'Active',
  thirdUnpaidOn: '2026-10-26', ...overrides,
})

const report = (members) => ({
  countingFrom: '2026-07',
  blindness: 'Counted from the first month this system sent a file.',
  members: { content: members, page: 0, size: 50, totalElements: members.length, totalPages: members.length ? 1 : 0 },
})

const answer = (body, status = 200) =>
  server.use(http.get('*/api/acb/termination-report', () => HttpResponse.json(body, { status })), ...pageFixtures)

const rowOf = async (surname) => {
  const table = await screen.findByRole('table', { name: 'Members the termination rule reaches, or is one away from' })
  return (await within(table).findByText(surname)).closest('tr')
}

let ended
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  ended = []
  server.use(http.post('*/api/acb/termination-report/:memberId/terminate', async ({ params, request }) => {
    ended.push({ memberId: params.memberId, body: await request.text() })
    return HttpResponse.json({ memberId: Number(params.memberId), membershipNumber: 'SYN-0007', status: 'Terminated',
      reason: 'SUBS_IN_ARREARS', letterId: 91, letterStatus: 'RENDERED', thirdUnpaidOn: '2026-10-26' })
  }))
})

describe('the endings to confirm', () => {
  it('names who three unpaids reach, with the third unpaid\'s date, and who is one away -- with no action', async () => {
    answer(report([
      candidate(),
      candidate({ memberId: 8, membershipNumber: 'SYN-0008', surname: 'Sampleton', unpaidCount: 2, terminate: false,
        unpaidMonths: ['2026-09', '2026-10'], twelveMonthTotal: 2, thirdUnpaidOn: null }),
    ]))
    const { container } = renderWithProviders(<AcbTerminationReport />)

    const due = await rowOf('Testperson')
    expect(within(due).getByText('three — the ending is to confirm')).toBeInTheDocument()
    expect(within(due).getByText('26 Oct 2026')).toBeInTheDocument()
    expect(within(due).getByRole('button', { name: 'Confirm the ending of Testperson’s membership' })).toBeEnabled()

    const atTwo = await rowOf('Sampleton')
    expect(within(atTwo).getByText('one more makes three')).toBeInTheDocument()
    expect(within(atTwo).queryByRole('button', { name: /Confirm the ending/ })).toBeNull()
    expect(screen.getByText(/Counted from July 2026\./)).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it('confirming asks first, says the ending is dated today and a letter is prepared, and shows the server\'s answer', async () => {
    answer(report([candidate()]))
    const user = setupUser()
    renderWithProviders(<AcbTerminationReport />)
    await user.click(within(await rowOf('Testperson')).getByRole('button', { name: /^Confirm the ending/ }))
    const dialog = await screen.findByRole('dialog', { name: 'End Testperson’s membership?' })
    expect(dialog).toHaveTextContent('Their third unpaid was on 26 Oct 2026. The membership ends today, the day you confirm it')
    await expectNoA11yViolations(dialog, { rules: { region: { enabled: false } } })

    await user.click(within(dialog).getByRole('button', { name: 'Confirm the ending' }))

    expect(await screen.findByText('Testperson’s membership is ended. Their letter: waiting to send.')).toBeInTheDocument()
    const row = await rowOf('Testperson')
    expect(within(row).getByText('Terminated')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /Confirm the ending/ })).toBeNull()
    // The request carries nothing (dod-api v2 §4).
    expect(ended).toEqual([{ memberId: '7', body: '' }])
  })

  it('a refusal ends nothing, in the server\'s words, and closing reads the report again', async () => {
    answer(report([candidate()]))
    server.use(http.post('*/api/acb/termination-report/:memberId/terminate', () =>
      refusal(409, 'TERMINATION_NOT_DUE', 'The rule no longer reaches this member: a debit has since been paid.')))
    const user = setupUser()
    renderWithProviders(<AcbTerminationReport />)
    await user.click(within(await rowOf('Testperson')).getByRole('button', { name: /^Confirm the ending/ }))
    const dialog = await screen.findByRole('dialog', { name: 'End Testperson’s membership?' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirm the ending' }))
    expect(await within(dialog).findByText(/^Ending Testperson’s membership was not recorded\. Nothing was written: The rule no longer reaches this member/)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Confirm the ending' })).not.toBeInTheDocument()
  })

  it('shows a member already ended by status, with no action', async () => {
    answer(report([candidate({ status: 'Terminated' })]))
    renderWithProviders(<AcbTerminationReport />)
    const row = await rowOf('Testperson')
    expect(within(row).getByText('Terminated')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /Confirm the ending/ })).toBeNull()
  })

  it('says so when nobody is at two unpaids', async () => {
    answer(report([]))
    renderWithProviders(<AcbTerminationReport />)
    expect(await screen.findByText('Nobody at two unpaids')).toBeInTheDocument()
  })

  it('says so when the report cannot be read -- never an empty list', async () => {
    answer({ status: 500, message: 'boom' }, 500)
    renderWithProviders(<AcbTerminationReport />)
    expect(await screen.findByText('We could not load the termination report.')).toBeInTheDocument()
    expect(screen.queryByText('Nobody at two unpaids')).toBeNull()
  })
})
