import { useEffect, useState } from 'react';
import { CalendarClock, FileLock2, History, Send } from 'lucide-react';

import RequirePermission from '../../auth/RequirePermission.jsx';
import { PERMISSIONS } from '../../auth/permissions.js';
import { NavigationList } from '../../components/common/NavigationCard.jsx';
import Sheet from '../../components/common/Sheet.jsx';
import { dayLabel } from '../../config/monthEnd.js';
import reportError from '../../lib/reportError.js';
import { getLapsedSuspensions } from '../../services/monthEndService.js';
import { messageOf } from '../../services/parseApiError.js';
import { SUSPENDED_HREF, failureOf, lapsedSaid } from './monthEndRules.js';
import { InTextLink } from './MonthEndSendParts.jsx';

/**
 * THE MONTH END PAGE'S OCTOBER SECTIONS -- what the month is sent as, and the suspensions whose three months are up.
 *
 *   Sending the month   the regions' packs, the banks' and providers' files, and what was sent: each its own screen,
 *                       held by `MONTH_END_SEND`, opened for the month chosen where it is a taken one -- a pack is made
 *                       from a take, never from the open month.
 *   lapsed suspensions  Stephne, MEN-18: "The system should also remind us when the suspension period for a member have
 *                       lapsed, so we can delete. (suspensions is only for 3months)". The first few, and how many,
 *                       from the lapsed list's own count (R5) -- asked only of someone who may see members and month
 *                       end both (`MEMBERS_VIEW` and `MONTH_END_VIEW`: organisers do not see suspensions, DOD-14).
 */

/** How many lapsed suspensions the page names; the rest are on the suspended members' screen. */
const REMINDER_ROWS = 5;
const NOT_AVAILABLE = 'The lapsed suspensions are not available from this server yet.';

const lapsedPageOf = (answer) =>
  (answer && typeof answer === 'object' && Array.isArray(answer.items) && Number.isInteger(answer.total) ? answer : null);

function LapsedReminder() {
  const [read, setRead] = useState({ done: false });
  useEffect(() => {
    let current = true;
    getLapsedSuspensions({ page: 0, size: REMINDER_ROWS })
      .then((body) => {
        const answer = lapsedPageOf(body);
        if (current) setRead({ done: true, answer, failure: answer ? null : failureOf(null, NOT_AVAILABLE) });
      })
      .catch((error) => {
        reportError('MonthEndSending.lapsed', error);
        if (current) setRead({ done: true, answer: null, failure: failureOf(error, NOT_AVAILABLE) });
      });
    return () => {
      current = false;
    };
  }, []);

  if (!read.done) return <p className="mt-3 text-sm text-ink-muted" role="status">Reading the lapsed suspensions…</p>;
  if (!read.answer) return <p className="mt-3 text-sm text-ink-muted" role="alert">{messageOf(read.failure)}</p>;
  const { total, items } = read.answer;
  return (
    <Sheet className="mt-3 max-w-4xl gap-2 px-5 py-4" data-lapsed={total}>
      <p className="text-base text-ink">{lapsedSaid(total)}</p>
      {items.length > 0 && (
        <ul className="grid gap-1 text-sm text-ink-muted" aria-label="Suspensions that have lapsed">
          {items.map((member) => (
            <li key={member.memberId}>
              {[member.membershipNumber, member.name, member.bank,
                member.lapsesOn ? `lapsed on ${dayLabel(member.lapsesOn)}` : null].filter(Boolean).join(' · ')}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-ink-muted">
        {total > items.length && `${total - items.length} more. `}
        <InTextLink to={`${SUSPENDED_HREF}?lapsed=1`}>See every lapsed suspension</InTextLink>
        {' · '}
        <InTextLink to={SUSPENDED_HREF}>See every suspended member</InTextLink>
      </p>
    </Sheet>
  );
}

export default function MonthEndSending({ month, taken }) {
  // A pack or a file is made from a taken month: the open month opens each screen on the newest taken instead.
  const query = taken && month ? `?month=${encodeURIComponent(month)}` : '';
  return (
    <>
      <h2 className="mt-8 text-lg font-semibold text-ink">Sending the month</h2>
      <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
        What goes out once a month is taken: each region’s pack to its Regional Secretary, each bank’s list, and the
        providers’ lists, every file to a bank or a provider password-protected.
      </p>
      <NavigationList
        className="mt-3"
        cards={[
          {
            title: 'The regions’ packs',
            desc: 'Each region’s figures and lists, as PDF or Excel: download them, or have the system e-mail them',
            href: `/admin/monthly-menu/region-packs${query}`,
            icon: Send,
            permission: PERMISSIONS.MONTH_END_SEND,
          },
          {
            title: 'Files for the banks and providers',
            desc: 'Each bank’s list and the providers’ lists, with a password given once',
            href: `/admin/monthly-menu/files${query}`,
            icon: FileLock2,
            permission: PERMISSIONS.MONTH_END_SEND,
          },
          {
            title: 'What was sent',
            desc: 'Every download, e-mail and SFTP upload: to whom, by whom and when',
            href: `/admin/monthly-menu/sent${query}`,
            icon: History,
            permission: PERMISSIONS.MONTH_END_SEND,
          },
        ]}
      />

      <h2 className="mt-8 flex items-center gap-2 text-lg font-semibold text-ink">
        <CalendarClock aria-hidden="true" className="size-5 shrink-0 text-brand" />
        Suspensions that have lapsed
      </h2>
      <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
        A suspension lasts three months from the day it began; once they are up, the member can be deleted.
      </p>
      {/* Both, before anything is asked: the list names members, and organisers do not see suspensions. */}
      <RequirePermission permission={PERMISSIONS.MEMBERS_VIEW}>
        <RequirePermission permission={PERMISSIONS.MONTH_END_VIEW}>
          <LapsedReminder />
        </RequirePermission>
      </RequirePermission>
    </>
  );
}
