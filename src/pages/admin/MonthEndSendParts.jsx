import { Link } from 'react-router-dom';

import Criteria from '../../components/common/Criteria.jsx';
import DataState from '../../components/common/DataState.jsx';
import { noticeTone } from '../../components/common/DialogNotice.jsx';
import Sheet from '../../components/common/Sheet.jsx';
import SelectInput from '../../components/form/SelectInput.jsx';
import { cn } from '../../lib/utils.js';
import { MONTH_CRITERION } from './monthEndRules.js';

/**
 * The parts the sending screens share -- the regions' packs, the banks' and providers' files, what was sent -- so each
 * says the same thing the same way, and their chunks share one copy.
 */

/** The month a sending screen works on, chosen once at the top: the months taken, newest first (`useTakenMonth`). */
export function TakenMonthCriteria({ taken }) {
  return (
    <Criteria className="mt-6" label="The month">
      <SelectInput
        className={MONTH_CRITERION}
        label="Month"
        value={taken.month}
        options={taken.choices}
        loading={taken.pending}
        loadError={taken.failure}
        onRetryLoad={taken.retry}
        onChange={taken.choose}
        emptyLabel="No month has been taken yet"
      />
    </Criteria>
  );
}

/**
 * A sending screen with nothing to draw yet -- loading, failed or empty -- as one sheet and one sentence: never a blank
 * page, and a failure never as an empty list.
 */
export function SendState({ state, error = null, onRetry, title, message, action }) {
  return (
    <Sheet className="mt-6" data-send-state={state}>
      <DataState state={state} layout="row" error={state === 'error' ? error : null} onRetry={onRetry} title={title}
        message={message} action={action} />
    </Sheet>
  );
}

/** What came of one action, said where it was done: a success as a status, anything else as an alert. */
export function ActionNotice({ notice, className }) {
  if (!notice?.message) return null;
  return (
    <p role={notice.tone === 'ok' ? 'status' : 'alert'}
      className={cn('rounded-lg border px-3 py-2 text-sm', noticeTone(notice.tone), className)}>
      {notice.message}
    </p>
  );
}

/** A link in a sentence: the brand's ink, underlined, and the ring when it has the keyboard. */
export function InTextLink({ to, children }) {
  return (
    <Link to={to} className="rounded-sm font-medium text-brand-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring">
      {children}
    </Link>
  );
}

/** The empty state of a screen that works on a taken month, where no month has been taken at all: `why` is a sentence. */
export function NoMonthTaken({ why }) {
  return (
    <SendState
      state="empty"
      title="No month has been taken yet."
      message={`${why} Take the month on the Month end page first.`}
      action={<InTextLink to="/admin/monthly-menu">Go to Month end</InTextLink>}
    />
  );
}
