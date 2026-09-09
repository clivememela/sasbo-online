import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn, pick } from '../../lib/utils';
import Button from '../form/Button';

/**
 * THE ONE OVERLAY. `03.4`.
 *
 * 🔴 **WHAT IT REPLACES: EIGHT HAND-ROLLED OVERLAYS IN FOUR FILES**, re-derived from source
 * on 2026-09-09 (contract ⑰ — the plan said nine; the grep says eight, and the count in a
 * plan expires like every other):
 *
 *   `Recruiters.jsx` **:437 · :526 · :574 · :729 · :850** · `Members.jsx` **:513** ·
 *   `AcbDebits.jsx` **:227** · `BankBranchModal.jsx` **:87**
 *
 * Every one is a bare `fixed inset-0` div. **None is portalled**, so each is trapped in
 * whatever `overflow` and `z-index` context its page happens to have. **None traps focus**,
 * so Tab walks straight out of the dialog and into the page behind it — which the user
 * cannot see and cannot get back from. **One of the eight handles Escape.** They disagree
 * about `z-index` (`z-10 · 20 · 50 · [60]`), about the backdrop, and about whether the page
 * behind them scrolls.
 *
 * 🔑 **MIGRATING THEM IS A BEHAVIOUR CHANGE, AND THAT IS THE POINT** (BR-3). Focus trap,
 * Escape, scroll lock and a portal are things these surfaces do not have today. They are
 * also the state-gated surfaces `07.2` has to drive, and driving eight inconsistent
 * hand-rolled overlays is strictly worse than driving one primitive.
 *
 * ---
 *
 * 📱 **THE HEIGHT CAP IS BAKED IN, IN `dvh`, AND IT IS NOT NEGOTIABLE PER CALL SITE**
 * (conventions §6, contract ⑮). `100vh` on a phone is the viewport with the URL bar
 * *retracted*, so a `vh`-sized dialog is taller than the screen and its footer — where Save
 * lives — sits under the browser chrome, unreachable. MobiZone found two call-sites that had
 * "forgotten" their cap and fixed it by baking it into the primitive. This is that fix,
 * before the forgetting.
 *
 * ⚠️ **THERE IS NO `className` PROP, AND THAT IS THE POINT.** It was there, and it made the
 * paragraph above a lie: `cn` merges the caller's classes last, and `twMerge` resolves
 * `max-h-*` last-wins, so `<Modal className="max-h-[90vh]">` silently restored the exact bug
 * the height cap exists to prevent -- and `max-h-[90vh]` is literally what `Members.jsx`
 * carried before this migration. No call site passed one, so removing it costs nothing and
 * turns "not negotiable per call site" from a comment into a fact.
 *
 * 🔴 **A TITLE IS REQUIRED.** Radix warns about a missing `Dialog.Title` and then renders
 * anyway; this throws in development. A dialog with no accessible name is announced as
 * "dialog" and nothing else, and the user has no idea what just took over the screen. Where
 * a design genuinely wants no visible heading, pass `titleHidden` — the name still exists,
 * it is just `sr-only`, which is a different thing from not having one.
 */

/**
 * `onOpenChange` from a plain close handler.
 *
 * Radix reports both directions; every dialog in this application only ever needs the
 * closing one, so eleven call sites had written `(next) => { if (!next) close(); }` by hand.
 * One adapter, so the shape is stated once and a call site reads as what it means.
 */
export const closeOn = (close) => (next) => {
  if (!next) close();
};

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  open,
  onOpenChange,
  title,
  titleHidden = false,
  description,
  size = 'md',
  footer,
  children,
  /** Escape and a click outside are ON by default. Off only for a step you must answer. */
  dismissible = true,
}) {
  if (import.meta.env?.DEV && !title) {
    throw new Error(
      'Modal requires a `title`. Radix warns about a missing Dialog.Title and renders ' +
        'anyway, so the failure is a dialog announced to a screen reader as "dialog" and ' +
        'nothing else — the user cannot tell what has taken over the screen. If the design ' +
        'has no visible heading, pass `titleHidden` and keep the name.',
    );
  }

  // One blocker, passed three times, rather than the same arrow written three times.
  const block = dismissible ? undefined : (event) => event.preventDefault();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Portalled to the body, so no page's `overflow` or stacking context can clip it —
            which is the single thing all eight hand-rolled overlays got wrong. */}
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'motion-reduce:animate-none',
          )}
        />

        <Dialog.Content
          // 🔑 A CONDITIONAL SPREAD, not a ternary. Radix warns when a dialog has no
          // Description, and the tempting silencer — an `sr-only` Description holding the
          // title — makes a screen reader announce the name TWICE ("Member details. Member
          // details."), which is what the test for `titleHidden` caught.
          //
          // ⚠️ `aria-describedby={undefined}` and OMITTING the prop are not the same thing
          // here: Radix spreads the caller's props AFTER its own wiring, so a present key
          // whose value is `undefined` REMOVES the attribute (that is the documented way to
          // say "no description"), while an absent key leaves Radix's own `describedby`
          // intact. A ternary between `undefined` and `undefined` would have done neither —
          // it always passes the key, and would have silently broken the association on
          // every dialog that DOES have a description.
          {...(description ? {} : { 'aria-describedby': undefined })}
          onEscapeKeyDown={block}
          onPointerDownOutside={block}
          onInteractOutside={block}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2',
            // 📱 `dvh`, never `vh`. The cap and the internal scroll are the primitive's, so
            // a long form cannot push its own Save button off the bottom of a phone.
            'flex max-h-[85dvh] flex-col overflow-hidden',
            'rounded-card border border-line bg-surface shadow-2',
            'focus:outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'motion-reduce:animate-none',
            pick(SIZES, size, 'Modal size'),
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title
                className={cn('text-lg font-semibold text-ink', titleHidden && 'sr-only')}
              >
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-ink-muted">
                  {description}
                </Dialog.Description>
              )}
            </div>

            {dismissible && (
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className={cn(
                    'touch-target -mr-1 shrink-0 rounded-md p-1.5 text-ink-faint',
                    'hover-hover:hover:bg-surface-2 hover-hover:hover:text-ink',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring',
                  )}
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </Dialog.Close>
            )}
          </div>

          {/* The BODY scrolls, not the dialog — so the header and the footer stay put and
              the actions are always reachable. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            {children}
          </div>

          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * THE DESTRUCTIVE CONFIRM. `03.4`.
 *
 * 🔴 **IT REPLACES FOUR `window.confirm()` CALLS** — `RecruitmentChannel.jsx:71`,
 * `Members.jsx:360`, `Recruiters.jsx:294` and `Recruiters.jsx:346`.
 *
 * `window.confirm` is not merely ugly. It is **unstyleable**, it says "OK"/"Cancel" rather
 * than naming what will happen, it **blocks the whole browser thread**, and it is
 * suppressible — a user who ticks *"don't show me these again"* silently loses every
 * confirmation in the application, including the one that deletes a recruiter and sets
 * fifteen members inactive.
 *
 * 🧪 ⚠️ **AND IT IS LOAD-BEARING IN THE AUTOMATION SUITE.** Their `MemberRegisterPage` and
 * `MemberCapturePage` carry `page.on('dialog')` handlers. **The day these dialogs vanish
 * those steps pass for the wrong reason** — a handler for an event that never fires is
 * green forever. That is named in the brief that goes to the automation arc, and it is why
 * this migration is theirs to know about rather than ours to do quietly.
 *
 * 🔑 **THE CONFIRM BUTTON NAMES THE ACTION**, never "OK". *"Remove recruiter"* is a
 * sentence a user can check against what they meant to do; "OK" is not.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  destructive = true,
  loading = false,
  children,
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Dialog.Close asChild>
            <Button variant="ghost">{cancelLabel}</Button>
          </Dialog.Close>
          <Button variant={destructive ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
