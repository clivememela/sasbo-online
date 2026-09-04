import { http, HttpResponse } from 'msw'

/**
 * The DEFAULT handler set: deliberately empty.
 *
 * Every test declares the responses it depends on, in the test, with
 * `server.use(...)`. A shared happy-path fixture set is how a suite ends up
 * with tests that pass because of something another file arranged.
 *
 * The helpers below are the shared vocabulary instead -- they encode the four
 * cases the service error contract asserts, so a test names a case rather than
 * hand-rolling a response shape each time.
 */
export const handlers = []

/** The Spring error envelope, exactly as `GlobalExceptionHandler` emits it. */
export const errorEnvelope = (status, message = 'Something failed', validationErrors = null) => ({
  timestamp: '2026-09-04T10:00:00.000+00:00',
  status,
  error: status === 500 ? 'Internal Server Error' : 'Bad Request',
  message,
  ...(validationErrors ? { validationErrors } : {}),
})

/** Case ②: a failed response that carries the error envelope AS JSON. */
export const respondsWithErrorEnvelope = (method, path, status = 500, validationErrors = null) =>
  http[method](path, () =>
    HttpResponse.json(errorEnvelope(status, 'boom', validationErrors), { status }),
  )

/** Case ③: the request never reaches a server. */
export const respondsWithNetworkFailure = (method, path) =>
  http[method](path, () => HttpResponse.error())

/** Case ④: a 2xx whose body is not JSON at all -- an HTML proxy page, typically. */
export const respondsWithNonJsonBody = (method, path) =>
  http[method](path, () =>
    HttpResponse.text('<html><body>gateway</body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }),
  )

/** Case ①: the happy path. */
export const respondsWith = (method, path, body, status = 200) =>
  http[method](path, () => HttpResponse.json(body, { status }))

/** A request that is accepted and then never answered -- the fourth state. */
export const neverResponds = (method, path) => http[method](path, () => new Promise(() => {}))
