import { useEffect, useRef, useState } from 'react';

import Criteria, { CRITERION, CRITERION_WIDE } from '../../components/common/Criteria.jsx';
import Sheet from '../../components/common/Sheet.jsx';
import SelectInput from '../../components/form/SelectInput.jsx';
import FigureStrip from '../../components/members/FigureStrip.jsx';
import Table from '../../components/table/Table.jsx';
import {
  SUMMARY_GROUPING, UNGROUPED_BECAUSE, WORKPLACES_SERVED, listRows, listsProvenance, monthLabel, monthsTo, placeOptions,
  placeQuery, summaryOf, unplacedSentence,
} from '../../config/monthEnd.js';
import { formatInt, formatPercent } from '../../lib/format.js';
import reportError from '../../lib/reportError.js';
import { getAreas, getRegions, getStatus } from '../../services/referenceService.js';
import { summaryService } from '../../services/summaryService.js';

/**
 * THE FIGURES ON THE FIRST SCREEN -- month end `02.3`, *"the eye of SASBO"* (SASBO's 22 Sep agenda). The strip and the
 * sheet of `planning/branches/monthly-menu/screens.md` §0.1, from ONE answer of `GET /api/members/summary`.
 *
 * 🔑 A CHUNK OF ITS OWN, ASKED FOR AFTER THE MENU HAS PAINTED (MD69). `Home.jsx` renders the menu rows at once and
 * this after them, so the rows never wait on the figures' code, on their request, or on their failure. The first paint
 * is ONE request -- the summary. The areas and regions are asked for when their control is opened, and kept.
 *
 * 🔴 THE FIRST REQUEST NAMES NO MONTH (MD55). The server answers for its own month, in Johannesburg, and the screen
 * shows that month; the months offered are counted back from it. The browser's clock decides nothing.
 *
 * The five states, and what each shows:
 *   loading   the strip's shimmer, the sheet's skeleton -- no figure until one was read (K1);
 *   error     the strip's "—, not available", the sheet's sentence and, where it can work, *Try again*;
 *   ready     the strip with every figure's definition (ME-10), the sheet and its total, the lines beneath;
 *   empty     a register of nobody: the strip reads nought, the sheet says so in a sentence;
 *   partial   a RELOAD that failed (ME-16): the strip keeps the figures it had and says when they were read, and the
 *             sheet says it could not be loaded -- never the old sheet under the new heading.
 * Nothing here asks again by itself (ME-23): a request is the first paint's, or one a person asked for.
 */

/** An answer this screen cannot read -- the wrong shape, or an older server's 404 or 500 (MV-36, MR-ROB-31). */
const NOT_AVAILABLE = 'The figures are not available from this server yet.';

/**
 * What a failed read is, to a person. An older server takes `summary` for a member's number and answers 500 -- or
 * 404 -- and an answer of the wrong shape is no answer: each is *not available*, and trying again changes nothing.
 * Anything else is said as it came: `SUMMARY_UNAVAILABLE`'s *try again in a moment*, or the network's sentence.
 */
const failureOf = (error) =>
  !error || error.status === 404 || error.status === 500 ? { message: NOT_AVAILABLE, retryable: false } : error;

const GROUPINGS = Object.entries(SUMMARY_GROUPING).map(([value, label]) => ({ value, label }));
const ALL_AREAS = placeOptions([], []);

/**
 * The strip: the three figures of one instrument together (MD24), *Paying members* leading as SASBO's own reports
 * lead with it (MM57 is SASBO's to settle), then the month's movement and the penetration -- each saying what it
 * counted.
 */
const stripOf = (answer) => {
  const totals = answer?.totals ?? {};
  const month = monthLabel(answer?.month);
  return [
    { label: 'Paying members', value: totals.paying, definition: 'on record and not suspended' },
    { label: 'Suspended', value: totals.suspended, definition: "by SASBO's suspension codes" },
    { label: 'Members on record', value: totals.onRecord, definition: 'of a status this system knows, and not a leaving one' },
    { label: 'Joined this month', value: totals.joined, definition: `Date Joined in ${month}` },
    { label: 'Left this month', value: totals.left, definition: `left in ${month}, with a deletion code` },
    {
      label: 'Penetration',
      value: totals.penetration == null ? null : formatPercent(totals.penetration),
      definition: `paying members over staff complement${totals.complementOutOfDate ? ': complement out of date' : ''}`,
    },
  ];
};

const count = (key) => (row) => row.figures && formatInt(row.figures[key]);
const NUMBER = { align: 'right', className: 'tabular-nums' };
// The words a figure's cell may hold -- "fewer than five", "complement out of date" -- wrap on a phone rather than
// widen the sheet past it; a figure itself never breaks, its spaces being no-break ones (`format.js`).
const WORDS = { ...NUMBER, nowrap: false };

/**
 * The sheet's columns. 🔴 RULE C: a row of one to four members at a named employer, table code or workplace comes
 * with NO figures (MD27, MD37), and so does the row withheld beside it (MV-19) -- it reads *fewer than five* or
 * *withheld*, and not one number, not even its staff.
 *
 * The marks are the mock's (MO24): a core group's `.core` pill -- small capitals, teal ink on the teal wash -- a word
 * read in place of a figure in the mock's quiet italic, and *complement out of date* in the pending ink, as a flag.
 */
const columnsFor = (by) => [
  {
    key: 'label',
    header: SUMMARY_GROUPING[by],
    // A long employer's name takes a second line on a phone rather than pushing Members off the screen.
    nowrap: false,
    cell: (row) => (row.total ? <strong>{row.label}</strong> : (
      <>
        {row.label}
        {row.core && (
          <>
            {' '}
            <span className="ml-1 rounded-full bg-brand-soft px-[7px] py-px text-xs font-semibold uppercase tracking-[0.08em] text-brand-ink">
              core
            </span>
          </>
        )}
      </>
    )),
  },
  { key: 'staff', header: 'Staff', priority: 'secondary', ...NUMBER, cell: count('complement') },
  {
    key: 'paying',
    header: 'Members',
    ...WORDS,
    cell: (row) => (row.figures ? formatInt(row.figures.paying)
      : <span className="italic text-ink-muted">{row.withheld ? 'withheld' : 'fewer than five'}</span>),
  },
  { key: 'joined', header: 'Joined', priority: 'secondary', ...NUMBER, cell: count('joined') },
  { key: 'left', header: 'Left', priority: 'secondary', ...NUMBER, cell: count('left') },
  { key: 'suspended', header: 'Suspended', priority: 'secondary', ...NUMBER, cell: count('suspended') },
  {
    key: 'penetration',
    header: 'Penetration',
    ...WORDS,
    cell: (row) => row.figures && (
      <>
        {formatPercent(row.figures.penetration)}
        {row.figures.complementOutOfDate && (
          <span className="block text-xs font-medium text-status-pending">complement out of date</span>
        )}
      </>
    ),
  },
];

const note = (text) => text && <p key={text} className="mt-2 text-sm text-ink-muted">{text}</p>;

/**
 * How a past month's figures are grouped (MR-ROB-19, rule F). A month TAKEN is read from what was frozen when it was
 * taken, each member placed as they stood then -- and says so, as the server's answer asks ("as taken on"); a month not
 * taken is worked out now, from where each member works today.
 */
const groupedSentence = (answer) => (answer.takenAt
  ? `As taken: each member is grouped where they stood when ${monthLabel(answer.month)} was taken.`
  : 'Grouped by where each member works today.');

export default function HomeFigures() {
  // What a person asked for. The month starts EMPTY -- the first request names none -- and the grouping as the server's.
  const [ask, setAsk] = useState({ by: 'group', month: '', place: '' });
  // What was read: the newest answer, when, the server's own month, and the newest request's failure.
  const [read, setRead] = useState({ pending: true });
  const [places, setPlaces] = useState(null);
  const placesAsked = useRef(false);
  const [lists, setLists] = useState(null);
  const listsAsked = useRef(false);

  useEffect(() => {
    let current = true;
    summaryService.getSummary({ by: ask.by, month: ask.month, ...placeQuery(ask.place) })
      .then((body) => {
        const answer = summaryOf(body);
        const readAt = new Date();
        if (!current) return;
        setRead((was) => (answer
          ? { answer, readAt, serverMonth: answer.monthFromTheServer ? answer.month : was.serverMonth }
          : { ...was, pending: false, failure: failureOf(null) }));
      })
      .catch((error) => {
        reportError('HomeFigures.summary', error);
        if (current) setRead((was) => ({ ...was, pending: false, failure: failureOf(error) }));
      });
    return () => {
      current = false;
    };
  }, [ask]);

  /*
   * WHICH OF SASBO'S LISTS GROUPED THE SHEET, AND WHETHER SHE HAS CONFIRMED THEM (MD28) -- the line beneath it, from the
   * lists' status read the Workplace control reads too. Asked once the figures say the sheet is grouped -- after the
   * first paint's one request, never with it (MD69) -- and kept for the visit. A read that fails says nothing: the line
   * is where the grouping came from, and no figure waits on it.
   */
  const grouped = read.answer?.workplacesServed === WORKPLACES_SERVED.ALL;
  useEffect(() => {
    if (!grouped || listsAsked.current) return;
    listsAsked.current = true;
    getStatus().then(setLists, (error) => reportError('HomeFigures.lists', error));
  }, [grouped]);
  const groupedBy = listsProvenance(lists);

  /** A person's question: the grouping, the month or the place changed, or *Try again* -- read once, now. */
  const change = (part) => {
    setRead((was) => ({ ...was, pending: true }));
    setAsk((was) => ({ ...was, ...part }));
  };

  /** SASBO's areas and regions, asked for when the control is first opened and kept for the visit (MD69). */
  const askPlaces = () => {
    if (placesAsked.current) return;
    placesAsked.current = true;
    Promise.all([getRegions(), getAreas()])
      .then(([regions, areas]) => setPlaces({ options: placeOptions(listRows(regions) ?? [], listRows(areas) ?? []) }))
      .catch((error) => {
        reportError('HomeFigures.places', error);
        placesAsked.current = false;
        setPlaces({ error });
      });
  };

  const { answer, failure, pending, readAt, serverMonth } = read;
  const view = pending ? 'loading' : !answer ? 'error' : failure ? 'partial' : 'ready';
  const totals = answer?.totals;
  const empty = view === 'ready' && !totals.onRecord && !totals.joined && !totals.left;
  const shown = view === 'ready' || view === 'partial';
  const rows = view === 'ready' && !empty ? answer.rows : [];

  return (
    <section aria-label="SASBO's figures" data-figures={empty ? 'empty' : view} className="mt-6">
      <FigureStrip
        label="The month's figures"
        figures={stripOf(answer)}
        state={view === 'loading' ? 'loading' : view === 'error' ? 'error' : 'ready'}
      />
      {note(view === 'partial'
        && `These are the figures for ${monthLabel(answer.month)}, as read at `
        + `${readAt.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}. `
        + 'The figures asked for since could not be loaded.')}
      {note(shown && answer.seededMembers > 0
        && `${formatInt(answer.seededMembers)} of these members are invented, for demonstration; the staff complement `
        + "is SASBO's own, which is why penetration reads low.")}

      <Criteria className="mt-4" label="Which figures">
        <SelectInput
          className={CRITERION_WIDE}
          label="Month"
          value={ask.month || serverMonth}
          options={serverMonth ? monthsTo(serverMonth) : []}
          loading={!serverMonth && pending}
          emptyLabel="Not known yet"
          onChange={(month) => change({ month })}
        />
        <SelectInput
          className={CRITERION}
          label="Area"
          value={ask.place}
          options={places?.options ?? ALL_AREAS}
          loadError={places?.error}
          onRetryLoad={askPlaces}
          onFocus={askPlaces}
          onMouseDown={askPlaces}
          onChange={(place) => change({ place })}
        />
        <SelectInput
          className={CRITERION_WIDE}
          label="Grouped by"
          value={ask.by}
          options={GROUPINGS}
          onChange={(by) => change({ by })}
        />
      </Criteria>

      <Sheet className="figures-sheet mt-4">
        <Table
          caption={`The figures by ${SUMMARY_GROUPING[ask.by].toLowerCase()}`}
          columns={columnsFor(ask.by)}
          rows={rows}
          rowKey="key"
          loading={view === 'loading'}
          error={view === 'error' || view === 'partial' ? failure : null}
          onRetry={() => change({})}
          emptyTitle="No members are on record yet."
          dense
          // The total is the sheet's foot: a row of the same columns that nothing opens (MO24).
          footer={{ label: 'Total', figures: totals, total: true }}
        />
      </Sheet>
      {view === 'ready' && [
        answer.rows.some((row) => !row.figures)
          && 'A row with fewer than five members shows no figures until administrators sign in, nor does a row '
          + 'that would give one away.',
        !empty && 'Members are paying members: on record and not suspended.',
        unplacedSentence(answer.unplaced),
        UNGROUPED_BECAUSE[answer.workplacesServed],
        answer.month !== serverMonth && groupedSentence(answer),
        grouped && groupedBy && `Grouped by SASBO's lists ${groupedBy.replace('As', 'as')}`,
      ].map(note)}
    </section>
  );
}
