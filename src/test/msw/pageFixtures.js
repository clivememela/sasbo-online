import { http, HttpResponse } from 'msw'

/**
 * The mount-time calls a page test has to answer before it can get to the
 * surface it is actually about.
 *
 * WHY THIS IS SHARED WHEN THE DEFAULT HANDLER SET IS NOT
 * The suite's rule is that every test declares the responses it depends on, so
 * that nothing passes because of something another file arranged. These are
 * the exception, and the reason is narrow: `Members` fires four requests on
 * mount and `CaptureMember` nine, none of which the tests are about. Answering
 * them individually in three files produced three copies of the same list that
 * drifted the moment a page gained a fetch -- with the symptom being an
 * unhandled-request error in a test about something else entirely.
 *
 * These are all EMPTY 200s. That matters: an empty collection is the shape
 * every screen must handle, and it cannot accidentally satisfy an assertion
 * about content. A test that needs real data still says so itself, with a
 * later `server.use(...)` that takes precedence.
 *
 * They are `http.get` only. A write is never incidental to rendering a page,
 * so a POST or PUT reaching this layer would be a request a test did not
 * expect -- and it should fail loudly, not be quietly answered.
 */
const empty = (path) => http.get(path, () => HttpResponse.json([]))

export const pageFixtures = [
  empty('*/api/members'),
  empty('*/api/members/structures/tree'),
  empty('*/api/members/userRoles'),
  empty('*/api/banks'),
  empty('*/api/banks/branches'),
  empty('*/api/job-grades'),
  empty('*/api/recruitment-channels'),
  empty('*/api/subscriptions'),
  empty('*/api/representatives'),
  empty('*/api/provinces'),
]
