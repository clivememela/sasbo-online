import { useCallback, useEffect, useState } from 'react';

import reportError from '../lib/reportError';
import { memberService } from '../services/memberService';
import { NOT_AVAILABLE, memberWorkplace, notHere } from '../utils/workplaces';

/**
 * THE MEMBER'S WORKPLACE ON THE RECORD -- its lineage, which only the answer for ONE member carries (`01.3`).
 *
 * The register's list gives each member three scalars and no more -- `workplaceId`, `workplaceName`,
 * `workplaceRaNumber` (MR-PERF-9: a lineage per row would make the listing a join of seventeen tables) -- so the
 * record reads `GET /api/members/{id}` for the area and the committee, and only while its Employment tab is open.
 *
 *   no `workplaceId` key at all  -- a server built before month end says nothing of workplaces: `{ why }`, and
 *                                   nothing is asked of it;
 *   `workplaceId: null`          -- `{ none: true }`: *no workplace on record*, a value a member may honestly have
 *                                   (every member, where the deployment's switch serves no workplaces, MD62);
 *   an id                        -- asked for: `{ loading }`, then `{ workplace }` · `{ none }` · `{ why }` (a 404,
 *                                   or an answer of the wrong shape) · `{ failure, retry }`.
 *
 * An answer counts only for the member, workplace and attempt it was asked for; one that lands after the record moved
 * on is dropped.
 */
export default function useMemberWorkplace(member, open) {
  const id = member?.id;
  const workplaceId = member?.workplaceId;
  const said = member && 'workplaceId' in member;
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState(null);
  const asked = open && said && workplaceId != null ? `${id}:${workplaceId}:${attempt}` : null;

  useEffect(() => {
    if (!asked) return undefined;
    let left = false;
    memberService.getMemberById(id)
      .then((one) => {
        if (!left) setAnswer({ asked, ...memberWorkplace(one) });
      })
      .catch((failure) => {
        if (left) return;
        if (!notHere(failure)) reportError('workplaces.member', failure);
        setAnswer({ asked, ...(notHere(failure) ? { why: NOT_AVAILABLE.NOT_HERE } : { failure }) });
      });
    return () => {
      left = true;
    };
  }, [asked, id]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  if (!member) return null;
  if (!said) return { why: NOT_AVAILABLE.NOT_HERE };
  if (workplaceId == null) return { none: true };
  return answer?.asked === asked ? { ...answer, retry } : { loading: true };
}
