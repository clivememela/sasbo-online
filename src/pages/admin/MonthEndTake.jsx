import { useRef, useState } from 'react';

import { PERMISSIONS } from '../../auth/permissions.js';
import { useAuth } from '../../auth/useAuth.js';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import Button from '../../components/form/Button.jsx';
import TextInput from '../../components/form/TextInput.jsx';
import Modal, { ModalClose, closeOn } from '../../components/overlay/Modal.jsx';
import { monthLabel } from '../../config/monthEnd.js';
import reportError from '../../lib/reportError.js';
import { takeMonth } from '../../services/monthEndService.js';
import { messageOf, writeMayHaveLanded } from '../../services/parseApiError.js';
import {
  TAKE_AGAIN_WAITS, TAKE_NEEDS_PERMISSION, TAKE_REASON_LIMIT, TAKE_REFUSAL, TAKE_WAITS, countsSaid, takeReasonSaid,
} from './monthEndRules.js';

/**
 * TAKING THE MONTH -- AND TAKING IT AGAIN, WITH A REASON (`contracts/monthend-api.md` R4).
 *
 *   who      held by `MONTH_END_TAKE`. Stephne, MEN-10: "The same position that took it" may take it again -- a
 *            position holds the permission, and the server says so where it refuses; nothing here guesses at it;
 *   again    names the take it replaces (`takeId`, the month's newest) and says WHY -- MEN-11: "This will help to
 *            understand why the file was replaced!" -- in at most 500 characters. Refused without one, before
 *            anything is asked; a reason the server will not keep is said at the field;
 *   after    the months are read again (`onTaken`), so the page says who took the month, when and why -- and what it
 *            counts (MEN-14: "After month end is done - all capturing and changes move to the next month").
 *
 * Someone who may not take the month sees the button shut, and the sentence that says why (`MonthEndTakeWhy`).
 */

/** The page's line that says why the take is shut -- what the button is described by. */
const WHY_ID = 'month-end-take-why';

const UNCONFIRMED = 'The take could not be confirmed. The month is read again: look at it before taking it again.';

/** The month after `month` -- `2026-09` is followed by October 2026. */
const nextMonthLabel = (month) => {
  const [year, number] = month.split('-').map(Number);
  return monthLabel(`${number === 12 ? year + 1 : year}-${String(number === 12 ? 1 : number + 1).padStart(2, '0')}`);
};

/** `Take September 2026`, or `Take August 2026 again`. */
const labelFor = (month, again) => (again ? `Take ${monthLabel(month)} again` : `Take ${monthLabel(month)}`);

/**
 * The take's button, in the month's criteria row, and its dialog. The dialog keeps the month and the take it was opened
 * for (`asking`): the months are read again after a refusal, and the page's month is unknown while they are, which must
 * neither close the dialog nor change what it takes.
 */
export default function MonthEndTake({ month, state, onTaken }) {
  const { can } = useAuth();
  const allowed = can(PERMISSIONS.MONTH_END_TAKE);
  const open = state?.state === 'OPEN';
  const taken = state?.state === 'TAKEN';
  const [asking, setAsking] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const field = useRef(null);

  const start = () => {
    setReason('');
    setReasonError(null);
    setNotice(null);
    setSaid('');
    setAsking({ month, again: taken, takeId: state?.takeId ?? null });
  };

  const again = Boolean(asking?.again);
  const take = async () => {
    const words = reason.trim();
    if (again && !words) {
      setReasonError('Say why the month is taken again: the reason is kept with the take.');
      return;
    }
    setBusy(true);
    setNotice(null);
    setReasonError(null);
    try {
      await takeMonth(asking.month, again ? { replaces: asking.takeId, reason: words } : {});
      setAsking(null);
      setSaid(`${monthLabel(asking.month)} is taken${again ? ' again' : ''}.`);
      onTaken();
    } catch (error) {
      reportError('MonthEndTake.take', error);
      const code = error?.body?.code;
      if (code === TAKE_REFUSAL.TAKE_REASON_REQUIRED || code === TAKE_REFUSAL.TAKE_REASON_INVALID) {
        setReasonError(error.message);
      } else if (code === TAKE_REFUSAL.MONTH_ALREADY_TAKEN || code === TAKE_REFUSAL.MONTH_TAKEN_SINCE) {
        // Somebody took it first: said in the server's words, and the page shows their take. Taken again since, a
        // second press -- once the person has read that -- replaces the newest take, the one the server names.
        setNotice({ message: error.message });
        const newest = Number(error.body?.details?.takeId);
        if (code === TAKE_REFUSAL.MONTH_TAKEN_SINCE && Number.isInteger(newest)) {
          setAsking((was) => was && { ...was, takeId: newest });
        }
        onTaken();
      } else if (writeMayHaveLanded(error) && !code) {
        setNotice({ message: UNCONFIRMED });
        onTaken();
      } else {
        setNotice({ message: messageOf(error) });
      }
    } finally {
      setBusy(false);
    }
  };

  const asked = asking?.month ?? month;
  const label = labelFor(asked, again);
  return (
    <>
      {(open || taken) && (
        <Button variant={open ? 'primary' : 'default'} disabled={!allowed} aria-describedby={allowed ? undefined : WHY_ID}
          onClick={start}>
          {labelFor(month, taken)}
        </Button>
      )}
      {said && <span role="status" className="sr-only">{said}</span>}
      <Modal
        open={Boolean(asking)}
        onOpenChange={closeOn(() => setAsking(null))}
        title={label}
        description={again
          ? `Its figures are replaced with ${monthLabel(asked)} as it stands now; the take before is kept for the record.`
          : 'Its figures are frozen for good. Everything captured or changed after this counts in '
            + `${asked ? nextMonthLabel(asked) : 'the next month'}.`}
        size="sm"
        busy={busy}
        initialFocusRef={again ? field : undefined}
        footer={(
          <>
            <ModalClose>Cancel</ModalClose>
            <Button variant="primary" onClick={take} loading={busy}>{label}</Button>
          </>
        )}
      >
        <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
        {again ? (
          <TextInput
            ref={field}
            label="Why it is taken again"
            multiline
            required
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonError(null);
            }}
            maxLength={TAKE_REASON_LIMIT}
            error={reasonError || undefined}
            hint={`${reason.length} of ${TAKE_REASON_LIMIT} characters. Kept with the take, and shown with the month.`}
            disabled={busy}
          />
        ) : (
          <p className="text-sm text-ink">Take it once its run is done: a month is taken on its last business day.</p>
        )}
      </Modal>
    </>
  );
}

/** The auth context's word for a caller who has signed in (contracts/signin.md) -- not a member's status. */
const SIGNED_IN = 'signed-in';

/** Why the take is shut, beneath the month -- for someone who has not signed in, or may not take the month. */
export function MonthEndTakeWhy({ state }) {
  const { status: signIn, can } = useAuth();
  const open = state?.state === 'OPEN';
  if ((!open && state?.state !== 'TAKEN') || can(PERMISSIONS.MONTH_END_TAKE)) return null;
  return (
    <p id={WHY_ID} className="mt-1 max-w-prose text-sm text-ink-muted">
      {signIn === SIGNED_IN ? TAKE_NEEDS_PERMISSION : open ? TAKE_WAITS : TAKE_AGAIN_WAITS}
    </p>
  );
}

/** Why a taken month was taken again, and what a month counts -- each where the server says so, beneath the month. */
export function MonthEndTakeRecord({ months, state }) {
  const reason = takeReasonSaid(state ?? undefined);
  const counts = months && state ? countsSaid(months, state) : '';
  return (
    <>
      {reason && <p className="mt-1 max-w-prose text-sm text-ink" data-take-reason="">{reason}</p>}
      {counts && <p className="mt-1 max-w-prose text-sm text-ink-muted" data-counts="">{counts}</p>}
    </>
  );
}
