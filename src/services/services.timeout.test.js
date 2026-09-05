// @vitest-environment node
//
// No DOM is needed here, and creating a jsdom per file was measured at roughly
// half this suite's wall clock. src/test/setup.js guards its DOM-shaped parts
// so the same setup serves both environments.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from 'msw'

import { server } from '../test/msw/server'
import { allServiceMethods, NON_FETCHING } from '../test/serviceCatalogue'
import { DEFECTS, disabled, pin } from '../test/knownDefects'

/**
 * THE FOURTH STATE: a request that never resolves.
 *
 * The three-state rule covers loading, empty and failed. A hung backend is
 * NONE of them. It renders the loading state forever -- which an administrator
 * reads as "the system is slow" rather than "it is down", so nobody is called
 * and nothing is escalated. It is the failure mode with the longest time to
 * detection precisely because it looks like the system working.
 *
 * Verified across `src/services/`: zero `AbortController`, zero `signal:`,
 * zero timeout of any kind (register A14).
 *
 * FAKE TIMERS, NOT A REAL WAIT. A test that actually waits for a timeout is a
 * test that costs whatever the timeout is, every run, and is the first thing
 * deleted when the suite gets slow. The clock is advanced deliberately instead.
 */
const CEILING_MS = 30_000

/** A handler that accepts the request and then simply never answers. */
const neverAnswers = () => http.all('*', () => new Promise(() => {}))

const fetching = allServiceMethods().filter((m) => !NON_FETCHING.has(m.qualified))

afterEach(() => {
  vi.useRealTimers()
})

describe('a request that never resolves', () => {
  it.skip(
    disabled(DEFECTS.A14, 'every service call must give up and reject before a ceiling'),
    async () => {
      // Written to the standard. Each method is given a request that never
      // answers, the clock is advanced past the ceiling, and the promise must
      // have settled as a rejection -- so the UI can reach its ERROR state
      // rather than its loading state forever.
      for (const m of fetching) {
        vi.useFakeTimers()
        server.use(neverAnswers())

        let settled = false
        const call = m.fn(...m.args).then(
          () => {
            settled = true
          },
          () => {
            settled = true
          },
        )

        await vi.advanceTimersByTimeAsync(CEILING_MS + 1_000)
        await Promise.race([call, Promise.resolve()])

        expect(
          settled,
          `${m.qualified} was still pending ${CEILING_MS / 1000}s after a backend stopped ` +
            `answering. The screen is showing a spinner and will show it until the tab is ` +
            `closed.`,
        ).toBe(true)
        vi.useRealTimers()
      }
    },
  )

  it(
    pin(DEFECTS.A14, 'no service has a timeout, so every call still hangs indefinitely'),
    async () => {
      vi.useFakeTimers()
      server.use(neverAnswers())

      const stillPending = []
      const PENDING = Symbol('pending')

      for (const m of fetching) {
        const call = m.fn(...m.args)
        // Swallow a late rejection so an unhandled-rejection warning cannot
        // leak out of this test into a shuffled neighbour.
        call.catch(() => {})
        const outcome = await Promise.race([
          call.then(() => 'settled').catch(() => 'settled'),
          Promise.resolve(PENDING),
        ])
        if (outcome === PENDING) stillPending.push(m.qualified)
      }

      await vi.advanceTimersByTimeAsync(CEILING_MS + 1_000)

      expect(
        stillPending.length,
        'A14 has been fixed -- at least one service now gives up on a hung request. ' +
          'Delete this pin, un-skip the test above, and close the row.',
      ).toBe(fetching.length)
    },
  )

  it('records that nothing in the service layer can even express a timeout', () => {
    // The static half of the same finding, and the one that stays true when
    // the runtime half is hard to observe. Asserted over the SOURCE, so a
    // future AbortController turns this red and points at the pin above.
    const sources = Object.entries(
      import.meta.glob('../services/*.js', { query: '?raw', import: 'default', eager: true }),
    ).filter(([path]) => !path.includes('.test.'))

    expect(sources.length, 'the service source scan found nothing to read').toBeGreaterThan(5)

    const withTimeoutSupport = sources.filter(
      ([, src]) => /AbortController|signal\s*:|AbortSignal|setTimeout/.test(src),
    )

    expect(
      withTimeoutSupport.map(([p]) => p),
      'A service now references an abort or timeout mechanism. That is A14 being fixed -- ' +
        'check the pin above and close the row.',
    ).toEqual([])
  })
})
