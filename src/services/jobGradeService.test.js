import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'

import { jobGradeService } from './jobGradeService.js'
import { server } from '../test/msw/server'

/**
 * `jobGradeService.getByBank`'s SUCCESS shape, which nothing covered.
 *
 * <h2>Why the success path specifically</h2>
 * `services.errorContract.test.js` covers this service's FAILURE behaviour, by
 * discovery, across every service method. ✅ A25 is CLOSED as of `06.1b` -- the
 * `.catch(() => JOB_GRADE_OPTIONS)` is gone and this method now takes the ordinary
 * CASE 2 / 3 / 4 assertions there -- so the failure side is still asserted, still
 * over there, and still must not be duplicated here.
 *
 * ⚠️ THE ASSERTIONS BELOW CHANGED THEIR MEANING WITHOUT CHANGING THEIR VALUE, and
 * that is worth the paragraph. Three of them read `toEqual(JOB_GRADE_OPTIONS)` and
 * that constant is `[]`, so they were literally asserting "resolves empty" while
 * SAYING "falls back to the static options". Once the fallback is deleted the
 * assertions still pass -- unchanged, identical value -- and would have gone on
 * describing a mechanism that no longer exists. They are reworded to the fact.
 *
 * What no test covered is the shape it returns when the request WORKS -- which is
 * the code upstream has now rewritten twice in two days.
 *
 * WHY IT RUNS WITHOUT A DOM: it calls `fetch` and reads objects. `node` is the
 * suite's default environment, so this file declares nothing.
 */

const BANK_CODE = '462005'

const gradesFrom = (body) =>
  server.use(http.get('*/api/job-grades', () => HttpResponse.json(body)))

beforeEach(() => {
  // The service resolves a human bank NAME through bankService before asking for
  // grades. A code has no spaces, so it is used as-is and no bank call happens --
  // which is why every case below passes a code. `onUnhandledRequest: 'error'`
  // would make an unexpected bank lookup loud rather than silent.
  server.use(http.get('*/api/banks', () => HttpResponse.json([])))
})

afterEach(() => {
  server.resetHandlers()
})

describe('jobGradeService.getByBank', () => {
  it('passes through the {value,label} objects the server sends', async () => {
    // The live contract. `JobGradeResponseDto` emits `{value,label}`, and the
    // dropdown needs both halves intact: the label is what an administrator
    // reads and the value is what the form submits.
    gradesFrom([
      { value: 'C1', label: 'C1 - Clerk - Permanent' },
      { value: 'BA1', label: 'BA1' },
    ])

    await expect(jobGradeService.getByBank(BANK_CODE)).resolves.toEqual([
      { value: 'C1', label: 'C1 - Clerk - Permanent' },
      { value: 'BA1', label: 'BA1' },
    ])
  })

  it('resolves EMPTY when the server sends an empty list, rather than rejecting', async () => {
    // A4: the endpoint answers 200 with an empty list for most banks, because grades
    // are seeded for very few of them. That is a real answer -- this bank has no
    // grades on file -- and the caller renders its empty state for it.
    //
    // 🔑 THE PAIR WITH THE CONTRACT TEST IS THE POINT (the non-vacuity rule). Over in
    // `services.errorContract.test.js` this method must now REJECT on a 500, on a
    // network failure and on a non-JSON 2xx. This is the must-PASS half: if A25's fix
    // had been overzealous and made an empty list an error too, the contract test
    // would still be green and only this would catch it.
    gradesFrom([])

    await expect(jobGradeService.getByBank(BANK_CODE)).resolves.toEqual([])
  })

  it('resolves empty when asked for no bank at all, without touching the network', async () => {
    // No bank chosen is not a failure and not an error state: there is nothing to ask
    // for yet, and the caller's field is disabled until a bank is picked.
    await expect(jobGradeService.getByBank('')).resolves.toEqual([])
  })

  it('builds value and label from the DTO fields when the server sends them raw', async () => {
    // The defensive branch upstream added: if the response carries `grade`,
    // `description` and `contractType` instead of `{value,label}`, the service
    // composes the label itself.
    //
    // ⚠️ AND IT COMPOSES IT DIFFERENTLY FROM THE SERVER. This produces
    // `"C1 - Clerk (Permanent)"`; `JobGradeResponseDto` produces
    // `"C1 - Clerk - Permanent"`. Two statements of one format, in two
    // repositories, already disagreeing about the punctuation -- and today the
    // disagreement is invisible because the server always sends `{value,label}`,
    // so this branch never runs in production. Asserted so that the day it does
    // run, the difference is a red test rather than a puzzling label on screen.
    gradesFrom([{ grade: 'C1', description: 'Clerk', contractType: 'Permanent' }])

    await expect(jobGradeService.getByBank(BANK_CODE)).resolves.toEqual([
      { value: 'C1', label: 'C1 - Clerk (Permanent)' },
    ])
  })

  it('🔴 DROPS a plain-string grade entirely, where it used to keep it', async () => {
    // 🔴 THIS ASSERTS A DEFECT, AND IT IS NOT OURS TO FIX -- `jobGradeService.js`
    // is the incumbent's runtime code, so this arc asserts rather than repairs.
    //
    // Upstream's rewrite opens with `if (!it || typeof it !== 'object') return
    // null`, and the `.filter(Boolean)` below it then removes the nulls. So a
    // response of `["C1","BA1"]` -- which is exactly what this endpoint returned
    // until two days ago, as `List<String>` -- now normalises to NOTHING and the
    // service resolves empty. The previous implementation turned each string into
    // `{value: str, label: str}` and kept it.
    //
    // 🔑 THE BLAST RADIUS IS ZERO TODAY AND THAT IS WHY IT NEEDS AN ASSERTION.
    // The server currently sends `{value,label}`, so nothing reaches this branch.
    // ⚠️ AND `06.1b` MADE IT SLIGHTLY WORSE TO DIAGNOSE, deliberately: A25's fix means
    // an empty result is now a genuine "this bank has no grades" empty state rather
    // than an ambiguous fallback -- so if this branch ever does run, the screen states
    // a confident falsehood instead of an ambiguous one. Which is the argument for the
    // assertion, not against the fix.
    //
    // If a later change makes the endpoint emit strings again -- a rollback, a
    // second endpoint, a cached response -- every grade disappears from the
    // dropdown with no error anywhere. Reported to the owner rather than given a
    // register id here, because the register is a shared namespace and the arc
    // that owns this screen is mid-flight in it.
    gradesFrom(['C1', 'BA1'])

    const grades = await jobGradeService.getByBank(BANK_CODE)

    expect(
      grades,
      'a plain-string grade list normalises to nothing and the service resolves empty. ' +
        'If this test has gone red, the string case is being handled again -- which ' +
        'is the fix; delete this test and record that it was made deliberately',
    ).toEqual([])
  })
})
