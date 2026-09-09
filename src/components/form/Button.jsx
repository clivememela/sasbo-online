import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * The button. `03.2a`.
 *
 * 🔴 WHAT THIS REPLACED, AND WHY THE REPLACEMENT IS NOT A RE-SKIN. The previous
 * implementation hard-coded `cyan-500`, `gray-300` and eleven `dark:` twins across four
 * variants -- 22 colour decisions that the token layer already owns, restated by hand,
 * and therefore free to drift from it. Every colour here is now a token, so the dark
 * theme follows without a single `dark:` prefix and P2's direction reaches this control
 * without anybody editing it.
 *
 * 🔑 `loading` IS A STATE, NOT A CALLER'S PROBLEM. A submit button that stays clickable
 * while its request is in flight is how this application gets duplicate members, and
 * every call site solving it separately is 53 chances to forget. `loading` disables the
 * control, sets `aria-busy`, and swaps the leading slot for a spinner while KEEPING the
 * label -- a button whose text vanishes mid-flight loses its accessible name exactly
 * when a screen-reader user most needs it, and it also resizes, which moves whatever
 * sits beside it.
 *
 * ⚠️ TWO OF THE EIGHT STATES DO NOT APPLY HERE, and saying so is the record
 * (conventions §7, contract ⑬). `invalid` belongs to a control that holds a value --
 * a button holds none, so `aria-invalid` is passed through untouched for the one case
 * that matters, a submit button described by a form-level error summary. `empty`
 * likewise: a button with no children is a defect, not a state, and `Button.test.jsx`
 * asserts the six that do apply plus the ring.
 *
 * 📱 `touch-target` gives a 44px hit area on a coarse pointer WITHOUT growing the
 * visible control, so desktop density is provably untouched (conventions §4, T6).
 */

const VARIANTS = {
  /** The neutral control. The old `default`, kept under its name so no call site moves. */
  default: cn(
    'border-line-strong bg-surface text-ink',
    'hover-hover:hover:bg-surface-2',
    'active:bg-surface-2',
  ),

  /** The one action a surface wants you to take. */
  primary: cn(
    'border-brand bg-brand text-on-brand',
    'hover-hover:hover:border-brand-hover hover-hover:hover:bg-brand-hover',
    'active:border-brand-hover active:bg-brand-hover',
  ),

  /** Quiet, for a control that must not compete -- toolbars, row actions. */
  ghost: cn(
    'border-transparent bg-transparent text-ink-muted',
    'hover-hover:hover:bg-surface-2 hover-hover:hover:text-ink',
    'active:bg-surface-2 active:text-ink',
  ),

  /**
   * Destructive. NEW in `03.2a`: the old set had none, so every delete in this
   * application is currently a `default` button beside a `confirm()`. `03.4` migrates
   * those four dialogs and needs a control that looks like what it does.
   */
  danger: cn(
    'border-status-suspended-dot bg-status-suspended-bg text-status-suspended',
    'hover-hover:hover:border-status-suspended hover-hover:hover:bg-status-suspended-dot hover-hover:hover:text-on-brand',
    'active:border-status-suspended active:bg-status-suspended-dot active:text-on-brand',
  ),

  /** Pager controls. Same skin as `default`; a separate name so P5's Table can retune it alone. */
  pagination: cn(
    'border-line-strong bg-surface text-ink',
    'hover-hover:hover:bg-surface-2',
    'active:bg-surface-2',
  ),
};

const SIZES = {
  sm: 'min-h-(--size-control-sm) gap-1.5 px-3 py-1 text-xs',
  md: 'min-h-(--size-control) gap-2 px-4 py-2 text-sm',
  /** Square, for an icon with no label. `aria-label` is then the caller's obligation. */
  icon: 'min-h-(--size-control) min-w-(--size-control) justify-center p-2',
};

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
      className={cn(
        'touch-target inline-flex items-center rounded-lg border font-medium',
        'transition-colors duration-(--duration-instant) ease-(--ease-out)',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        SIZES[size] ?? SIZES.md,
        VARIANTS[variant] ?? VARIANTS.default,
        className,
      )}
    >
      {loading && (
        <Loader2
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
        />
      )}
      {children}
    </button>
  );
}

export const BUTTON_VARIANTS = Object.freeze(Object.keys(VARIANTS));
export const BUTTON_SIZES = Object.freeze(Object.keys(SIZES));
