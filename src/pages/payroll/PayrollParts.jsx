import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import RequirePermission from '../../auth/RequirePermission.jsx';
import { PERMISSIONS } from '../../auth/permissions.js';
import { useAuth } from '../../auth/useAuth.js';
import Button from '../../components/form/Button.jsx';
import reportError from '../../lib/reportError.js';
import saveFile from '../../lib/saveFile.js';
import { cn } from '../../lib/utils.js';
import { messageOf } from '../../services/parseApiError.js';
import { TONE_CLASSES } from './payrollRules.js';

/** A link inside a sentence, as month end's screens draw one. */
export const IN_TEXT = 'rounded-sm font-medium text-brand-ink underline underline-offset-2 '
  + 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring';

/** A section's heading inside a page, one step under the page's own. */
export const SECTION_HEADING = 'text-lg font-semibold text-ink';

/**
 * What the signed-in user may do here. Every read needs `PAYROLL_VIEW` or `PAYROLL_PROCESS`, every write
 * `PAYROLL_PROCESS` (contract); no organiser holds either, so organisers never see a discrepancy (PAY-33).
 */
export function usePayrollAccess() {
  const { can } = useAuth();
  const canProcess = can(PERMISSIONS.PAYROLL_PROCESS);
  return { canRead: canProcess || can(PERMISSIONS.PAYROLL_VIEW), canProcess };
}

/** A reading screen's content, for whoever may read it; anyone else is told, in words, what is needed. */
export function ReadGate({ children }) {
  const { canRead } = usePayrollAccess();
  return canRead ? children : <RequirePermission permission={PERMISSIONS.PAYROLL_VIEW}>{children}</RequirePermission>;
}

/** A state as a 24px chip with a dot -- the member status chip's look, for this module's own words. */
export function ToneChip({ tone = 'unknown', children, className }) {
  const classes = TONE_CLASSES[tone] ?? TONE_CLASSES.unknown;
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full pl-2 pr-2.5',
        'text-xs font-semibold uppercase tracking-[0.08em]',
        classes.chip,
        className,
      )}
    >
      <i aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', classes.dot)} />
      {children}
    </span>
  );
}

/**
 * A button that goes somewhere in the application: a real link (its address can be copied, opened in a new tab, read
 * as a link), followed without reloading the page on a plain press -- `Button`'s `href` alone reloads it.
 */
export function NavButton({ to, children, ...rest }) {
  const navigate = useNavigate();
  const follow = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
  return <Button href={to} onClick={follow} {...rest}>{children}</Button>;
}

/**
 * One download at a time, and what became of it. A download changes nothing on the server, so a failure is said as
 * it is: the file did not arrive, try again.
 */
export function useDownload() {
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const run = async (key, fetchFile, fallbackName) => {
    if (busy) return false;
    setBusy(key);
    setNotice(null);
    try {
      saveFile(await fetchFile(), fallbackName);
      return true;
    } catch (error) {
      reportError('payroll.download', error);
      setNotice({ message: `${fallbackName} could not be downloaded. ${messageOf(error)}` });
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, notice, setNotice, run };
}
