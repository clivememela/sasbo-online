import { Fragment, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Inbox, Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils';
import Button from '../form/Button';
import TableScroller from './TableScroller';

/**
 * THE TABLE SHELL. `03.2a`.
 *
 * This application has **three real `<table>`s and seven `grid-cols-N` pseudo-tables** --
 * ten tabular surfaces, each with its own answer to headers, empty states, overflow and
 * row actions, and none of which a `<table>` grep can find (BR-19). P4 converts the seven;
 * `05.2` hardens all ten. This is what they all become.
 *
 * ---
 *
 * 🔴 **`rowKey` IS REQUIRED AND ITS ABSENCE THROWS.** Not a warning, not a fallback to the
 * array index -- a throw, in development, at the first render.
 *
 * The fallback is what makes this worth a paragraph. A table keyed by index looks perfect
 * until the list reorders or a row is deleted, and then React reuses the DOM node with the
 * old row's state in it: the checkbox you ticked follows the row that took its place, the
 * open detail panel now describes a different member, and an edit-in-place lands on the
 * wrong record. **Nothing errors.** It is R-ROB-H, and it is the exact failure shape this
 * arc keeps finding -- a check that cannot tell its subject from nothing -- so the
 * primitive refuses to guess rather than guessing quietly.
 *
 * The throw is guarded by `import.meta.env.DEV` so a production render degrades to the
 * index instead of blanking a screen a user is standing in front of; the mutation-checked
 * test (`Table.test.jsx`) is what proves the guard fires at all.
 *
 * ---
 *
 * 📱 **THE COLUMN PRIORITY MODEL (R-RESP-K)** -- the third strategy, beside "scroll it" and
 * "cards below `md`", and the one that suits a back office. Every column declares what it
 * is worth:
 *
 *   `essential`  always visible, at every width. A member's name and number.
 *   `secondary`  visible from `md` up; below that it moves INTO the row's detail panel.
 *   `detail`     never a column; only ever in the detail panel.
 *
 * A phone then shows two or three real columns instead of nine crushed ones, and nothing is
 * lost -- which is the difference between this and hiding columns, where the data simply
 * goes away. If a table declares no secondary or detail columns there is no expander and no
 * panel: the affordance appears only when it leads somewhere.
 *
 * 📱 **TRUNCATION IS ONLY EVER IN THE CELL (R-RESP-I).** A column may set `truncate` and the
 * full value is then in the detail panel and in the cell's `title`. A truncated name with no
 * way to read it is a table that cannot do its job, and this is where that rule is enforced
 * rather than remembered.
 *
 * ---
 *
 * 🔴 **NO ROW IS A `<div onClick>`.** Run 7 found six controls in this application that only
 * a mouse can reach, and click-only table rows are four of them. A row's action is a `<a>`
 * or a `<button>` INSIDE the row, rendered by the column that owns it -- so it is in the tab
 * order, has an accessible name, and works with Enter. The primitive offers no `onRowClick`
 * at all, because an escape hatch that is easier than the correct thing is the thing that
 * gets used.
 *
 * ---
 *
 * 🔑 **THE FOUR DATA STATES, NOT THREE** (conventions §8, and A27 one layer down). `loading`,
 * `error`, `empty` and loaded are separate branches and `error` NEVER renders as `empty`: a
 * backend that is down must not tell an administrator there are no members. `error` also
 * carries a retry, because an error state with no way out is a dead end.
 *
 * 🔧 **`total` MAKES SERVER PAGING A DROP-IN (R-SCALE-D).** `rows` is what is on screen;
 * `total` is how many exist. When they differ and no pager is wired, the table says *"showing
 * the first N of M -- refine your search"* rather than implying the list is complete. That is
 * what the two `slice(0, 50)` caps in `Recruiters.jsx` silently do today.
 */

/** @typedef {'essential'|'secondary'|'detail'} ColumnPriority */

const PRIORITIES = new Set(['essential', 'secondary', 'detail']);

function resolveRowKey(rowKey, row, index) {
  if (typeof rowKey === 'function') return rowKey(row, index);
  if (typeof rowKey === 'string') return row?.[rowKey];
  return undefined;
}

function cellValue(column, row, index) {
  return typeof column.cell === 'function' ? column.cell(row, index) : row?.[column.key];
}

export default function Table({
  columns = [],
  rows = [],
  rowKey,
  caption,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  total,
  className,
  dense = false,
}) {
  const [expanded, setExpanded] = useState(() => new Set());

  if (import.meta.env?.DEV && !rowKey) {
    throw new Error(
      'Table requires `rowKey` -- a function (row, index) => id, or the name of an id ' +
        'field. Without it React keys rows by array index, and the first reorder or ' +
        'deletion silently hands one row the DOM node of another: a ticked checkbox ' +
        'follows the wrong record and an open detail panel describes a different one. ' +
        'Nothing errors when that happens, which is why this does.',
    );
  }

  const headCell = cn(
    'whitespace-nowrap px-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted',
    dense ? 'py-2' : 'py-3',
  );
  const bodyCell = cn('px-3 align-middle text-sm text-ink', dense ? 'py-2' : 'py-3');

  const { visible, collapsed } = useMemo(() => {
    const known = columns.map((column) => {
      const priority = column.priority ?? 'essential';
      if (!PRIORITIES.has(priority)) {
        throw new Error(
          `Table column "${column.key}" has priority "${priority}". Known priorities: ` +
            `essential, secondary, detail. A typo that fell back to a default would ` +
            `decide, silently, what a phone shows.`,
        );
      }
      // 🔑 THE CELL CLASSES ARE COMPUTED PER COLUMN, ONCE -- not per cell. They depend only
      // on the column and on `dense`, never on the row, and computing them in the render
      // loop meant `rows.length × visible.length` clsx joins and twMerge lookups: 450 of
      // them for a 50-row, 9-column members table, for at most 9 distinct answers.
      const alignment =
        column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : null;
      const hideBelowMd = priority === 'secondary' ? 'hidden md:table-cell' : null;
      return {
        ...column,
        priority,
        headClass: cn(headCell, alignment, hideBelowMd),
        // R-RESP-I: truncate ONLY here; the full value is in the panel.
        bodyClass: cn(bodyCell, alignment, hideBelowMd, column.truncate && 'max-w-[16rem] truncate'),
      };
    });
    return {
      visible: known.filter((column) => column.priority !== 'detail'),
      collapsed: known.filter((column) => column.priority !== 'essential'),
    };
  }, [columns, headCell, bodyCell]);

  const expandable = collapsed.length > 0;
  const columnCount = visible.length + (expandable ? 1 : 0);

  const toggle = (key) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // 🔑 ONE NAMED STATE, not four growing negation chains (`!loading && !error && rows.length
  // === 0` and so on). conventions §8 says a failed query must NEVER render as an empty
  // state; with the branches mutually exclusive by construction that is structural rather
  // than something four conditions have to keep agreeing about.
  const state = loading ? 'loading' : error ? 'error' : rows.length === 0 ? 'empty' : 'rows';

  /** One full-width row carrying a state, so the header stays put while it changes. */
  const stateRow = (content) => (
    <tr>
      <td colSpan={columnCount || 1} className="px-3 py-10">
        {content}
      </td>
    </tr>
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <TableScroller label={caption}>
        <table className="w-full border-collapse text-left">
          {caption && <caption className="sr-only">{caption}</caption>}

          <thead className="border-b border-line bg-surface-2">
            <tr>
              {expandable && (
                <th scope="col" className={cn(headCell, 'w-10 md:hidden')}>
                  <span className="sr-only">Expand row</span>
                </th>
              )}
              {visible.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={column.headClass}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {state === 'loading' &&
              stateRow(
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center justify-center gap-2 text-sm text-ink-muted"
                >
                  <Loader2
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                  Loading…
                </div>,
              )}

            {state === 'error' &&
              stateRow(
                <div role="alert" className="flex flex-col items-center gap-3 text-center">
                  <AlertTriangle aria-hidden="true" className="size-6 text-status-suspended" />
                  <p className="text-sm font-medium text-ink">
                    {typeof error === 'string' ? error : 'We could not load this list.'}
                  </p>
                  {/* The empty copy must NOT appear here. A27 is exactly this branch
                      rendering as "no records found". */}
                  {onRetry && (
                    <Button variant="default" size="sm" onClick={onRetry}>
                      Try again
                    </Button>
                  )}
                </div>,
              )}

            {state === 'empty' &&
              stateRow(
                <div className="flex flex-col items-center gap-2 text-center">
                  <Inbox aria-hidden="true" className="size-6 text-ink-faint" />
                  <p className="text-sm font-medium text-ink">{emptyTitle}</p>
                  {emptyMessage && <p className="text-sm text-ink-muted">{emptyMessage}</p>}
                </div>,
              )}

            {state === 'rows' &&
              rows.map((row, index) => {
                const key = resolveRowKey(rowKey, row, index) ?? index;
                const isOpen = expanded.has(key);

                return (
                  <Fragment key={key}>
                    <tr className="hover-hover:hover:bg-surface-2">
                      {expandable && (
                        <td className={cn(bodyCell, 'w-10 md:hidden')}>
                          <button
                            type="button"
                            onClick={() => toggle(key)}
                            aria-expanded={isOpen}
                            aria-label={isOpen ? 'Hide details' : 'Show details'}
                            className={cn(
                              'touch-target rounded-sm p-1 text-ink-faint',
                              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring',
                            )}
                          >
                            <ChevronDown
                              aria-hidden="true"
                              className={cn(
                                'size-4 transition-transform duration-(--duration-instant)',
                                isOpen && 'rotate-180',
                              )}
                            />
                          </button>
                        </td>
                      )}

                      {visible.map((column) => {
                        const content = cellValue(column, row, index);
                        return (
                          <td
                            key={column.key}
                            className={column.bodyClass}
                            title={
                              column.truncate && typeof content === 'string' ? content : undefined
                            }
                          >
                            {content}
                          </td>
                        );
                      })}
                    </tr>

                    {expandable && isOpen && (
                      <tr className="md:hidden">
                        <td colSpan={columnCount} className="bg-surface-2 px-3 py-3">
                          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                            {collapsed.map((column) => (
                              <Fragment key={column.key}>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                                  {column.header}
                                </dt>
                                <dd className="min-w-0 break-words text-sm text-ink">
                                  {cellValue(column, row, index)}
                                </dd>
                              </Fragment>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </TableScroller>

      {/* R-SCALE-D. Only when the list on screen is genuinely a prefix of a longer one. */}
      {!loading && !error && typeof total === 'number' && total > rows.length && (
        <p className="text-sm text-ink-muted">
          Showing the first <strong className="font-medium text-ink">{rows.length}</strong> of{' '}
          <strong className="font-medium text-ink">{total}</strong> — refine your search to narrow
          it down.
        </p>
      )}
    </div>
  );
}
