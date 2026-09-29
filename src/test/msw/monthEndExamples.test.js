import { describe, expect, it } from 'vitest'

import { committedSurface, committedVocabulary } from '../apiContractScan'
import { monthEndExamples } from './monthEndExamples'

/**
 * The golden answers copied from the server (MD48) cover the arc: an answer for every month-end route the server
 * routes, and an envelope for every refusal code it publishes. A route or a code added on the server without its
 * example reddens here, before a screen is written against a guess.
 */
const MONTH_END_ROUTE = /^GET (\/api\/reference\/.+|\/api\/workplaces)$/

describe('month end\'s golden answers', () => {
  it('answer every month-end route in the committed API surface', () => {
    const routes = committedSurface().split('\n').filter((line) => MONTH_END_ROUTE.test(line.trim()))
    expect(routes.length).toBeGreaterThan(5)
    expect(Object.keys(monthEndExamples.answers).sort()).toEqual(expect.arrayContaining(routes.map((r) => r.trim())))
  })

  it('hold an envelope for every refusal code the server publishes, each with its code and status', () => {
    const published = committedVocabulary().monthEnd.refusalCodes
    expect(Object.keys(monthEndExamples.refusals).sort()).toEqual(published.map((c) => c.code).sort())
    for (const { code, status } of published) {
      expect(monthEndExamples.refusals[code].status).toBe(status)
      expect(monthEndExamples.refusals[code].body.code).toBe(code)
    }
  })

  it('say they hold nothing of SASBO\'s (MD57)', () => {
    expect(monthEndExamples._holds).toMatch(/invented/)
  })
})
