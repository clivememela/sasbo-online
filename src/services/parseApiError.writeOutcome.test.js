import { describe, expect, it } from 'vitest'

import { ERROR_KINDS, writeMayHaveLanded } from './parseApiError'

/**
 * R3-F2: only a server that answered and REFUSED supports "nothing was written". Both halves, because a helper that
 * always said "may have landed" would pass the first alone and turn every refusal into a vague "check the register".
 */
describe('writeMayHaveLanded', () => {
  it.each([
    ['a timeout', { kind: ERROR_KINDS.TIMEOUT, status: 0 }],
    ['a lost connection', { kind: ERROR_KINDS.NETWORK, status: 0 }],
    ['a server error', { kind: ERROR_KINDS.HTTP, status: 500 }],
    ['a success whose body was not JSON', { kind: ERROR_KINDS.NON_JSON, status: 200 }],
    ['something that is not an API error at all', new Error('boom')],
    ['nothing', undefined],
  ])('%s may have landed', (_, error) => {
    expect(writeMayHaveLanded(error)).toBe(true)
  })

  it.each([
    ['a bad request', 400],
    ['a conflict', 409],
    ['a validation refusal', 422],
  ])('the must-pass: %s did not', (_, status) => {
    expect(writeMayHaveLanded({ kind: ERROR_KINDS.HTTP, status })).toBe(false)
  })
})
