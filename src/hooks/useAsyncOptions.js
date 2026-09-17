import { useCallback, useEffect, useRef, useState } from 'react';

import { ERROR_KINDS } from '../services/parseApiError.js';

/**
 * OPTIONS THAT ARRIVE OUT OF ORDER MUST NOT OVERWRITE NEWER ONES. `03.2b`, R-ROB-G.
 *
 * 🔴 **THE FAILURE THIS EXISTS FOR, and it is silent.** Type "Nedb" into a bank field and
 * two requests are in flight — one for `Ned`, one for `Nedb`. If the slower `Ned` answer
 * lands second, the list the user is looking at is the answer to a query they have already
 * moved past. Nothing errors. The options are real options. They are just **wrong**, and
 * the only symptom is a user who says the dropdown "flickers" or "shows the wrong thing
 * sometimes".
 *
 * Every list screen in this application fetches on mount and several fetch on typing, and
 * not one of them sequences. This is the fix as a hook rather than as a rule, because a
 * rule is something 27 rebuilt routes each have to remember (contract ⑮).
 *
 * 🔑 **A SEQUENCE NUMBER, NOT A CANCELLATION.** `AbortController` cancels the *request*,
 * which is worth doing and is not sufficient: an already-resolved promise still runs its
 * `.then`. So each call takes a ticket, and a result is applied only if its ticket is
 * still the newest. Both are used — abort to stop the network, the ticket to stop the
 * write.
 *
 * ⚠️ **AN ABORT IS NOT A FAILURE.** A superseded request is dropped silently and the state
 * is left exactly as it was — no error, no empty list, no spinner stuck on. That is the
 * `kind` vocabulary `06.1a` fixes (`http · network · nonJson · timeout · abort`), agreed
 * with the automation arc: *an abort is NOT a failure, a timeout IS one and offers retry*.
 * Getting this wrong renders a cancelled keystroke as "we could not load the banks".
 *
 * 🔴 **AND IT DISTINGUISHES FOUR STATES, NOT THREE** (conventions §8). `loading`, `error`,
 * `empty` and loaded are separate: a failed fetch that renders as an empty list is A27, and
 * A27 is the defect this arc counts by the class rather than by the row.
 *
 * @param fetcher   `(signal) => Promise<unknown[]>`. Receives an AbortSignal.
 * @param deps      re-fetch when these change, exactly like an effect's dependency list.
 * @param options   `{ enabled }` — skip entirely while false (a dependent field with no parent yet).
 */
export default function useAsyncOptions(fetcher, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ options: [], loading: enabled, error: null });

  const ticketRef = useRef(0);
  const fetcherRef = useRef(fetcher);

  // The fetcher is almost always an inline arrow, so it is a new function every render.
  // Keeping it in a ref means the fetch effect below depends on `deps` — the caller's
  // actual inputs — rather than re-firing on every parent render, which would be an
  // infinite request loop that looks exactly like a slow backend.
  //
  // ⚠️ ASSIGNED IN AN EFFECT, NOT DURING RENDER. Writing a ref while rendering is a
  // violation the `react-hooks` rules catch as an error, and it is not pedantry: under
  // concurrent rendering a render can be thrown away, and the ref would keep the
  // discarded render's closure. This effect is declared BEFORE the fetch effect, so it
  // runs first on every commit and the fetcher is always current by the time it is called.
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(() => {
    if (!enabled) {
      setState({ options: [], loading: false, error: null });
      return undefined;
    }

    const ticket = (ticketRef.current += 1);
    const controller = typeof AbortController === 'undefined' ? null : new AbortController();

    setState((current) => ({ ...current, loading: true, error: null }));

    // 🔑 CALLED SYNCHRONOUSLY, not from a microtask. Deferring it by even one tick delays
    // every request by a render, and — worse for a test — makes "was it called?" depend on
    // when you look. The try/catch is what a `Promise.resolve().then(fetch)` was buying:
    // a fetcher that throws before it returns a promise becomes the error state rather
    // than an unhandled exception inside an effect.
    let pending;
    try {
      pending = Promise.resolve(fetcherRef.current(controller?.signal));
    } catch (error) {
      setState({ options: [], loading: false, error });
      return () => controller?.abort();
    }

    pending
      .then((result) => {
        // 🔑 THE ONE LINE THE HOOK EXISTS FOR. A stale answer is discarded, not applied.
        if (ticket !== ticketRef.current) return;
        setState({ options: Array.isArray(result) ? result : [], loading: false, error: null });
      })
      .catch((error) => {
        if (ticket !== ticketRef.current) return;
        /*
         * An abort is the caller's own doing. Reporting it as a failure would put an
         * error under a field the user is still happily typing into.
         *
         * 🔴 THIS TESTED `error.name === 'AbortError'` UNTIL `06.1b`, AND BY THEN THAT
         * COULD NEVER BE TRUE. `06.1a` put every service on `requestJson`, which rejects
         * with `Object.assign(new Error(message), { kind, ... })` -- an ordinary `Error`,
         * whose `name` is `"Error"`. The DOM's `AbortError` never reaches a consumer any
         * more; the helper translates it into `kind: 'abort'` at the boundary, which is
         * exactly what EH-D3 asks for ("no consumer tests for AbortError").
         *
         * ⚠️ AND THE TEST DID NOT CATCH IT, which is the part worth remembering. It built
         * its own rejection with `error.name = 'AbortError'` -- a shape no service in this
         * application produces -- so it went on passing while the branch it guarded had
         * become dead code. A test that constructs its subject's input from the old
         * contract cannot notice the contract changing. It now rejects with the shape
         * `parseApiError` actually builds.
         *
         * The consequence in the running app was not cosmetic: every superseded keystroke
         * in a searchable field would have rendered "we could not load the banks" under a
         * field the user was still typing into, and then cleared the options.
         */
        if (error?.kind === ERROR_KINDS.ABORT) return;
        setState({ options: [], loading: false, error });
      });

    return () => controller?.abort();
  }, [enabled]);

  useEffect(() => {
    const cancel = run();
    return cancel;
    // `run` is intentionally absent: it closes over nothing but `enabled`, and the
    // caller's `deps` are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const refetch = useCallback(() => {
    run();
  }, [run]);

  return {
    options: state.options,
    loading: state.loading,
    error: state.error,
    /** The fourth state, named rather than inferred at each call site. */
    isEmpty: !state.loading && !state.error && state.options.length === 0,
    refetch,
  };
}
