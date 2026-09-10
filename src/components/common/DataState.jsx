import { AlertTriangle, Inbox, Loader2, WifiOff } from 'lucide-react';

import { cn } from '../../lib/utils';
import Button from '../form/Button';

/**
 * THE FOUR STATES, ONCE. `06.1b`.
 *
 * 🔴 **WHY THIS IS A COMPONENT AND NOT A CONVENTION.** Before this file the application
 * carried eight separate empty-state copies across six files, three separate spinners and
 * exactly one error state (`Table`'s). A convention -- *"render an error state"* -- is
 * something every one of twenty-seven surfaces has to remember; the ones that forgot are
 * how A27 came to be a CLASS rather than a row. The states are a component so that
 * forgetting is not possible: a caller who has a state to render has this to render it
 * with, and a caller who does not is visible as a caller not using it.
 *
 * ---
 *
 * 🔑 **THE FOURTH STATE IS `partial`, AND IT IS THE ONE NOBODY HAS.** `loading`, `empty`
 * and `error` are the three every framework ships with. A screen with nine mount fetches
 * (`CaptureMember`) or four (`Members`) has a fourth outcome that none of them describe:
 * **three of four sources answered.** Rendered as "loaded" it is a quiet lie -- a form
 * whose bank list is missing looks exactly like a bank list that is genuinely empty.
 * Rendered as "error" it blanks a screen that is 75% usable.
 *
 * The automation arc's own reporting tool is the model, and it is where this came from:
 * it marks a section `incomplete` and prints `DID NOT RUN` rather than zero, because a
 * zero that means "we did not look" and a zero that means "we looked and there was
 * nothing" are different facts that must not share a rendering.
 *
 * ---
 *
 * 🔑 **`error` NEVER RENDERS THE EMPTY COPY** (conventions §8, EH-D4). The branches are
 * mutually exclusive by construction rather than by four conditions agreeing with each
 * other, and the error branch always offers a way out when one is honest -- see
 * `retryable` below.
 *
 * 🔴 **RETRY IS OFFERED WHEN IT CAN WORK, NOT WHENEVER THERE IS AN ERROR.** `06.1a` derives
 * `retryable` once, in `parseApiError`, precisely so that no consumer re-derives it from a
 * status code. A 4xx is the server saying the request was wrong: retrying it unchanged
 * produces the same refusal, and a button that cannot work is worse than no button. So the
 * control appears when `onRetry` is given AND the error does not say `retryable: false`.
 * An error object with no `retryable` field at all -- a thrown `TypeError`, say -- is
 * treated as retryable, because the alternative is a dead end on the failures we understand
 * least.
 *
 * 🗣️ **THE COPY RULE, EH-D12**: what happened and what to do next, in the reading voice,
 * and **no code in the sentence**. `status` and the envelope live behind `detail`, which
 * this renders in a `<details>` a reader has to open -- present for the person diagnosing
 * it, absent for the person who just wants their list back.
 */

/** @typedef {'loading'|'empty'|'error'|'partial'} DataStateKind */

/**
 * The copy each state shows when the caller does not override it.
 *
 * All four, not the two that needed defaults -- for the reason `parseApiError` hoists all
 * six of its strings: a reader cannot tell "the vocabulary" from "the incidental" when only
 * half of it is in one place.
 */
const DEFAULTS = {
  loading: { title: 'Loading…', message: null },
  empty: { title: 'Nothing here yet', message: null },
  error: { title: 'We could not load this.', message: null },
  partial: {
    title: 'Some of this is missing.',
    message: 'What loaded is shown below. The rest did not answer.',
  },
};

const ICONS = {
  loading: Loader2,
  empty: Inbox,
  error: AlertTriangle,
  partial: AlertTriangle,
};

/**
 * Is a retry control honest for this failure?
 *
 * @param {unknown} error the rejection, in `conventions.md` §16's shape
 * @returns {boolean}
 */
const canRetry = (error) => error?.retryable !== false;

/**
 * Is this failure the network being gone rather than the server refusing?
 *
 * 🔑 Read off `kind`, never off the message. §16 fixes the vocabulary at five values so
 * that a consumer can branch on it; matching on the sentence is how a copy edit silently
 * turns an offline banner off.
 */
export const isOffline = (error) => error?.kind === 'network';

/**
 * @param {{
 *   state: DataStateKind,
 *   title?: string,
 *   message?: string,
 *   error?: unknown,
 *   onRetry?: () => void,
 *   compact?: boolean,
 *   className?: string,
 *   'data-testid'?: string,
 * }} props
 */
export default function DataState({
  state,
  title,
  message,
  error = null,
  onRetry,
  compact = false,
  className,
  'data-testid': testId,
}) {
  if (!DEFAULTS[state]) {
    throw new Error(
      `DataState was given state "${state}". Known states: loading, empty, error, ` +
        `partial. A typo that fell back to a default would decide, silently, whether a ` +
        `failed fetch renders as "nothing found" -- which is the whole of A27.`,
    );
  }

  const isFailure = state === 'error' || state === 'partial';
  const offline = isFailure && isOffline(error);
  const Icon = offline ? WifiOff : ICONS[state];

  // The server's own sentence beats ours: it is the one written about THIS failure. Ours
  // is the fallback for a rejection that carries nothing worth reading.
  const headline =
    title ??
    (state === 'error' && typeof error?.message === 'string' && error.message.trim()
      ? error.message
      : DEFAULTS[state].title);
  const body = message ?? DEFAULTS[state].message;

  /*
   * 🔑 `status` VS `alert`, AND IT IS NOT INTERCHANGEABLE. A loading or empty state is a
   * polite update -- a screen reader should hear it when it gets there. A failure
   * interrupts, because the user is about to act on a list that is not what they think it
   * is. EH-D6 draws the same line for notices: a result is `status`, a refusal is `alert`.
   */
  const role = isFailure ? 'alert' : 'status';

  const showRetry = isFailure && typeof onRetry === 'function' && canRetry(error);

  // The diagnostic line, and only when there is genuinely something to diagnose. `status: 0`
  // is what a network failure carries and says nothing a reader can use.
  const detail = [
    error?.kind && error.kind !== 'http' ? error.kind : null,
    error?.status ? `HTTP ${error.status}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      role={role}
      {...(role === 'status' && { 'aria-live': 'polite' })}
      data-testid={testId}
      data-state={state}
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'gap-1.5 py-2' : 'gap-3 py-6',
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          compact ? 'size-4' : 'size-6',
          state === 'loading' && 'animate-spin motion-reduce:animate-none',
          state === 'empty' && 'text-ink-faint',
          isFailure && 'text-status-suspended',
          state === 'loading' && 'text-ink-muted',
        )}
      />

      <p className={cn('font-medium text-ink', compact ? 'text-xs' : 'text-sm')}>{headline}</p>

      {body && <p className={cn('text-ink-muted', compact ? 'text-xs' : 'text-sm')}>{body}</p>}

      {showRetry && (
        <Button variant="default" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}

      {isFailure && detail && (
        <details className="text-xs text-ink-muted">
          <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring">
            Details
          </summary>
          <p className="mt-1">{detail}</p>
        </details>
      )}
    </div>
  );
}
