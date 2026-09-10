import { useEffect, useRef } from 'react';
import { IdCard, X } from 'lucide-react';

import { cn } from '../../lib/utils';
import Button from '../form/Button';
import MembershipCard from './MembershipCard';

/**
 * THE RECORD PANEL — the third column, and the thing the contract was written around.
 *
 * 🗣️ [`directionContract.md`](../../../../planning/branches/design/directionContract.md):
 *
 *     THESIS   "Every member is a card; the register is the wallet that hands you that
 *               card. The page exists to put one member's card in your hand and the record
 *               beneath it, not to show a dashboard."
 *     REFUSES  "A modal for tasks that need neither interruption nor protected focus:
 *               the record edits in place."
 *     LAYOUT   "Desktop >= 1361px: three columns — the rail (256px), the register, the
 *               record panel; the panel opens as a drawer below that, and everything is one
 *               column with the drawer at <= 760px."
 *
 * 🔴 **THE BUILD HAD A MODAL.** `03.4` routed all eight of this application's overlays
 * through one Radix dialog — correct work, and it gave them the portal, focus trap, Escape
 * and scroll lock none of them had. But the member record was **never supposed to be one of
 * the eight.** It is the surface the contract singles out by name, and it went through the
 * modal layer with the others because the unit was scoped by *"things that are dialogs
 * today"* rather than by *"things the design says should be dialogs"*.
 *
 * ---
 *
 * 📐 **THREE CONTAINERS, ONE SET OF FIELDS** *(R-RESP-M)*, and the panel keeps its member
 * across every change:
 *
 *   `xl` and up  a real third column. `sticky`, full height, its own scroll.
 *   761–1279px   an overlay from the right, `min(448px, 100vw)`, with a scrim.
 *   ≤ 760px      a full-height sheet.
 *
 * ⚠️ **THE DOCKING EDGE IS `xl` (1280px), NOT THE MOCK'S 1361** — R-RESP-D, and it is a
 * measured correction rather than a preference: the commonest Windows laptop is 1366 with a
 * 17px scrollbar showing, which is **1349** — under the mock's edge, so the panel would have
 * overlaid the register on the exact machine most of this union's staff use. `xl` is a
 * Tailwind stop, so it is a token and not a magic number (conventions §2).
 *
 * 🔑 **THE EMPTY STATE IS THE WALLET'S EMPTY SLOT, NOT A BLANK COLUMN.** A third of the
 * screen showing nothing is a layout that looks broken until you happen to click a row. It
 * says what will appear here and how to make it appear, and it carries the keyboard hints —
 * which is also the only place in the design that teaches them.
 */

/**
 * @param {{
 *   member: object|null,
 *   open: boolean,
 *   onClose: () => void,
 *   arriving?: boolean,
 *   children?: React.ReactNode,
 *   footer?: React.ReactNode,
 * }} props
 */
export default function MemberPanel({ member, open, onClose, arriving = false, children, footer }) {
  const scrollRef = useRef(null);

  /*
   * Scroll the record back to the top when the member changes.
   *
   * Without it, opening a second member from halfway down the first one's record drops you
   * into the middle of a stranger's employment details -- the panel is a sticky column, so
   * nothing else resets it.
   */
  useEffect(() => {
    if (member) scrollRef.current?.scrollTo({ top: 0 });
  }, [member]);

  return (
    <>
      {/*
        The scrim, and it exists ONLY below the docking edge. Docked, the panel is a column
        of the page and a scrim over the register would be a lie about what is interactive.
      */}
      {open && (
        <button
          type="button"
          aria-label="Close member details"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink/25 xl:hidden"
        />
      )}

      <aside
        aria-label="Member details"
        data-testid="member-panel"
        data-open={open ? 'true' : undefined}
        className={cn(
          'flex min-w-0 flex-col border-line bg-surface',
          // ── docked: a real third column ────────────────────────────────────
          'xl:sticky xl:top-0 xl:h-dvh xl:w-[clamp(360px,28vw,448px)] xl:border-l xl:shadow-none',
          // ── overlay / sheet: everything below xl ───────────────────────────
          'max-xl:fixed max-xl:inset-y-0 max-xl:right-0 max-xl:z-40 max-xl:w-[min(448px,100vw)]',
          'max-xl:border-l max-xl:shadow-(--shadow-2)',
          'max-xl:transition-transform max-xl:duration-(--duration-fast) max-xl:ease-(--ease-out)',
          !open && 'max-xl:translate-x-full max-xl:pointer-events-none',
        )}
      >
        {!open ? (
          /* The wallet's empty slot. Docked only — as an overlay there is nothing to rest. */
          <div className="hidden h-full place-content-center justify-items-center gap-3 px-8 text-center xl:grid">
            <div
              aria-hidden="true"
              className="grid size-14 place-items-center rounded-full bg-surface-2 text-ink-faint"
            >
              <IdCard className="size-7" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-medium text-ink">Select a member to open their card</h2>
            <p className="max-w-[34ch] text-sm text-ink-muted">
              Their record, subscriptions and structures open here, beside the register.
            </p>
            <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-ink-faint">
              {[
                ['↑↓', 'move'],
                ['Enter', 'open'],
                ['Esc', 'close'],
              ].map(([key, what], index) => (
                <span key={key} className="flex items-center gap-2">
                  {index > 0 && <span aria-hidden="true">·</span>}
                  <b className="flex items-center gap-1 font-medium text-ink-muted">
                    <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11px]">
                      {key}
                    </kbd>
                    {what}
                  </b>
                </span>
              ))}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                Member record
              </p>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close member details"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-5">
              {member && (
                <MembershipCard
                  name={[member.firstNames, member.surname].filter(Boolean).join(' ') || '—'}
                  membershipNumber={member.membershipNumber}
                  status={member.status}
                  since={member.joinDate}
                  employer={member.bankName}
                  arriving={arriving}
                />
              )}

              {member && (
                <p className="mt-3 text-xs text-ink-muted">
                  {[
                    member.branch,
                    member.employeeNumber && `Employee no. ${member.employeeNumber}`,
                    member.joinDate && `joined ${member.joinDate}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}

              <div className="mt-4">{children}</div>
            </div>

            {footer && (
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
                {footer}
              </footer>
            )}
          </>
        )}
      </aside>
    </>
  );
}
