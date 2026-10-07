import { useCallback, useEffect, useRef, useState } from 'react';
import PageTitle from '../../components/common/PageTitle.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import Table from '../../components/table/Table.jsx';
import { Button, TextInput } from '../../components/form';
import { PERMISSIONS } from '../../auth/permissions';
import reportError from '../../lib/reportError.js';
import { formatDateLong, formatInt } from '../../lib/format.js';
import { dodService } from '../../services/dodService.js';
import { messageOf } from '../../services/parseApiError.js';
import { PagerFor, usePagedRead } from './acbPaging.jsx';
import DodGuard from './DodGuard.jsx';
import { DOD_REFUSAL, problemsOf, readFailure, refusalCode, writeOutcome } from './dodRules.js';

/** The server takes at most this many counts at once (dod-api §5), so a longer list is saved in batches of it. */
export const BATCH_SIZE = 2000;
/** "Cannot present more then 3 unpaid debits" (Stephne, DOD-03): a count is 0 to 3. */
const MAX_COUNT = 3;
const SOURCE_LIMIT = 100;
/** The opening position sheet: at most 1 MB of `.xlsx` (dod-api §5). */
const SHEET_LIMIT = 1024 * 1024;

const blankRow = (key) => ({ key, number: '', count: '' });

/**
 * A pasted block -- one member to a line, the membership number then the count, split by spaces, tabs or a comma --
 * as rows. A line that is not two parts is kept as typed, for the screen to say what is wrong with it.
 */
export const rowsFromPaste = (text, nextKey) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
  const parts = line.split(/[\s,;]+/);
  return { key: nextKey(), number: parts[0] ?? '', count: parts.length > 1 ? parts.at(-1) : '' };
});

/**
 * Debit Order Deductions -> Unpaid counts: each member's number of unpaids, captured by hand (Stephne, DOD-28 -- "the
 * day before we run", which may be every month, not only at switch-over, Friday item 15). A captured count is the
 * member's as at today: their earlier debits are replaced by it and later ones count on from it; 0 clears a member,
 * and a member at three is not debited again until an ending is confirmed or a new count is captured (DOD-03).
 * Below it, the counts on record and the opening arrears position from the old system (D24). DOD_PREPARE.
 */
export default function DodUnpaidCounts() {
  return (
    <Page>
      <PageTitle title="Unpaid counts" subtitle="Each member's number of unpaids, captured by hand: at switch-over, or whenever a count must be set" />
      <DodGuard permissions={[PERMISSIONS.DOD_PREPARE]}>
        <CountsScreen />
      </DodGuard>
    </Page>
  );
}

function CountsScreen() {
  const [recorded, setRecorded] = useState(0);
  return (
    <div className="max-w-5xl">
      <Capture onCaptured={() => setRecorded((n) => n + 1)} />
      <CountsOnRecord key={recorded} />
      <OpeningPosition />
    </div>
  );
}

function Capture({ onCaptured }) {
  // The first line's key is 0; every line added after it takes the next (a ref is never read while rendering).
  const keys = useRef(1);
  const nextKey = () => keys.current++;
  const [source, setSource] = useState('');
  const [rows, setRows] = useState(() => [blankRow(0)]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [problems, setProblems] = useState([]);
  const numberFields = useRef(new Map());
  const focusKey = useRef(null);

  useEffect(() => {
    if (focusKey.current == null) return;
    numberFields.current.get(focusKey.current)?.focus();
    focusKey.current = null;
  }, [rows]);

  const change = (key, field, value) => setRows((all) => all.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  const addRow = () => {
    const key = nextKey();
    focusKey.current = key;
    setRows((all) => [...all, blankRow(key)]);
  };
  const removeRow = (key) => setRows((all) => (all.length > 1 ? all.filter((row) => row.key !== key) : all));

  // A block pasted into a membership number becomes one row a line; one number pasted is just typed.
  const paste = (key) => (event) => {
    const text = event.clipboardData?.getData('text') ?? '';
    if (!/\n/.test(text.trim())) return;
    event.preventDefault();
    const pasted = rowsFromPaste(text, nextKey);
    setRows((all) => {
      const at = all.findIndex((row) => row.key === key);
      const keep = all.filter((row, i) => i !== at || row.number || row.count);
      return [...keep.slice(0, at < 0 ? keep.length : at), ...pasted, ...keep.slice(at < 0 ? keep.length : at)];
    });
  };

  const filled = rows.filter((row) => row.number.trim() || row.count.trim());
  const numbers = filled.map((row) => row.number.trim().toUpperCase());
  const rowProblem = (row) => {
    const number = row.number.trim();
    if (!number && !row.count.trim()) return null;
    if (!/^[A-Za-z0-9-]{1,20}$/.test(number)) return 'Type the membership number as the record shows it.';
    if (!/^[0-3]$/.test(row.count.trim())) return `The count is a whole number from 0 to ${MAX_COUNT}.`;
    if (numbers.filter((n) => n === number.toUpperCase()).length > 1) return `${number} is typed twice.`;
    return null;
  };
  const invalid = filled.filter(rowProblem).length;
  const trimmedSource = source.trim();
  const why = !trimmedSource ? 'Say where the counts come from first.'
    : trimmedSource.length > SOURCE_LIMIT ? `Keep the source to ${SOURCE_LIMIT} characters.`
      : !filled.length ? 'Type the first member’s count.'
        : invalid ? `${invalid} line${invalid === 1 ? ' needs' : 's need'} correcting first.` : null;

  const save = async () => {
    if (why || busy) return;
    setBusy(true);
    setNotice(null);
    setProblems([]);
    const entries = filled.map((row) => ({ membershipNumber: row.number.trim(), unpaidCount: Number(row.count.trim()) }));
    const totals = { captured: 0, unchanged: 0, atThree: 0, countedOn: null };
    let saved = 0;
    try {
      // In batches the server takes, one after another: a refused batch stops the rest, and says how far it got.
      for (let at = 0; at < entries.length; at += BATCH_SIZE) {
        const batch = entries.slice(at, at + BATCH_SIZE);
        const answer = await dodService.captureUnpaidCounts(trimmedSource, batch);
        totals.captured += answer?.captured ?? 0;
        totals.unchanged += answer?.unchanged ?? 0;
        totals.atThree += answer?.atThree ?? 0;
        totals.countedOn = answer?.countedOn ?? totals.countedOn;
        saved += batch.length;
      }
      setRows([blankRow(nextKey())]);
      setNotice({
        tone: 'ok',
        message: `Captured ${formatInt(totals.captured)} count${totals.captured === 1 ? '' : 's'}`
          + `${totals.unchanged ? `; ${formatInt(totals.unchanged)} were already so` : ''}`
          + `${totals.countedOn ? `, counted on ${formatDateLong(totals.countedOn)}` : ''}.`
          + (totals.atThree ? ` ${formatInt(totals.atThree)} member${totals.atThree === 1 ? ' is' : 's are'} at three: not debited again until an ending is confirmed or a new count is captured.` : ''),
      });
      onCaptured();
    } catch (err) {
      reportError('DodUnpaidCounts.capture', err);
      const before = saved ? `The first ${formatInt(saved)} were saved. ` : '';
      if (refusalCode(err) === DOD_REFUSAL.UNPAID_COUNTS_INVALID) {
        setNotice({ message: `${before}Nothing more was saved. Correct these and save again:` });
        setProblems(problemsOf(err));
      } else {
        setNotice({ message: `${before}${writeOutcome(err, saved ? 'The rest' : 'The counts').message}` });
      }
      if (saved) onCaptured();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet className="mt-6" aria-labelledby="dod-capture-heading">
      <div className="border-b border-line px-6 py-4">
        <h2 id="dod-capture-heading" className="text-base font-semibold text-ink">Capture counts</h2>
        <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
          One member a line: the membership number, then the number of unpaids, 0 to 3. Enter on a count adds the next
          line, and a list pasted into a membership number fills a line for each member. A count replaces the member’s
          count as at today; 0 clears it.
        </p>
      </div>
      {notice && <div className="px-6 pt-4"><DialogNotice notice={notice} onDismiss={() => setNotice(null)} /></div>}
      {problems.length > 0 && (
        <ul className="mx-6 mt-2 list-disc pl-5 text-sm text-status-suspended">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
      )}
      <div className="grid gap-4 px-6 py-4">
        <TextInput label="Where the counts come from" value={source} onChange={(e) => setSource(e.target.value)} disabled={busy}
          hint={`For example, “The old system's re-debit list, October 2026”. At most ${SOURCE_LIMIT} characters.`} />
        <ol className="grid gap-3" aria-label="Members and their counts">
          {rows.map((row, index) => {
            const problem = rowProblem(row);
            return (
              <li key={row.key} className="grid gap-1">
                <div className="flex flex-wrap items-end gap-3">
                  <TextInput
                    ref={(field) => { if (field) numberFields.current.set(row.key, field); else numberFields.current.delete(row.key); }}
                    className="w-48" label={`Membership no. ${index + 1}`} kind="reference" value={row.number} disabled={busy}
                    onChange={(e) => change(row.key, 'number', e.target.value)} onPaste={paste(row.key)} />
                  <TextInput className="w-28" label="Unpaids" kind="number" value={row.count} disabled={busy}
                    onChange={(e) => change(row.key, 'count', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRow(); } }} />
                  <Button variant="ghost" onClick={() => removeRow(row.key)} disabled={rows.length === 1 || busy}
                    aria-label={`Remove line ${index + 1}`}>
                    Remove
                  </Button>
                </div>
                {problem && <p className="text-sm text-status-suspended">{problem}</p>}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={addRow} disabled={busy}>Add a line</Button>
          <Button variant="primary" onClick={save} loading={busy} disabled={Boolean(why)} aria-describedby={why ? 'dod-counts-why' : undefined}>
            Save {filled.length || ''} count{filled.length === 1 ? '' : 's'}
          </Button>
          {why && <p id="dod-counts-why" className="text-sm text-ink-muted">{why}</p>}
        </div>
      </div>
    </Sheet>
  );
}

function CountsOnRecord() {
  const read = useCallback((page, size) => dodService.unpaidCounts(page, size), []);
  const { data, state, error, goTo, retry } = usePagedRead(read, { size: 50, label: 'DodUnpaidCounts.read' });
  const columns = [
    { key: 'membershipNumber', header: 'Membership no.', priority: 'essential' },
    { key: 'surname', header: 'Surname', priority: 'secondary', cell: (c) => c.surname ?? '—' },
    { key: 'unpaidCount', header: 'Unpaids', priority: 'essential', cell: (c) => `${c.unpaidCount} of ${MAX_COUNT}` },
    { key: 'countedOn', header: 'As at', priority: 'secondary', cell: (c) => formatDateLong(c.countedOn) },
    { key: 'source', header: 'From', priority: 'detail', nowrap: false, cell: (c) => c.source ?? '—' },
    { key: 'enteredBy', header: 'Captured by', priority: 'detail', cell: (c) => c.enteredBy ?? '—' },
  ];
  return (
    <Sheet className="mt-6" aria-labelledby="dod-counts-heading">
      <div className="border-b border-line px-6 py-4">
        <h2 id="dod-counts-heading" className="text-base font-semibold text-ink">Counts on record</h2>
      </div>
      <Table
        caption="Unpaid counts captured by hand"
        columns={columns}
        rows={data.content}
        rowKey="memberId"
        loading={state === 'loading'}
        error={state === 'error' ? readFailure(error, 'We could not load the counts on record.') : null}
        onRetry={retry}
        emptyTitle="No counts captured yet"
        emptyMessage="Counts captured above appear here, each with the day it is as at."
        dense
      />
      {data.totalPages > 1 && <PagerFor data={data} state={state} goTo={goTo} noun="counts" size={50} />}
    </Sheet>
  );
}

/** The old system's arrears position, uploaded once as a sheet (D24) -- locked once the first run's returns are in. */
function OpeningPosition() {
  const [position, setPosition] = useState({ state: 'loading', data: null, error: null });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const left = useRef(false);
  useEffect(() => () => { left.current = true; }, []);

  const load = useCallback(() => {
    dodService.openingPosition()
      .then((data) => { if (!left.current) setPosition({ state: 'ready', data, error: null }); })
      .catch((err) => { reportError('DodUnpaidCounts.opening', err); if (!left.current) setPosition({ state: 'error', data: null, error: err }); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const why = !file ? null : !/\.xlsx$/i.test(file.name) ? 'Choose the position as an .xlsx sheet.'
    : file.size > SHEET_LIMIT ? 'The sheet is over 1 MB.' : null;

  const upload = async () => {
    if (!file || why || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const data = await dodService.uploadOpeningPosition(file);
      setPosition({ state: 'ready', data, error: null });
      setFile(null);
      setNotice({ tone: 'ok', message: `The opening position is stored: ${formatInt(data?.members)} members.` });
    } catch (err) {
      reportError('DodUnpaidCounts.upload', err);
      const listed = problemsOf(err);
      setNotice({
        message: refusalCode(err) === DOD_REFUSAL.OPENING_POSITION_INVALID && listed.length
          ? `Nothing was stored. ${messageOf(err)} ${listed.join(' ')}`
          : writeOutcome(err, 'The opening position').message,
      });
    } finally {
      setBusy(false);
    }
  };

  const data = position.data && !Array.isArray(position.data) ? position.data : null;
  const disagreements = Array.isArray(data?.disagreements) ? data.disagreements : [];
  return (
    <Sheet className="mt-6" aria-labelledby="dod-opening-heading">
      <div className="border-b border-line px-6 py-4">
        <h2 id="dod-opening-heading" className="text-base font-semibold text-ink">Opening arrears position</h2>
        <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
          The old system’s position at switch-over, uploaded once as a sheet. It can be replaced until the first run’s
          returns are in.
        </p>
      </div>
      {notice && <div className="px-6 pt-4"><DialogNotice notice={notice} onDismiss={() => setNotice(null)} /></div>}
      <div className="grid gap-3 px-6 py-4 text-sm text-ink">
        {position.state === 'loading' && <p className="text-ink-muted">Loading the opening position…</p>}
        {position.state === 'error' && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-status-suspended">
            {readFailure(position.error, 'The opening position could not be loaded.')}
            <Button size="sm" onClick={() => { setPosition({ state: 'loading', data: null, error: null }); load(); }}>Try again</Button>
          </div>
        )}
        {data && (
          <p>
            {data.members ? `${formatInt(data.members)} members, entered by ${data.enteredBy ?? 'someone not recorded'}`
              + `${data.enteredAt ? ` on ${formatDateLong(data.enteredAt.slice(0, 10))}` : ''}.` : 'No opening position has been stored.'}
            {data.locked && ` Locked since ${formatDateLong(String(data.lockedSince ?? '').slice(0, 10))}: the first run’s returns are in.`}
          </p>
        )}
        {disagreements.length > 0 && (
          <div>
            <p className="font-medium">Arrears that do not match their unpaids at the flat rate ({formatInt(disagreements.length)}):</p>
            <ul className="mt-1 grid gap-0.5 text-ink-muted">
              {disagreements.map((d) => (
                <li key={d.membershipNumber}>{d.membershipNumber}: {d.unpaidsStanding} unpaid{d.unpaidsStanding === 1 ? '' : 's'}, arrears R {d.arrearsBalance}</li>
              ))}
            </ul>
          </div>
        )}
        {data && !data.locked && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-medium text-ink">
              The sheet (.xlsx, at most 1 MB)
              <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy}
                className="text-sm text-ink-muted" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <Button variant="primary" onClick={upload} loading={busy} disabled={!file || Boolean(why)}>
              {data.members ? 'Replace the position' : 'Upload the position'}
            </Button>
            {why && <p className="basis-full text-sm text-status-suspended">{why}</p>}
          </div>
        )}
      </div>
    </Sheet>
  );
}
