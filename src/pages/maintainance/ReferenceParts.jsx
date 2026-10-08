import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../../auth/useAuth.js';
import { PERMISSIONS } from '../../auth/permissions.js';

/** The auth context's word for a caller who has signed in (contracts/signin.md). */
const SIGNED_IN = 'signed-in';

/**
 * Whether this caller may change SASBO's lists (REFERENCE_MAINTAIN). The lists month end's rules keep are READ openly --
 * Change status offers the reasons, and the figures group by tier, for everybody -- so the screen shows to anyone, and
 * only its controls are shut, each described by {@link MaintainWhy}.
 */
export function useMayMaintain() {
  const { can } = useAuth();
  return can(PERMISSIONS.REFERENCE_MAINTAIN);
}

/**
 * Why a list's controls are shut, beneath the page's title -- what each shut control is described by (`id`). Nothing
 * for a caller who may change the list. `what` names the list: "the reasons", "the tiers".
 */
export function MaintainWhy({ id, what }) {
  const { status, can } = useAuth();
  const location = useLocation();
  if (can(PERMISSIONS.REFERENCE_MAINTAIN)) return null;
  const next = encodeURIComponent(`${location.pathname}${location.search}`);
  return (
    <p id={id} className="mt-2 max-w-prose text-sm text-ink-muted" data-maintain-why="">
      {status === SIGNED_IN ? (
        `You need permission to maintain lists to change ${what}. Ask your administrator if you should have it.`
      ) : (
        <>
          {`Changing ${what} is for an administrator who has signed in with permission to maintain lists. `}
          <Link className="font-medium text-brand-ink underline" to={`/login?next=${next}`}>Sign in</Link>
        </>
      )}
    </p>
  );
}
