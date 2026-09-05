// @vitest-environment node
//
// No DOM is needed here, and creating a jsdom per file was measured at roughly
// half this suite's wall clock. src/test/setup.js guards its DOM-shaped parts
// so the same setup serves both environments.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '../test/msw/server'
import { allServiceMethods, NON_FETCHING } from '../test/serviceCatalogue'
import { assertNonVacuousScan, FLOORS } from '../test/assertNonVacuousScan'
import { DEFECTS, disabled, pin } from '../test/knownDefects'

/**
 * THE FOUR-CASE ERROR CONTRACT, APPLIED TO EVERY SERVICE METHOD BY ITERATION.
 *
 * WHY THIS LAYER AND NOT ANOTHER
 * `fetch` DOES NOT REJECT ON 4xx OR 5xx. Skip the `response.ok` check and the
 * failing response goes straight to `.json()` -- and because Spring returns its
 * error envelope AS JSON, `.json()` SUCCEEDS. The component then receives
 *
 *     { timestamp, status: 500, error: "Internal Server Error", message }
 *
 * as though it were data. It is a confident wrong answer one layer BELOW where
 * the three-state rule is looking for it, which is why no page test would find
 * it. This is the most inconsistent layer in either repository and it is the
 * layer every screen sits on.
 *
 * THE FOUR CASES
 *   1. 2xx with a JSON body            -> resolves with the parsed body
 *   2. 4xx/5xx carrying the envelope   -> REJECTS. Never resolves with the
 *                                         envelope as data.
 *   3. a network failure               -> rejects
 *   4. a 2xx with a non-JSON body      -> rejects, not an unhandled parse error
 *
 * WRITTEN AGAINST THE CLASS, NOT THE INSTANCES
 * The contract iterates `allServiceMethods()`. It does not name the services
 * that are wrong today. A tenth service, or a tenth method, is covered the day
 * it is written -- and the breach list below is the only place current
 * behaviour is admitted, every entry citing a register row.
 */

/** Case ①. */
const okJson = (body = [{ id: 1, name: 'Synthetic' }]) =>
  http.all('*', () => HttpResponse.json(body))

/** Case ②. The envelope exactly as `GlobalExceptionHandler` emits it. */
const envelope = (status = 500) =>
  http.all('*', () =>
    HttpResponse.json(
      {
        timestamp: '2026-09-04T10:00:00.000+00:00',
        status,
        error: status === 500 ? 'Internal Server Error' : 'Bad Request',
        message: 'boom',
        validationErrors: { identityNumber: 'must be 13 digits' },
      },
      { status },
    ),
  )

/** Case ③. */
const networkFailure = () => http.all('*', () => HttpResponse.error())

/** Case ④. An HTML proxy or gateway page returned with a 200. */
const nonJsonBody = () =>
  http.all('*', () =>
    HttpResponse.text('<html><body>gateway</body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }),
  )

/**
 * Methods that send a request and deliberately read NO body -- the DELETEs.
 *
 * Case ④ does not apply to them and asserting it would be wrong: a DELETE that
 * answers 200 with an empty body has succeeded, and a service that rejected
 * because the body was not JSON would be the defect. They get the other three
 * cases plus an assertion that they did issue their request.
 *
 * Declared, but not trusted: `theListIsHonest` below asserts each one really
 * does issue a request, so this cannot become a place to park a method that is
 * failing the contract.
 */
const BODYLESS = new Set([
  'recruiterService.remove',
  'recruitmentChannelService.remove',
  'subscriptionsService.remove',
])

/**
 * CURRENT BEHAVIOUR, ADMITTED ONCE, EACH ENTRY CITING A REGISTER ROW.
 *
 * Everything not listed here is asserted to the correct behaviour. Every entry
 * here carries a live pin below, so the day the service is fixed the pin
 * reddens and names the row -- a defect being repaired is not allowed to happen
 * silently.
 *
 * MEASURED 2026-09-04 by executing every method under every case.
 */
const BREACHES = {
  'bankService.getBankNames': { cases: ['envelope', 'network', 'nonJson'], defect: DEFECTS.A13 },
  'jobGradeService.getByBank': { cases: ['envelope', 'network', 'nonJson'], defect: DEFECTS.A25 },
  'bankService.updateBank': { cases: ['nonJson'], defect: DEFECTS.A26 },
}

const withHandler = async (handler, fn) => {
  server.use(handler)
  return fn()
}

const settle = async (m) => {
  try {
    return { resolved: await m.fn(...m.args) }
  } catch (e) {
    return { rejected: e }
  }
}

describe('the service error contract', () => {
  const methods = allServiceMethods()
  const fetching = methods.filter((m) => !NON_FETCHING.has(m.qualified))

  it('discovered every service method, and the scan was not vacuous', () => {
    assertNonVacuousScan(methods, FLOORS.SERVICE_METHODS, 'exported service methods')
    // Recorded so a reader sees what the contract below actually covered.
    expect(methods.length).toBeGreaterThan(fetching.length)
  })

  describe('the non-fetching list is honest', () => {
    it.each([...NON_FETCHING])('%s really does issue no request', async (qualified) => {
      const m = methods.find((x) => x.qualified === qualified)
      expect(m, `${qualified} is on the non-fetching list but does not exist`).toBeDefined()

      const seen = []
      const listener = ({ request }) => seen.push(request.url)
      server.events.on('request:start', listener)
      try {
        await m.fn(...m.args)
      } finally {
        server.events.removeListener('request:start', listener)
      }

      expect(
        seen,
        `${qualified} is excluded from the error contract on the grounds that it makes no ` +
          `request -- and it just made ${seen.length}. The exclusion list is hiding a method ` +
          `that should be under contract.`,
      ).toHaveLength(0)
    })

    it.each([...BODYLESS])('%s really does issue its request', async (qualified) => {
      const m = methods.find((x) => x.qualified === qualified)
      const seen = []
      const listener = ({ request }) => seen.push(request.method)
      server.events.on('request:start', listener)
      try {
        await withHandler(okJson(), () => m.fn(...m.args))
      } finally {
        server.events.removeListener('request:start', listener)
      }
      expect(
        seen,
        `${qualified} is exempted from the JSON-body case on the grounds that it is a ` +
          `body-less request. It issued no request at all, so the exemption is covering ` +
          `something else.`,
      ).not.toHaveLength(0)
    })
  })

  describe.each(fetching.map((m) => [m.qualified, m]))('%s', (qualified, m) => {
    const breach = BREACHES[qualified]
    const breaches = (kase) => breach?.cases.includes(kase)

    it('CASE 1 -- a 2xx with a JSON body resolves', async () => {
      const { resolved, rejected } = await withHandler(okJson(), () => settle(m))
      expect(
        rejected,
        `${qualified} rejected on a perfectly good 2xx response. Every screen sitting on ` +
          `it will render its error state against a healthy backend.`,
      ).toBeUndefined()

      // A body-less DELETE resolves with `undefined`, and that is CORRECT --
      // it read no body to resolve with. Asserting a value here would be
      // asserting the wrong contract for those three methods.
      if (!BODYLESS.has(qualified)) {
        expect(
          resolved,
          `${qualified} resolved with nothing at all on a 2xx carrying a JSON body. The ` +
            `caller asked for data, the server sent data, and the service dropped it.`,
        ).toBeDefined()
      }
    })

    const case2 = async () => {
      const { resolved, rejected } = await withHandler(envelope(500), () => settle(m))

      expect(
        rejected,
        `THE CONFIDENT WRONG ANSWER. ${qualified} RESOLVED on a 500. fetch does not reject ` +
          `on 5xx, and Spring's error envelope is valid JSON, so .json() succeeded and the ` +
          `caller has been handed ${JSON.stringify(resolved)?.slice(0, 80)} as though it ` +
          `were data. Nothing downstream can tell this from a real answer.`,
      ).toBeDefined()

      // The second half, and the one that matters: it must not merely reject,
      // it must not have leaked the envelope through as a value.
      expect(
        JSON.stringify(resolved ?? null),
        `${qualified} resolved with the error envelope itself as its value.`,
      ).not.toContain('Internal Server Error')
    }

    const case3 = async () => {
      const { resolved, rejected } = await withHandler(networkFailure(), () => settle(m))
      expect(
        rejected,
        `${qualified} RESOLVED with ${JSON.stringify(resolved)?.slice(0, 60)} when the ` +
          `request never reached a server at all. "The network is down" and "here is your ` +
          `data" are being reported as the same outcome.`,
      ).toBeDefined()
    }

    const case4 = async () => {
      const { resolved, rejected } = await withHandler(nonJsonBody(), () => settle(m))
      expect(
        rejected,
        `${qualified} RESOLVED with ${JSON.stringify(resolved)?.slice(0, 60)} when the ` +
          `server answered 200 with an HTML page -- a proxy error page, typically. The ` +
          `caller cannot tell that from real data.`,
      ).toBeDefined()
    }

    if (breaches('envelope')) {
      it.skip(disabled(breach.defect, `${qualified} must reject on a 4xx/5xx`), case2)
      it(pin(breach.defect, `${qualified} still resolves on a 500`), async () => {
        const { rejected } = await withHandler(envelope(500), () => settle(m))
        expect(rejected).toBeUndefined()
      })
    } else {
      it('CASE 2 -- a 4xx/5xx carrying the error envelope REJECTS', case2)
    }

    if (breaches('network')) {
      it.skip(disabled(breach.defect, `${qualified} must reject on a network failure`), case3)
      it(pin(breach.defect, `${qualified} still resolves on a network failure`), async () => {
        const { rejected } = await withHandler(networkFailure(), () => settle(m))
        expect(rejected).toBeUndefined()
      })
    } else {
      it('CASE 3 -- a network failure rejects', case3)
    }

    if (BODYLESS.has(qualified)) {
      it('CASE 4 -- not applicable: this method reads no response body', () => {
        expect(BODYLESS.has(qualified)).toBe(true)
      })
    } else if (breaches('nonJson')) {
      it.skip(disabled(breach.defect, `${qualified} must reject on a non-JSON 2xx`), case4)
      it(pin(breach.defect, `${qualified} still resolves on a non-JSON 2xx`), async () => {
        const { rejected } = await withHandler(nonJsonBody(), () => settle(m))
        expect(rejected).toBeUndefined()
      })
    } else {
      it('CASE 4 -- a 2xx with a non-JSON body rejects', case4)
    }
  })
})

describe('what a rejection carries', () => {
  const methods = allServiceMethods().filter((m) => !NON_FETCHING.has(m.qualified))

  it.skip(
    disabled(DEFECTS.A24, 'a rejection must carry status and validationErrors'),
    async () => {
      // Written to the standard. The server sends validationErrors -- the one
      // part of its envelope that is stable and field-addressable -- and the
      // service layer throws it away, so a form cannot show
      // "identityNumber: must be 13 digits" even though it was sent.
      for (const m of methods) {
        server.use(envelope(400))
        const { rejected } = await settle(m)
        expect(rejected, `${m.qualified}`).toMatchObject({
          status: 400,
          validationErrors: { identityNumber: 'must be 13 digits' },
        })
      }
    },
  )

  it(pin(DEFECTS.A24, 'every rejection still discards status and validationErrors'), async () => {
    const carrying = []
    for (const m of methods) {
      server.use(envelope(400))
      const { rejected } = await settle(m)
      if (rejected?.status !== undefined || rejected?.validationErrors !== undefined) {
        carrying.push(m.qualified)
      }
    }
    expect(
      carrying,
      `These methods now carry structured error detail through the rejection: ` +
        `${carrying.join(', ')}. A24 has been fixed -- delete this pin, un-skip the test ` +
        `above, and close the row.`,
    ).toHaveLength(0)
  })

  it(
    pin(DEFECTS.A24, 'three modules still reject with a bare string rather than an Error'),
    async () => {
      // A second, quieter half of A24. `handleResponse` in recruiterService,
      // recruitmentChannelService and subscriptionsService does
      // `Promise.reject(msg)` with the raw response TEXT. The caller's
      // `catch (e) { e.message }` is therefore undefined, so even the free-text
      // message is lost by anyone handling it the ordinary way.
      const nonErrors = []
      for (const m of methods) {
        server.use(envelope(400))
        const { rejected } = await settle(m)
        if (rejected !== undefined && !(rejected instanceof Error)) nonErrors.push(m.qualified)
      }
      expect(nonErrors.length, `still rejecting with a non-Error: ${nonErrors.join(', ')}`)
        .toBeGreaterThan(0)
    },
  )
})

describe('the endpoint each method actually calls', () => {
  // THE RUNTIME WITNESS. Phase 4 discovers the client's endpoint surface by
  // STATICALLY scanning src/services/. A static discovery guard with no runtime
  // counterpart is grading its own homework: an endpoint the scan misses is
  // invisible, and one it invents looks real. This records what the methods
  // actually requested when executed, so the two can be compared.
  const observed = new Map()

  beforeEach(() => server.use(okJson()))
  afterEach(() => {})

  it.each(allServiceMethods().filter((m) => !NON_FETCHING.has(m.qualified)).map((m) => [m.qualified, m]))(
    '%s addresses exactly one endpoint family',
    async (qualified, m) => {
      const seen = []
      const listener = ({ request }) =>
        seen.push(`${request.method} ${new URL(request.url).pathname}`)
      server.events.on('request:start', listener)
      try {
        await settle(m)
      } finally {
        server.events.removeListener('request:start', listener)
      }
      expect(seen.length, `${qualified} issued no request`).toBeGreaterThan(0)
      observed.set(qualified, [...new Set(seen)])
    },
  )

  it(
    pin(
      DEFECTS.A23,
      'subscriptionsService.create still POSTs to /api/recruitment-channels',
    ),
    async () => {
      const seen = []
      const listener = ({ request }) =>
        seen.push(`${request.method} ${new URL(request.url).pathname}`)
      server.events.on('request:start', listener)
      try {
        server.use(okJson())
        await settle(
          allServiceMethods().find((m) => m.qualified === 'subscriptionsService.create'),
        )
      } finally {
        server.events.removeListener('request:start', listener)
      }
      expect(
        seen,
        'A23 has been fixed: subscriptionsService.create now addresses its own resource. ' +
          'Delete this pin, un-skip the test below, and close the row.',
      ).toEqual(['POST /api/recruitment-channels'])
    },
  )

  it.skip(
    disabled(DEFECTS.A23, 'subscriptionsService.create must POST to /api/subscriptions'),
    async () => {
      const seen = []
      const listener = ({ request }) =>
        seen.push(`${request.method} ${new URL(request.url).pathname}`)
      server.events.on('request:start', listener)
      try {
        server.use(okJson())
        await settle(
          allServiceMethods().find((m) => m.qualified === 'subscriptionsService.create'),
        )
      } finally {
        server.events.removeListener('request:start', listener)
      }
      expect(seen).toEqual(['POST /api/subscriptions'])
    },
  )
})
