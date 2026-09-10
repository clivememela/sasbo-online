import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IdCard, X } from 'lucide-react';

import { cn } from '../../lib/utils';
import { formatDateLong } from '../../lib/format';
import Button from '../form/Button';
import MembershipCard from './MembershipCard';
import { PANEL_SLOT_ID } from '../shellIds';

/**
 * THE RECORD PANEL — the third column, and the thing the contract was written around.
 * card.html's `.panel`, transcribed.
 *
 * 🗣️ [`directionContract.md`](../../../../planning/branches/design/directionContract.md):
 *
 *     THESIS   "Every member is a card; the register is the wallet that hands you that
 *               card. The page exists to put one member's card in your hand and the record
 *               beneath it, not to show a dashboard."
 *     REFUSES  "A modal for tasks that need neither interruption nor protected focus:
 *               the record edits in place."
 *
 * 📐 **IT IS A COLUMN OF THE SHELL, NOT OF THE PAGE.** The mock's `.app` grid is
 * rail | main | panel, so the panel stands beside the topbar rather than under it. The
 * page renders this component where it likes; the component portals itself into the
 * shell's slot (`PANEL_SLOT_ID`) when the shell is there, and renders in place when it is
 * not -- the tests mount pages without the shell, and a panel that disappeared in a test
 * would be a panel nobody could assert on.
 *
 * 📐 **THREE CONTAINERS, ONE SET OF FIELDS** *(R-RESP-M)*:
 *
 *   `xl` and up  a real third column, `clamp(360px, 32vw, 448px)`, full height, own scroll.
 *   below `xl`   a drawer from the right, `min(448px, 100vw)`, with a scrim; hidden at rest.
 *
 * ⚠️ **THE DOCKING EDGE IS `xl` (1280px), NOT THE MOCK'S ORIGINAL 1361** — R-RESP-D, a
 * measured correction: the commonest Windows laptop is 1366 with a 17px scrollbar showing,
 * which is **1349** — under the old edge, so the panel would have overlaid the register on
 * the exact machine most of this union's staff use. card.css carries the same 1280 now.
 *
 * 🔑 **THE EMPTY STATE IS THE WALLET'S EMPTY SLOT, NOT A BLANK COLUMN.** A ghost card in
 * the card's own proportion, what will appear here, how to make it appear, and the keys.
 *
 * 🎬 **THE ARRIVAL.** When a member is chosen the card is drawn from the wallet and laid on
 * the desk (580ms, the one animation allowed past the 400ms budget), a band of light sweeps
 * the metal, and the record's fields rise under it in a capped stagger. It plays once per
 * member, never on re-render, and reduced motion collapses it to a fade (index.css).
 */

const ARRIVAL_MS = 900;

/**
 * @param {{
 *   member: object|null,
 *   open: boolean,
 *   onClose: () => void,
 *   children?: React.ReactNode,
 *   footer?: React.ReactNode,
 *   remarks?: string,
 * }} props
 */
export default function MemberPanel({ member, open, onClose, children, footer }) {
  const scrollRef = useRef(null);
  const asideRef = useRef(null);
  const memberKey = member?.id ?? member?.membershipNumber ?? null;

  /*
   * The arrival plays when the MEMBER changes, and the record scrolls back to the top.
   *
   * Without the scroll reset, opening a second member from halfway down the first one's
   * record drops you into the middle of a stranger's employment details -- the panel is a
   * sticky column, so nothing else resets it. Without the key, every keystroke in the edit
   * form would re-land the card.
   *
   * The class is set on the element rather than held in state, exactly as the mock's
   * `arrive()` does it: the animation is a fact about this DOM node for 900ms, and a
   * re-render in that window must neither restart it nor be caused by it.
   */
  useEffect(() => {
    if (memberKey === null) return undefined;
    // `scrollTop`, not `scrollTo()`: the property exists on every element in every
    // environment this renders in, and the method does not (jsdom has no `scrollTo`).
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const aside = asideRef.current;
    if (!aside) return undefined;
    aside.classList.remove('panel-arriving');
    void aside.offsetWidth;
    aside.classList.add('panel-arriving');
    const timer = setTimeout(() => aside.classList.remove('panel-arriving'), ARRIVAL_MS);
    return () => {
      clearTimeout(timer);
      aside.classList.remove('panel-arriving');
    };
  }, [memberKey]);

  const updated = member?.dateLastChanged ?? member?.updatedAt ?? null;
  const meta = member
    ? [
        member.branch,
        member.employeeNumber && (
          <span key="emp">
            Employee no. <span className="font-medium tabular-nums text-ink">{member.employeeNumber}</span>
          </span>
        ),
        member.joinDate && `joined ${formatDateLong(member.joinDate)}`,
      ].filter(Boolean)
    : [];

  const panel = (
    <>
      {/* The scrim exists ONLY below the docking edge. Docked, the panel is a column of the
          page and a scrim over the register would be a lie about what is interactive. */}
      {open && (
        <button
          type="button"
          aria-label="Close member details"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink/25 xl:hidden"
        />
      )}

      <aside
        ref={asideRef}
        aria-label="Member details"
        data-testid="member-panel"
        data-open={open ? 'true' : undefined}
        className={cn(
          'flex min-w-0 flex-col border-line bg-surface',
          // ── docked: a real third column ────────────────────────────────────
          'xl:sticky xl:top-0 xl:h-dvh xl:w-[clamp(360px,32vw,448px)] xl:shrink-0 xl:border-l xl:shadow-none',
          // ── drawer: everything below xl, hidden at rest as the mock has it ──
          'max-xl:fixed max-xl:inset-y-0 max-xl:right-0 max-xl:z-40 max-xl:w-[min(448px,100vw)]',
          'max-xl:border-l max-xl:shadow-(--shadow-2)',
          !open && 'max-xl:hidden',
        )}
      >
        {!open ? (
          /* The wallet's empty slot. Docked only — as a drawer there is nothing to rest. */
          <div className="panel-empty-in hidden h-full place-content-center justify-items-center gap-2.5 px-8 py-12 text-center xl:grid">
            <div
              aria-hidden="true"
              className="mb-2.5 grid aspect-[1.586] w-full max-w-[300px] place-items-center rounded-card border-[1.5px] border-dashed border-line-strong text-ink-faint"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--color-surface-2), transparent)' }}
            >
              <IdCard className="size-[34px]" strokeWidth={1.5} />
            </div>
            <h2 className="text-md font-semibold text-ink">Select a member to open their card</h2>
            <p className="max-w-[34ch] text-[13.5px] text-ink-muted">
              Their record, subscriptions and structures open here, beside the register.
            </p>
            <p className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[12.5px] text-ink-muted">
              {[
                [['↑', '↓'], 'move'],
                [['Enter'], 'open'],
                [['⌘K'], 'search'],
                [['Esc'], 'close'],
              ].map(([keys, what], index) => (
                <span key={what} className="flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden="true" className="text-ink-faint">·</span>}
                  <b className="flex items-center gap-1.5 whitespace-nowrap font-medium">
                    {keys.map((key) => (
                      <kbd
                        key={key}
                        className="rounded-[5px] border border-line-strong border-b-2 bg-surface-2 px-1.5 py-[3px] font-sans text-[11px] font-medium leading-none text-ink-muted"
                      >
                        {key}
                      </kbd>
                    ))}
                    {what}
                  </b>
                </span>
              ))}
            </p>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3.5">
              <div className="mb-3 flex h-9 items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Member record</p>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close member details">
                  <X size={18} strokeWidth={1.75} aria-hidden="true" />
                </Button>
              </div>

              {member && (
                <MembershipCard
                  name={[member.firstNames, member.surname].filter(Boolean).join(' ') || '—'}
                  membershipNumber={member.membershipNumber}
                  status={member.status}
                  since={member.joinDate}
                  employer={member.bankName}
                />
              )}

              {meta.length > 0 && (
                <p className="record-rise mx-0.5 mt-3.5 text-sm text-ink-muted">
                  {meta.map((part, index) => (
                    <span key={index}>
                      {index > 0 && ' · '}
                      {part}
                    </span>
                  ))}
                </p>
              )}

              {children}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-6 py-3">
              <p className="text-[12.5px] text-ink-muted">
                {updated ? `Updated ${formatDateLong(updated)}` : member?.membershipNumber ? `Membership no. ${member.membershipNumber}` : ''}
              </p>
              {footer && <div className="flex flex-wrap items-center gap-2">{footer}</div>}
            </footer>
          </>
        )}
      </aside>
    </>
  );

  const slot = typeof document !== 'undefined' ? document.getElementById(PANEL_SLOT_ID) : null;
  return slot ? createPortal(panel, slot) : panel;
}
