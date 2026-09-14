import { cn } from '../../lib/utils';

/**
 * A set of checkboxes that answer ONE question. `04.2`.
 *
 * 🔴 THE DEFECT IT EXISTS FOR IS BR-14, AND THERE WERE FOUR INSTANCES OF IT. Every
 * hand-rolled checkbox group in the members lane put a `<label>` above the group with no
 * `htmlFor` — and there is no single control for one to point at, so the markup was not
 * merely sloppy, it was unfixable in that shape. A screen-reader user reached five or six
 * checkboxes with no idea what question they answered. One of the four went further and
 * rendered its labels EMPTY: two checkboxes, side by side, with no text at all.
 *
 * 🔑 `<fieldset>` + `<legend>` IS THE ANSWER, and it is the element pair that exists for
 * exactly this. It is not interchangeable with a `<label>`: a label names ONE control, a
 * legend names a GROUP, and a group of checkboxes has no single control to name.
 *
 * ♻️ Extracted on the second consumer (`Members.jsx` and `CaptureMember.jsx` both wrote it
 * in `04.2`), never speculatively.
 *
 * 📱 `touch-target` on the row, not the box. A 16px checkbox is a 16px target; the label
 * is the thing a thumb actually lands on, and making the whole row the hit area is what
 * takes it past 44px without changing how it looks.
 */
export default function CheckboxGroup({
  legend,
  options,
  selected = [],
  onToggle,
  labelFor = (option) => option,
  className,
}) {
  return (
    <fieldset className={cn('rounded-lg border border-line bg-surface-2 p-4', className)}>
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {legend}
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isChecked = selected.includes(option);
          return (
            <label
              key={option}
              className="touch-target flex cursor-pointer items-center gap-3 rounded p-1.5 text-sm text-ink hover-hover:hover:bg-surface"
            >
              <input
                type="checkbox"
                checked={isChecked}
                className="size-4 shrink-0 accent-brand"
                onChange={() =>
                  onToggle(
                    isChecked
                      ? selected.filter((item) => item !== option)
                      : [...selected, option],
                  )
                }
              />
              <span>{labelFor(option)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
