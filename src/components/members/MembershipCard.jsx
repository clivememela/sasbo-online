import logo from '../../assets/images/logo.png';
import { cn } from '../../lib/utils';

/**
 * THE MEMBERSHIP CARD. The thesis of the whole design, and until now the one part of it
 * that was never built.
 *
 * 🗣️ [`directionContract.md`](../../../../planning/branches/design/directionContract.md):
 * *"Every member is a card; the register is the wallet that hands you that card."* The
 * contract's palette table has a row for it — *"the metal card … component tokens, not page
 * tokens — **the one place the palette is allowed to be material**"* — and `01.1` duly
 * created `--card-metal-a/-b/-c`, `--card-engrave`, `--card-engrave-gold` and `--shadow-card`
 * in both themes.
 *
 * 🔴 **AND THEN NOTHING RENDERED THEM.** A grep for those tokens across `src/` returned
 * ZERO consumers until this file. P4 rebuilt every screen on the primitives, converted 93
 * raw controls to 35, migrated 1,413 colour literals and closed its phase green — and its
 * Definition of Done never asked whether the register had a card in it, because every box in
 * it was about plumbing. The design's central object had a complete token spec and no
 * component. **That is what a gate measuring the easy half looks like.**
 *
 * ---
 *
 * 🔑 **IT IS A CARD, NOT A TEAL RECTANGLE**, and the difference is four surface treatments
 * that all have to be there at once:
 *
 *   ① the **gradient** across the diagonal — `metal-a → metal-b → metal-c` at 135°
 *   ② the **gloss** — a radial highlight from the top-left, as if lit from above
 *   ③ the **shade** — a radial darkening into the bottom-right corner
 *   ④ the **milled edges** — a light inset line on top, a dark one underneath
 *
 * Any three of those and it reads as a gradient panel. All four and it reads as something
 * pressed out of metal, which is the entire point of the direction the owner picked.
 *
 * 📐 **`aspect-ratio: 1.586` IS THE ISO/IEC 7810 ID-1 RATIO** — the shape of every bank card
 * in the member's wallet already. It is not a design flourish and it is not negotiable: a
 * card at 1.4 or 1.7 reads as *a rectangle with a name on it*.
 *
 * ✍️ **MARCELLUS APPEARS EXACTLY HERE AND NOWHERE ELSE.** The contract is explicit —
 * *"only where the card is engraved: the member's name and the union's name. It never sets
 * UI text."* `--font-engrave` exists for this one component.
 */

/** The status vocabulary, engraved rather than chipped. */
const ENGRAVED_STATUS = {
  Active: 'text-(--card-chip-ink)',
  Pending: 'text-(--card-chip-pending)',
  Suspended: 'text-(--card-chip-suspended)',
  Resigned: 'text-(--card-chip-muted)',
  Retired: 'text-(--card-chip-muted)',
};

/** Years between a join date and today, in the reading voice. */
function tenure(since) {
  if (!since) return '';
  const year = Number(String(since).slice(0, 4));
  if (!Number.isFinite(year)) return '';
  const years = new Date().getFullYear() - year;
  if (years <= 0) return 'this year';
  return `${years} yr${years === 1 ? '' : 's'}`;
}

/**
 * @param {{
 *   name: string, membershipNumber: string, status?: string,
 *   since?: string, employer?: string, arriving?: boolean,
 * }} props
 */
export default function MembershipCard({
  name,
  membershipNumber,
  status = 'Active',
  since,
  employer,
  arriving = false,
}) {
  const years = tenure(since);

  return (
    <div
      aria-label="Membership card"
      data-testid="membership-card"
      className={cn(
        'relative isolate overflow-hidden rounded-card p-5 text-(--card-engrave)',
        'grid grid-rows-[auto_1fr_auto] gap-2',
        // ISO ID-1. `min-h-max` so a long name can push it taller rather than clipping --
        // a member whose name does not fit is a member whose card is wrong.
        'aspect-[1.586] min-h-max',
        'shadow-(--shadow-card)',
        // 🔑 THE AUTHORED MOMENT (directionContract.md -> Motion posture): "the card is
        // drawn from the wallet and laid on the desk", 580ms, a hinged tilt from below.
        // It is allowed to exceed the 400ms budget because there is exactly one of it and
        // it is not on the path a daily user walks forty times.
        arriving && 'motion-safe:animate-[card-land_580ms_cubic-bezier(.16,1,.3,1)_both]',
      )}
      style={{
        backgroundImage: [
          'radial-gradient(120% 90% at 18% 0%, var(--card-gloss), transparent 52%)',
          'radial-gradient(90% 70% at 100% 100%, var(--card-shade), transparent 60%)',
          'linear-gradient(135deg, var(--card-metal-a) 0%, var(--card-metal-b) 48%, var(--card-metal-c) 100%)',
        ].join(', '),
        boxShadow:
          'var(--shadow-card), inset 0 1px 0 var(--card-edge-top), inset 0 -1px 0 var(--card-edge-bottom)',
        transformOrigin: '50% 100%',
      }}
    >
      <div className="flex items-start gap-3">
        {/* The crest sits on milled gold foil -- the one gold surface in the design that is
            a material rather than an accent. */}
        <span
          className="relative grid size-11 flex-none place-items-center rounded-full"
          aria-hidden="true"
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{ backgroundImage: 'var(--card-foil)' }}
          />
          <img
            src={logo}
            width="38"
            height="38"
            alt=""
            className="relative size-[38px] rounded-full bg-white object-contain p-[3px]"
          />
        </span>

        <span className="grid leading-[1.1]">
          <span
            className="text-[13px] font-semibold uppercase tracking-[0.12em]"
            style={{ fontFamily: 'var(--font-engrave)' }}
          >
            SASBO
          </span>
          <small className="mt-[3px] text-[10.5px] uppercase tracking-[0.14em] text-(--card-text-2)">
            The Finance Union
          </small>
        </span>

        <span
          className={cn(
            'ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
            'text-[10.5px] font-semibold uppercase tracking-[0.08em]',
            'bg-(--card-chip-bg) ring-1 ring-inset ring-current',
            ENGRAVED_STATUS[status] ?? ENGRAVED_STATUS.Active,
          )}
        >
          <i className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {status}
        </span>
      </div>

      {/* ✍️ THE ENGRAVING. Marcellus, gold, and the only place either appears. */}
      <p
        className="self-end text-[26px] leading-[1.12] text-(--card-engrave-gold)"
        style={{ fontFamily: 'var(--font-engrave)', textShadow: 'var(--engrave-shadow)' }}
      >
        {name}
      </p>

      <div className="flex items-end gap-5">
        <span className="grid gap-0.5">
          <small className="text-[10px] uppercase tracking-[0.1em] text-(--card-text-2)">
            Membership no.
          </small>
          {/* Tabular numerals: a register of membership numbers that do not align in the
              same column is a register you cannot scan. */}
          <b className="text-[15px] font-semibold tabular-nums tracking-[0.02em]">
            {membershipNumber || '—'}
          </b>
        </span>

        {since && (
          <span className="grid gap-0.5">
            <small className="text-[10px] uppercase tracking-[0.1em] text-(--card-text-2)">
              Member since
            </small>
            <b className="text-[15px] font-semibold tabular-nums">
              {String(since).slice(0, 4)}
              {years && <span className="ml-1.5 font-normal text-(--card-text-2)">{years}</span>}
            </b>
          </span>
        )}

        {employer && (
          <span className="ml-auto grid gap-0.5 text-right">
            <small className="text-[10px] uppercase tracking-[0.1em] text-(--card-text-2)">
              Employer
            </small>
            <b className="text-[15px] font-semibold">{employer}</b>
          </span>
        )}
      </div>
    </div>
  );
}
