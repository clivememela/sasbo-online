/**
 * The defects this suite asserts deliberately, and does not fix.
 *
 * WHY A SKIPPED TEST IS EVER ACCEPTABLE HERE
 * There is no flaky list and nothing is skipped for unreliability. A skipped
 * test in this repository means exactly one thing: a test written to the
 * CORRECT behaviour, against a defect that is real, left visibly failing by
 * design. Fixing the defect is a production change to someone else's
 * repository, and this suite's job is to make it visible rather than to repair
 * it while nobody is looking.
 *
 * EVERY ROW CARRIES TWO TESTS, NOT ONE  <-- the client goes further than the server
 * The server half of this arc landed twelve rows, each with a skipped test.
 * A skipped test NEVER RUNS, so nothing in the suite notices the day a defect
 * is fixed -- the test stays skipped, the register stays stale, and the
 * repair is invisible. Two of the server's twelve rows carry a hand-written
 * "still reproduces" pin; the other ten do not.
 *
 * Here that pin is a PROPERTY OF THE REGISTER rather than a habit:
 *
 *   disabled(row)  the standard-facing test. Skipped. Says what SHOULD happen.
 *   pin(row)       a live test that RUNS on every suite run and asserts the
 *                  defect's CURRENT behaviour. The day someone fixes the
 *                  defect, the pin goes red and names the row -- which is the
 *                  signal to delete both tests and close the register row.
 *
 * `defectPopulation.test.js` asserts the correspondence in both directions:
 * every skipped test cites a row here, every row here has both a skipped test
 * and a live pin, and no test anywhere is skipped without citing a row.
 *
 * Row identifiers match the arc's defect register exactly. They are the only
 * thing that must never drift.
 *
 * 🔴 THE IDENTIFIERS ARE A SHARED NAMESPACE WITH NO ALLOCATOR, AND THIS FILE
 * HOLDS ONLY A SUBSET OF IT. Rows are numbered once, in the arc's register,
 * across all three repositories. This file carries the ones the browser suite
 * can assert -- never all of them, and never a number invented here.
 *
 * P4 got this wrong and it is worth the paragraph. It needed rows for the two
 * missing endpoints, did not find them in THIS file, and concluded they were
 * new -- inventing A21 and A22. Both already existed twice over: A1 and A2 had
 * predicted exactly these two endpoints and even named P4 as the phase that
 * would confirm them, while A21 and A22 were P2's rows for something else
 * entirely. So the work confirmed a standing prediction while citing two
 * unrelated defects, and a reader looking up A21 would have found a null
 * `jobGradeId` and concluded the note was wrong. (B2, the committed key, was
 * right only because the plan happened to name the number.)
 *
 * ⇒ BEFORE ADDING A ROW: search the register, not this file. Absence here means
 * the browser has no test for it yet, which is the common case and is not
 * evidence the defect is unknown.
 *
 *     grep -nE '^\| \*\*[A-F][0-9]+\*\*' <the register>
 */

const define = (row, headline, detail) => ({ row, headline, detail })

export const DEFECTS = {
  A6: define(
    'A6',
    'the payment-type branch is dead code',
    'usePaymentTypeValidation compares the payment type against "Payroll Deduction". ' +
      'PAYMENT_TYPE_OPTIONS cannot produce that string -- it offers "Payroll". The ' +
      'branch can therefore never be true, so isPayrollDeduction is permanently false ' +
      'and every field it disables is permanently enabled. The server still carries a ' +
      'PAYROLL_DEDUCTION shim in PaymentType.fromString, which is what proves this is ' +
      'drift between the two halves rather than a typo in one of them.',
  ),

  A7: define(
    'A7',
    'the passport date-of-birth rule never fires',
    'CaptureMember branches on identityType === "Passport" while its own dropdown ' +
      'offers "Passport Number". The same shape as A6, on a different field: neither ' +
      'side is wrong alone, they simply do not agree, and the consequence is a rule ' +
      'that has never once run in production. IT IS IN TWO SCREENS, not one: this row ' +
      'named only CaptureMember until P4 scanned for the class rather than the ' +
      'instance and found the same comparison in Members.jsx (validation and the ' +
      'date-of-birth field). Corrected 2026-09-05 -- an under-reported row is how a ' +
      'fix gets called complete while half the defect is still shipping.',
  ),

  A9: define(
    'A9',
    'the client re-implements a rule the server publishes, and they disagree',
    'PaymentType.requiresBankAccount() is the server\'s authority and it is exposed at ' +
      'GET /api/members/metadata/payment-types. The client never calls it: ' +
      'usePaymentTypeValidation hardcodes bankAccountFieldDisabled: isPayrollDeduction. ' +
      'This is MASKED BY A6 today -- the branch is dead, so the rule never runs. Fixing ' +
      'A6 switches on code nothing has ever tested, which is the dangerous shape: a ' +
      'repair that activates untested behaviour.',
  ),

  A11: define(
    'A11',
    'no error boundary -- one render error blanks the whole application',
    'There is no ErrorBoundary, componentDidCatch or errorElement anywhere in ' +
      'client/src, across every route in App.jsx. The three-state rule covers a failed ' +
      'FETCH; nothing covers a failed RENDER. A single throwing component takes the ' +
      'entire shell with it and the user gets a white screen with no message and no ' +
      'way back.',
  ),

// A12 is deliberately NOT a row here, and that is a CORRECTION to the register
// rather than an omission.
//
// A12 reads: "four of nine client services do not check response.ok on every
// call, and two have no catch at all... so .json() succeeds and the component
// receives { status: 500, error: ... } AS DATA."
//
// The first half is true as a source observation. The SECOND half -- the
// consequence, which is what makes it a defect -- does not reproduce.
// Measured 2026-09-05 by executing all 31 methods under a 500 carrying the
// envelope: recruiterService, recruitmentChannelService and
// subscriptionsService all REJECT, because their shared `handleResponse` does
// check `r.ok`. Having no `catch` is harmless on its own; a rejection simply
// propagates to the caller, which is the correct behaviour anyway.
//
// The methods that really do hand a failure back as data are three, and each
// has its own row with its own evidence: A13, A25 and A26. Keeping A12 as a
// fourth, vaguer row would double-count them and leave a claim in the register
// that an executed test contradicts.
//
// What stands from A12 is recorded where it is provable: the CASE 2 assertion
// in services.errorContract.test.js runs against every method, so if a service
// ever does start resolving an error envelope, it reddens there and names the
// method.

  A13: define(
    'A13',
    'bankService turns a failed request into an empty list',
    'getBankNames catches and returns [] after logging; getBankListing swallows the ' +
      'inner /api/banks failure with .catch(() => []). "There are no banks" and "the ' +
      'backend is down" become the same screen. bank is the reference domain for both ' +
      'the server coverage phase and the e2e reference journey, so this is the pattern ' +
      'every other domain is told to copy.',
  ),

  A14: define(
    'A14',
    'no request timeout anywhere -- a hung backend spins forever',
    'Zero AbortController, zero signal:, zero timeout in src/services/. The three-state ' +
      'rule covers loading, empty and failed. A request that never resolves is none of ' +
      'them: it renders the loading state indefinitely, which an administrator reads as ' +
      '"the system is slow" rather than "it is down".',
  ),

  A23: define(
    'A23',
    'subscriptionsService.create writes to the wrong endpoint entirely',
    'subscriptionsService.create POSTs to /api/recruitment-channels, not ' +
      '/api/subscriptions. Creating a subscription silently creates a RECRUITMENT ' +
      'CHANNEL instead. Every other method on the module addresses /api/subscriptions ' +
      'correctly, so the request succeeds, returns 2xx, and the caller has no way to ' +
      'tell. Found 2026-09-04 by enumerating each service method against the endpoint ' +
      'it addresses.',
  ),

  A25: define(
    'A25',
    'jobGradeService.getByBank can never report a failure',
    'It was written with a deliberate graceful fallback to the static ' +
      'JOB_GRADE_OPTIONS when the API is unavailable. JOB_GRADE_OPTIONS was later ' +
      'EMPTIED -- grades now come from the backend per bank -- so the fallback silently ' +
      'became a swallow: every failure resolves as [], which the UI renders as "this ' +
      'bank has no job grades". Neither change was wrong on its own. The defect is what ' +
      'they became together, which is why it survived both reviews. Measured 2026-09-04: ' +
      'the method resolves [] on a 500, on a network failure and on a non-JSON body.',
  ),

  A26: define(
    'A26',
    'bankService.updateBank echoes the caller input back as if the server had saved it',
    'On a 2xx whose body is not JSON -- a proxy or gateway page, typically -- updateBank ' +
      'falls through to "return { ...data, id }": the object the CALLER just passed in, ' +
      'handed back as the saved record. The tolerance is there for a legitimate empty ' +
      '200 body, but it does not distinguish an empty body from an unparseable one, so ' +
      'the screen shows the edit as confirmed when nothing was written. Measured ' +
      '2026-09-04.',
  ),

  A27: define(
    'A27',
    'the Members list has no loading state and no error state -- only "no members"',
    'Its mount effect is four fetches whose failure handling is console.error and ' +
      'nothing else. membersList stays [], so a backend that is DOWN renders the empty ' +
      'state: "No Sasbo members match the specified query definitions." An administrator ' +
      'reads that as a fact about the union rather than a fact about the server, and ' +
      'there is no retry affordance because there is nothing that knows a request ' +
      'failed. There is no loading state either -- the page renders its empty table ' +
      'immediately on mount, so the first thing every user sees is "no members", every ' +
      'time. This is the three-state rule failing at the layer the rule is written ' +
      'about, and it is the client counterpart of the service-layer swallows A12/A13. ' +
      'Measured 2026-09-05.',
  ),

  A28: define(
    'A28',
    'the Members "Identity Type" filter is a select with no accessible name',
    'axe rates it CRITICAL. Every neighbouring filter is a TextInput or a ' +
      'SearchableSelect, and both of those set aria-label on the control. This one was ' +
      'hand-rolled as a plain div with a <span>Identity Type</span> above a bare ' +
      '<select> -- a span is not a label, so nothing associates the two ' +
      'programmatically. Sighted users see a heading; a screen-reader user reaches a ' +
      'dropdown announced only as "combo box", with no way to know what it filters. The ' +
      'fix is one aria-label, or using the SelectInput component the codebase already ' +
      'has. Found 2026-09-05 by the a11y gate on its first run.',
  ),

  B6: define(
    'B6',
    'apiUrl()\'s SSRF guard is bypassed by a backslash',
    'api.js strips a leading protocol and leading FORWARD slashes, with a comment ' +
      'saying it does so to prevent open redirect and SSRF. It does not strip ' +
      'BACKSLASHES -- and every URL parser that implements the WHATWG standard treats ' +
      'a backslash as a slash for http/https. So "\\\\\\\\evil.example/steal" survives the ' +
      'guard as "/\\\\\\\\evil.example/steal" and the browser resolves that to ' +
      'http://evil.example/steal: a different origin, reached by the one function ' +
      'written to make that impossible. "/\\\\evil.example/x" and "/\\\\/evil.example/x" ' +
      'do the same. Measured 2026-09-04 against Node\'s WHATWG URL parser, which is the ' +
      'same algorithm browsers use. The fix is one character in the existing character ' +
      'class. Exploitability depends on whether any caller passes a path it did not ' +
      'construct itself -- but a guard is not sound because its callers happen to be ' +
      'safe today, and this one is asserted, not assumed.',
  ),

  A24: define(
    'A24',
    'error detail does not survive the service layer',
    'Every service throws new Error(`HTTP ${status}`), discarding validationErrors -- ' +
      'the one part of the Spring envelope that is stable and field-addressable. So a ' +
      'form cannot show "idNumber: must be 13 digits" even though the server sent ' +
      'exactly that, and the user is told only that something went wrong. The status ' +
      'code is discarded with it, so a caller cannot distinguish a 400 it caused from ' +
      'a 500 it did not.',
  ),

  A1: define(
    'A1',
    'the province -> district -> area cascade is dead',
    'locationService.getDistricts requests GET /api/districts?provinceId=... and no ' +
      'controller maps that path -- confirmed against the generated api-surface.txt, ' +
      'which is read out of the live routing table rather than out of anyone remembering. ' +
      'The cascade therefore cannot advance past its first step, and it fails silently: ' +
      'the request errors and the district list simply stays empty with nothing shown ' +
      'to the user. The register predicted this and named P4 as the phase that would ' +
      'confirm it; the artifact is that confirmation.',
  ),

  A2: define(
    'A2',
    'the browser calls /api/debounce, an endpoint that has never existed',
    'debounceService requests GET /api/debounce?fn=...&delay=... and no controller ' +
      'maps it. Debouncing is a browser concern and there is no plausible server ' +
      'implementation, so this reads as a misunderstanding rather than a missing ' +
      'feature -- the repair is almost certainly to delete the service. Recorded ' +
      'rather than deleted because this arc asserts defects and does not fix them.',
  ),

  B2: define(
    'B2',
    'a live Google API key is committed to this repository',
    'client/.env is TRACKED and holds a real Google API key. The file is listed in ' +
      '.gitignore, which does nothing: git ignores .gitignore for a path it already ' +
      'tracks. The key is therefore on every clone, every fork and every backup, and ' +
      'deleting the file would not remove it from history -- only rotating the key ' +
      'revokes it. The committed-secret guard names this file on an allowlist rather ' +
      'than excluding it, so it stays visible in the output of every run.',
  ),
}

export const DEFECT_ROWS = Object.keys(DEFECTS)

/**
 * The title of the SKIPPED, standard-facing test for a row.
 * Used as `it.skip(disabled(DEFECTS.A13), ...)`.
 */
export const disabled = (d, what) =>
  `KNOWN DEFECT ${d.row} -- ${what ?? d.headline}. Written to the correct behaviour and ` +
  `left visibly failing by design. ${d.detail}`

/**
 * The title of the LIVE pin for a row -- the test that runs and asserts the
 * defect still reproduces.
 * Used as `it(pin(DEFECTS.A13), ...)`.
 */
export const pin = (d, what) =>
  `STILL REPRODUCES ${d.row} -- ${what ?? d.headline}. This test asserts the CURRENT, ` +
  `WRONG behaviour on purpose. If it is red, the defect has been FIXED: delete this pin ` +
  `and un-skip the ${d.row} test beside it, then close the register row.`
