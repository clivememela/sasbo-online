import { cn } from '../../lib/utils';
import { formatInt } from '../../lib/format';

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
 *
 * 📐 **THE COLUMNS ARE THE STYLESHEET'S** (index.css, "The figure strip follows the width it is
 * given"): five equal columns, three when five do not fit the strip, two on a phone. They answer
 * to the strip's own width, which is why the component is a wrapper and a list -- a container
 * query is asked of an ancestor, never of the element it lays out.
 */

/**
 * `2418` → `2 418`. en-ZA groups thousands with a no-break space (U+00A0), so a figure can never wrap mid-number --
 * which is also why the comma replacement that stood here never matched anything. `formatInt` is that same call, on a
 * formatter built once.
 */
const groups = (n) => (typeof n === 'number' ? formatInt(n) : n);

/**
 * @param {{
 *   total: number, active: number, pending: number, suspended: number,
 *   updatedToday?: number, state?: 'ready'|'loading'|'error', className?: string,
 * }} props
 */
export default function FigureStrip({
  total,
  active,
  pending,
  suspended,
  updatedToday,
  state = 'ready',
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

  /*
   * 🔴 K1 (`06.3`): A FIGURE NOBODY READ IS NOT A ZERO. The counts are taken from the register the
   * page holds, so while it loads -- and when it could not be reached at all -- every one of them
   * is 0, and the strip printed "Total 0 · Active 0 · Pending 0 · Suspended 0": the union with no
   * members, over the sentence saying the server had not answered. So no figure is printed until
   * one was read: the skeleton's shimmer while the register is on its way, the record's own "—"
   * when it is not coming, and each with its truth in words for a screen reader.
   *
   * ⚠️ The skeleton is sized INLINE: `.skeleton` is an unlayered rule in index.css, so utility
   * classes cannot resize it.
   */
  const reading = (figure) => {
    if (state === 'loading') {
      return (
        <>
          <span aria-hidden="true" className="skeleton" style={{ width: '3.5rem', height: '1.5rem' }} />
          <span className="sr-only">loading</span>
        </>
      );
    }
    if (state === 'error') {
      return (
        <>
          <span aria-hidden="true" className="text-ink-muted">—</span>
          <span className="sr-only">not available</span>
        </>
      );
    }
    return groups(figure.value);
  };

  return (
    <div className={cn('figure-strip', className)}>
      <dl
        aria-label="Register summary"
        aria-busy={state === 'loading' || undefined}
        data-testid="figure-strip"
        // 🔑 THE RULES ARE THE COMPONENT. Two hairlines, top and bottom, and the figures sit
        // BETWEEN them -- a ledger line, and not a row of boxes.
        className="border-y border-line-strong"
      >
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={cn(
              // `px-5 first:pl-0` rather than `pr-5 mr-5`: with columns of equal width the
              // hairline belongs ON the column's edge, so the rules fall at even intervals
              // across the strip. The first figure keeps the page's own gutter.
              'grid content-start gap-1 px-5 py-2.5 first:pl-0',
              // The separating hairline, on every figure but the last.
              index < figures.length - 1 && 'border-r border-line',
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
              {reading(figure)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
