import { describe, expect, it } from 'vitest'

import { createLimiter } from './limiter.js'
import { deferred } from '../test/deferred.js'

/**
 * THE BATCH PRINT ASKS FOR A FEW BRANCHES' MEMBERS AT A TIME, NEVER FIFTY AT ONCE (October build). The limiter runs at
 * most its number of tasks together, starts the next as one settles -- whether it succeeded or failed -- and settles
 * each caller as its own task does.
 */

/** Lets every queued microtask run: the limiter starts a task, and the next, a few ticks after it is handed in. */
const flush = async () => {
  for (let tick = 0; tick < 20; tick += 1) await Promise.resolve()
}

describe('createLimiter', () => {
  it('runs no more than its number at once, and starts the next as one settles, in the order handed in', async () => {
    const limit = createLimiter(2)
    const gates = [deferred(), deferred(), deferred(), deferred()]
    const started = []
    const results = gates.map((gate, i) => limit(() => {
      started.push(i)
      return gate.promise
    }))

    await flush()
    expect(started).toEqual([0, 1])

    gates[1].resolve('second')
    expect(await results[1]).toBe('second')
    await flush()
    expect(started).toEqual([0, 1, 2])

    gates[0].reject(new Error('planted: a branch that failed'))
    await expect(results[0]).rejects.toThrow('planted')
    await flush()
    expect(started).toEqual([0, 1, 2, 3])

    gates[2].resolve('third')
    gates[3].resolve('fourth')
    expect(await Promise.all([results[2], results[3]])).toEqual(['third', 'fourth'])
  })

  it('must-pass: under its number, every task starts at once', async () => {
    const limit = createLimiter(4)
    const started = []
    const gates = [deferred(), deferred(), deferred()]
    gates.forEach((gate, i) => limit(() => {
      started.push(i)
      return gate.promise
    }))

    await flush()
    expect(started).toEqual([0, 1, 2])
    gates.forEach((gate) => gate.resolve())
  })
})
