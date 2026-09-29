import { useCallback, useEffect, useRef, useState } from 'react';
import PageTitle from '../../components/common/PageTitle.jsx';
import Criteria, { CRITERION, CRITERION_WIDE } from '../../components/common/Criteria.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import Pager from '../../components/common/Pager.jsx';
import Table from '../../components/table/Table.jsx';
import { Button, SelectInput, TextInput } from '../../components/form';
import { useDebounce } from '../../hooks/useDebounce.js';
import reportError from '../../lib/reportError.js';
import { EMPTY, formatInt } from '../../lib/format.js';
import {
  LIST_EMPTY_REASON, MONTH_END_REFUSAL, emptyReasonSentence, listProvenance, listRows,
} from '../../config/monthEnd.js';
import { referenceService } from '../../services/referenceService.js';
import { workplaceService } from '../../services/workplaceService.js';

/**
 * *Maintenance → Workplaces* -- month end `01.5` (MD61): SASBO's workplaces, one ruled sheet a page at a time, found
 * by name or by R/A number and narrowed by employer, area and committee.
 *
 * 🔑 THE SERVER ORDERS AND PAGES; THIS SCREEN NEVER SORTS AND NEVER NAMES A COLUMN (MR-SEC-22). A request carries a
 * page, its size and the criteria, and nothing else: the order -- the name, then the R/A number -- is the server's, so
 * two pages can never share a row or skip one.
 *
 * 🔴 IT SHOWS NO COUNT OF MEMBERS. That is a figure, and the figures are P2's and P4's, under the small-count rule.
 * *Staff* is the staff complement, and at *names* the server answers none (MD62): the absence mark, never a 0.
 *
 * Mocked first for the design session (D7): `planning/branches/monthly-menu/mockups/workplaces.html`.
 */

/** A page: fifty rows, as the A.C.B. sheets are. The server's ceiling is two hundred (MR-PERF-12). */
export const PAGE_SIZE = 50;

/** The box holds what the server reads and no more: a longer term is refused `REQUEST_MALFORMED` (MR-SEC-22). */
export const SEARCH_MAX = 100;

/** How long typing must pause before the search is asked (MR-PERF-12) -- `useDebounce`'s own. */
export const SEARCH_PAUSE_MS = 400;

/**
 * Why no workplace is on record here: one sentence for each of the server's four words (ME-19), held to them by
 * `Workplaces.test.jsx`. The lists' own sentences (`LIST_EMPTY_REASON`) are a control's -- short enough for a select --
 * and these have a sheet to fill. A word the browser does not know is shown as the server wrote it.
 */
export const NONE_ON_RECORD = {
  NOT_CONFIRMED: 'SASBO’s workplaces are loaded once SASBO has confirmed them.',
  NOT_LOADED: 'SASBO’s workplaces are not loaded on this demonstration yet.',
  FAILED: 'SASBO’s workplaces could not be loaded. Tell the person who looks after the system.',
  EMPTY: 'SASBO’s list of workplaces has nothing on it.',
};

/** MV-36: an answer that is not a page -- or not a list -- is *not available*, never an empty list. */
const NOT_AVAILABLE = 'The workplaces are not available here.';

const NO_FILTERS = { employer: '', area: '', committee: '' };
const NO_ROWS = [];

/**
 * The lists the criteria choose from (01.1), each read by its own route. They are asked for once the first page has
 * answered -- never at first paint (MD69) -- and kept for the visit: a native select cannot be opened onto a list
 * that has not arrived, so "when the control is opened" is as soon after the page as the page allows.
 */
const LISTS = {
  employer: referenceService.getEmployers,
  area: referenceService.getAreas,
  committee: referenceService.getCommittees,
};
const LIST_NAMES = { employer: 'employers', area: 'areas', committee: 'committees' };

const areaLabel = (row) => (row.region ? `${row.letter} · ${row.region}` : row.letter);
const committeeLabel = (row) => (row.name ? `${row.code} · ${row.name}` : row.code);
const inWords = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]);

/** Workplace · R/A number · Employer · Area · Committee · Staff. Every absent value is the one absence mark. */
const COLUMNS = [
  { key: 'name', header: 'Workplace', truncate: true, className: 'font-medium' },
  { key: 'raNumber', header: 'R/A number', className: 'tabular-nums' },
  { key: 'employer', header: 'Employer', priority: 'secondary', truncate: true, cell: (w) => w.employer ?? w.employerPrinted ?? EMPTY },
  { key: 'area', header: 'Area', priority: 'secondary', cell: (w) => w.area ?? EMPTY },
  { key: 'committee', header: 'Committee', priority: 'secondary', truncate: true, cell: (w) => w.committeeName ?? w.committee ?? EMPTY },
  { key: 'staffComplement', header: 'Staff', align: 'right', className: 'tabular-nums', cell: (w) => formatInt(w.staffComplement) },
];

export default function Workplaces() {
  const [text, setText] = useState('');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [paging, setPaging] = useState({ page: 0 });
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState({});
  const [onRecord, setOnRecord] = useState(null);
  const [movedFrom, setMovedFrom] = useState(null);
  const [lists, setLists] = useState({});
  const listsAsked = useRef(false);

  // The search asks from the second character, once typing pauses (MR-PERF-12). An emptied box asks at once.
  const typed = text.trim();
  const settled = useDebounce(typed, SEARCH_PAUSE_MS);
  const search = typed && settled.length > 1 ? settled : '';

  const { employer, area, committee } = filters;
  const filtered = Boolean(search || employer || area || committee);
  const asking = JSON.stringify([search, employer, area, committee]);
  // A page belongs to the question it was turned for, so a new question starts at the first page by itself.
  const page = paging.asking === asking ? paging.page : 0;
  const key = `${asking}${page}/${attempt}`;

  const askFor = useCallback((name) => {
    LISTS[name]()
      .then((list) => {
        if (!listRows(list)) throw NOT_AVAILABLE;
        setLists((all) => ({ ...all, [name]: { list } }));
      })
      .catch((error) => {
        reportError(`Workplaces.${name}`, error);
        setLists((all) => ({ ...all, [name]: { error } }));
      });
  }, []);

  useEffect(() => {
    // THE TICKET (MR-PERF-12): a newer question -- or leaving the page -- retires this one, and its answer is dropped.
    let current = true;
    workplaceService.getWorkplaces({ page, size: PAGE_SIZE, search, employer, area, committee })
      .then((data) => {
        if (!current) return;
        if (!Array.isArray(data?.content)) throw NOT_AVAILABLE;
        setAnswer({ key, data });
        if (!filtered) setOnRecord(data.totalElements);
      })
      .catch((error) => {
        if (!current) return;
        reportError('Workplaces.read', error);
        if (page && error?.body?.code === MONTH_END_REFUSAL.WORKPLACE_PAGE_INVALID) {
          // The list changed under the pager and that page is gone: back to the first, and the screen says so.
          setPaging({ page: 0 });
          setMovedFrom(asking);
        } else {
          setAnswer({ key, error });
        }
      })
      .finally(() => {
        if (!current || listsAsked.current) return;
        listsAsked.current = true;
        Object.keys(LISTS).forEach(askFor);
      });
    return () => {
      current = false;
    };
  }, [key, page, search, employer, area, committee, filtered, asking, askFor]);

  // A request that has not answered is not an answer (SCREEN-CONTRACT §2): nothing is counted until it has.
  const loading = answer.key !== key;
  const failed = loading ? null : answer.error;
  const data = loading ? null : answer.data;
  const rows = data?.content ?? NO_ROWS;
  const size = data?.size || PAGE_SIZE;
  const noneOnRecord = Boolean(data?.reason) || !filtered;

  const field = (name) => {
    const entry = lists[name];
    return {
      value: filters[name],
      onChange: (value) => setFilters((all) => ({ ...all, [name]: value })),
      options: listRows(entry?.list) ?? NO_ROWS,
      loading: !entry,
      loadError: entry?.error,
      onRetryLoad: () => {
        setLists((all) => ({ ...all, [name]: null }));
        askFor(name);
      },
      // An empty list says why, never an empty control (ME-19).
      emptyLabel: emptyReasonSentence(entry?.list?.reason) || LIST_EMPTY_REASON.EMPTY,
    };
  };

  // Where the criteria's lists were read from, and whether SASBO has confirmed them (MD28) -- a line for each answer.
  const provenance = {};
  for (const name of Object.keys(LISTS)) {
    const line = listProvenance(lists[name]?.list);
    if (line) provenance[line] = [...(provenance[line] ?? []), LIST_NAMES[name]];
  }

  return (
    <Page>
      <PageTitle title="Workplaces" subtitle="SASBO’s workplaces, a page at a time. Find one by its name or its R/A number." />

      <Criteria className="mt-5">
        <TextInput
          className={CRITERION_WIDE}
          label="Workplace or R/A number"
          kind="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Two characters or more"
          maxLength={SEARCH_MAX}
        />
        <SelectInput className={CRITERION_WIDE} label="Employer" placeholder="All employers" optionValue="id" optionLabel="name" {...field('employer')} />
        <SelectInput className={CRITERION} label="Area" placeholder="All areas" optionValue="letter" optionLabel={areaLabel} {...field('area')} />
        <SelectInput className={CRITERION_WIDE} label="Committee" placeholder="All committees" optionValue="code" optionLabel={committeeLabel} {...field('committee')} />
        <Button variant="ghost" onClick={() => { setText(''); setFilters(NO_FILTERS); }}>Clear</Button>
      </Criteria>

      {movedFrom === asking && !page && (
        <p role="status" className="mt-4 text-sm text-ink-muted">That page no longer exists, so the list is back at its first page.</p>
      )}

      <Sheet className="mt-4">
        {/* The number of workplaces on record -- of WORKPLACES, from the last read that asked for all of them. */}
        {onRecord > 0 && (
          <p className="border-b border-line px-5 py-3 text-sm text-ink-muted">
            <b className="font-semibold tabular-nums text-ink">{formatInt(onRecord)}</b> workplace{onRecord === 1 ? '' : 's'} on record
          </p>
        )}
        <Table
          caption="SASBO’s workplaces"
          columns={COLUMNS}
          rows={rows}
          rowKey="id"
          loading={loading}
          error={failed}
          errorMessage="The workplaces did not load, so this is not an empty list."
          onRetry={() => setAttempt((n) => n + 1)}
          emptyTitle={noneOnRecord ? 'No workplace is on record here.' : 'No workplace matches these criteria.'}
          emptyMessage={noneOnRecord
            ? NONE_ON_RECORD[data?.reason] ?? emptyReasonSentence(data?.reason)
            : 'Clear the criteria to see every workplace on record.'}
        />
        {!(data && noneOnRecord && !rows.length) && (
          <Pager
            page={page + 1}
            totalPages={Math.max(data?.totalPages ?? 1, 1)}
            onPageChange={(next) => {
              setPaging({ asking, page: next - 1 });
              setMovedFrom(null);
            }}
            count={data?.totalElements ?? 0}
            start={page * size + 1}
            end={page * size + rows.length}
            noun="workplaces"
            loading={loading}
            error={Boolean(failed)}
          />
        )}
      </Sheet>

      {Object.entries(provenance).map(([line, names]) => (
        <p key={line} className="mt-3 text-sm text-ink-muted">SASBO’s {inWords(names)}: {line}</p>
      ))}
    </Page>
  );
}
