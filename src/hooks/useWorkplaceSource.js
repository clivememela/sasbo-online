import { useCallback, useEffect, useState } from 'react';

import reportError from '../lib/reportError';
import { referenceService } from '../services/referenceService';
import { NOT_AVAILABLE, notHere, workplaceSource } from '../utils/workplaces';

/**
 * WHAT THE WORKPLACE CONTROL CAN OFFER -- SASBO's employers, and whether any workplace is on record here (`01.3`).
 *
 * 🔑 ASKED FOR WHEN THE CONTROL IS FIRST OPENED, AND KEPT FOR THE VISIT (MD69). The PAGE calls this, with `open` true
 * while its Employment tab shows the control, so the answer outlives the tab: leaving it and coming back asks nothing
 * again. Nothing is asked at first paint -- capture opens on Personal Information.
 *
 * Two reads, settled together, because the control needs both: the status read says whether a workplace is on record
 * HERE (every hosted stack answers NOT_LOADED until SASBO agrees, MD45) and where the workplaces were read from; the
 * employers are the first thing chosen. Asking for the status first means the control says *not available* when it
 * opens, rather than after someone has chosen an employer and typed.
 *
 * FOUR STATES, and none of them is an empty control: `loading` · `ready` · `unavailable` (with `why`: the server's
 * reason, a 404 from a server built before these routes, or an answer of the wrong shape) · `failed` (with `error`,
 * and `retry` -- a 5xx, a timeout or no connection is never said as "none").
 *
 * @param {boolean} open  whether the control is on screen
 * @returns {{ state: 'idle'|'loading'|'ready'|'unavailable'|'failed', retry: () => void }} and, by state, `employers`,
 *   `employersFrom`, `workplacesFrom`, `why` or `error`
 */
export default function useWorkplaceSource(open) {
  // Latched during render (React's documented adjustment), never in an effect: once opened, asked for.
  const [asked, setAsked] = useState(false);
  if (open && !asked) setAsked(true);
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    if (!asked) return undefined;
    let left = false;
    Promise.allSettled([referenceService.getStatus(), referenceService.getEmployers()]).then(([status, employers]) => {
      if (left) return;
      const refused = [status, employers].filter((read) => read.status === 'rejected').map((read) => read.reason);
      // A 404 says the route is not on this server yet: not available. Anything else that failed is a FAILURE -- it
      // decides, so a dead server is never said as "not here".
      const failure = refused.find((reason) => !notHere(reason));
      if (failure) reportError('workplaces.source', failure);
      setAnswer({
        attempt,
        ...(failure ? { state: 'failed', error: failure }
          : refused.length ? { state: 'unavailable', why: NOT_AVAILABLE.NOT_HERE }
            : workplaceSource(status.value, employers.value)),
      });
    });
    return () => {
      left = true;
    };
  }, [asked, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  // An answer counts only for the attempt it answers, so a retry reads as loading until its own answer lands.
  const current = answer?.attempt === attempt ? answer : null;
  return { ...current, state: asked ? (current?.state ?? 'loading') : 'idle', retry };
}
