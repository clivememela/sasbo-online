import { cn } from '../../lib/utils';

/**
 * THE REGISTER'S TOTALS, AS A RULED FIGURE STRIP.
 *
 * 🗣️ [`directionContract.md`](../../../../planning/branches/design/directionContract.md) →
 * *Density and layout*, in its own words:
 *
 *     "The register's totals are a **ruled figure strip** (ledger line, not tiles)"
 *
 * 🔴 **AND THE CONTRACT'S REFUSALS NAME THE ALTERNATIVE EXPLICITLY**: *"Hero-metric tiles,
 * dashboards of same-size cards, nested cards."* So this is not "a stats row, styled" — the
 * shape is the decision. A ledger rules a line above and below its figures and separates
 * them with hairlines; it does not put each number in its own box, because a box says *"this
 * is a thing"* and a ruled column says *"this is a reading of one thing"*.
 *
 * 🔑 **TABULAR NUMERALS, AND THE FONT WAS CHOSEN FOR THEM.** The contract's type section:
 * *"One family; the numerals do the identity work (tabular in the register, the figure strip
 * and the calendar)."* Proportional digits make 1 902 and 1 118 different widths, so the
 * eye cannot compare two figures without reading both.
 *
 * ⚠️ **SPACE-SEPARATED THOUSANDS, NOT COMMAS** — `2 418`. South African convention, and it
 * is what the mock renders.
 */

/** `2418` → `2 418`. A narrow no-break space, so it can never wrap mid-number. */
const groups = (n) =>
  typeof n === 'number' ? n.toLocaleString('en-ZA').replace(/,/g, ' ') : n;

/**
 * @param {{
 *   total: number, active: number, pending: number, suspended: number,
 *   updatedToday?: number, className?: string,
 * }} props
 */
export default function FigureStrip({
  total,
  active,
  pending,
  suspended,
  updatedToday,
  className,
}) {
  const figures = [
    { label: 'Total', value: total },
    { label: 'Active', value: active, dot: 'bg-status-active-dot' },
    { label: 'Pending', value: pending, dot: 'bg-status-pending-dot' },
    { label: 'Suspended', value: suspended, dot: 'bg-status-suspended-dot' },
    ...(updatedToday === undefined
      ? []
      : [{ label: 'Updated today', value: updatedToday, quiet: true }]),
  ];

  return (
    <dl
      aria-label="Register summary"
      data-testid="figure-strip"
      className={cn(
        // 🔑 THE RULES ARE THE COMPONENT. Two hairlines, top and bottom, and the figures
        // sit BETWEEN them -- `justify-start` so the strip ends where the figures end
        // rather than stretching to fill, which would turn it back into a row of tiles.
        'grid auto-cols-max grid-flow-col justify-start',
        'border-y border-line-strong',
        // Below `sm` five columns cannot hold their numerals, so it wraps to a grid --
        // still ruled, still not tiles.
        'max-sm:grid-flow-row max-sm:grid-cols-2',
        className,
      )}
    >
      {figures.map((figure, index) => (
        <div
          key={figure.label}
          className={cn(
            'grid gap-1 py-2.5 pr-5',
            // The separating hairline, on every figure but the last.
            index < figures.length - 1 && 'mr-5 border-r border-line max-sm:border-r-0 max-sm:mr-0',
          )}
        >
          <dt className="flex items-center gap-[7px] whitespace-nowrap text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {figure.dot && <i className={cn('size-[7px] rounded-full', figure.dot)} aria-hidden="true" />}
            {figure.label}
          </dt>
          <dd
            className={cn(
              'text-2xl leading-none tracking-[-0.01em] tabular-nums',
              figure.quiet ? 'font-medium text-ink-muted' : 'font-semibold text-ink',
            )}
          >
            {groups(figure.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
