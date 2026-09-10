import { cn } from '../../lib/utils';

/**
 * THE CRITERIA ROW -- card.css `.criteria` and `.crit`: labelled fields printed on the
 * page itself, 140px wide and willing to shrink to 120, radius 10, on the resting shadow,
 * each value in the brand's ink once one is chosen. The row wraps; the disclosure and the
 * Clear control sit on the same baseline at the end.
 *
 * `CRITERION` is the class a `Field`-based control takes to join the row -- the primitive
 * owns the label, and these reach its control through it.
 */
export const CRITERION =
  'min-w-[120px] shrink grow-0 basis-[140px] ' +
  '[&_input]:rounded-[10px] [&_input]:font-medium [&_input]:shadow-(--shadow-1) ' +
  '[&_select]:rounded-[10px] [&_select]:font-medium [&_select]:shadow-(--shadow-1) ' +
  "[&_input:not(:placeholder-shown)]:text-brand-ink [&_select:not(:has(option:checked[value='']))]:text-brand-ink " +
  // `.crit__blank` (card.css:218) -- and it comes LAST and shouts, because the two rules
  // above have the same specificity and a criterion that is not filtering must win. A
  // `SearchableSelect`'s blank state is a real value ("Any"), so nothing else can see it.
  "[&_[data-blank]]:!font-normal [&_[data-blank]]:!text-ink-muted";

/** A wider criterion, for a free-text search that needs room to read. */
export const CRITERION_WIDE = CRITERION.replace('basis-[140px]', 'basis-[200px]');

export default function Criteria({ children, className, label = 'Filter criteria' }) {
  return (
    <section aria-label={label} className={cn('no-print flex flex-wrap items-end gap-x-3 gap-y-2.5', className)}>
      {children}
    </section>
  );
}
