import { useCallback, useEffect, useRef, useState } from 'react';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import Table from '../../components/table/Table.jsx';
import Modal, { ModalClose, closeOn } from '../../components/overlay/Modal.jsx';
import { Button, DateField, SelectInput, TextInput } from '../../components/form';
import { useAuth } from '../../auth/useAuth';
import { PERMISSIONS } from '../../auth/permissions';
import reportError from '../../lib/reportError.js';
import { formatDateLong, formatInt } from '../../lib/format.js';
import { dodService } from '../../services/dodService.js';
import { DECISION_LABEL, RUN_STATUS, UNPAID_REASON_LABEL } from './acbRunRules.js';
import { DOD_REFUSAL, codeSays, memberName, problemsOf, readFailure, refusalCode, writeOutcome } from './dodRules.js';
import { PagerFor, usePagedRead } from './acbPaging.jsx';

/** The server's limits on one returns batch (dod-api §3). */
export const BATCH_LIMIT = 1000;

const blankRow = (key) => ({ key, trace: '', code: '', decision: '' });

/**
 * The bank's returns for a sent run, one report per debit day (Stephne, DOD-05, DOD-06): each day's debits, the
 * unpaids recorded against it, and how many of its reports are in -- and, for whoever prepares runs, recording a
 * day's report as one batch. Recording an unpaid queues its letter at once (DOD-07); nothing reaches a member until
 * the letters review switches sending on.
 */
export default function AcbRunReturns({ run, onChanged }) {
  const { can } = useAuth();
  const records = can(PERMISSIONS.DOD_PREPARE) && run.status !== RUN_STATUS.CLOSED;
  const [days, setDays] = useState({ state: 'loading', rows: [], error: null });
  const [recording, setRecording] = useState(null);
  const left = useRef(false);
  useEffect(() => () => { left.current = true; }, []);

  const ticket = useRef(0);
  const load = useCallback(() => {
    const mine = ++ticket.current;
    dodService.debitDays(run.id)
      // `AcbDebitDaysDto` (dod-api v2 §3): the run's id and its days. Anything else -- the route smoke's `[]` -- is no days.
      .then((answer) => { if (!left.current && mine === ticket.current) setDays({ state: 'ready', rows: Array.isArray(answer?.days) ? answer.days : [], error: null }); })
      .catch((err) => {
        reportError('AcbRunReturns.debitDays', err);
        if (!left.current && mine === ticket.current) setDays({ state: 'error', rows: [], error: err });
      });
  }, [run.id]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'actionDate', header: 'Debit day', priority: 'essential', cell: (day) => formatDateLong(day.actionDate) },
    { key: 'lines', header: 'Debits', priority: 'secondary', cell: (day) => formatInt(day.lines) },
    { key: 'unpaid', header: 'Unpaid', priority: 'essential', cell: (day) => formatInt(day.unpaid) },
    { key: 'batches', header: 'Reports recorded', priority: 'essential', cell: (day) => (day.batches ? formatInt(day.batches) : 'None yet') },
    ...(records ? [{
      key: 'record', header: 'Record', priority: 'essential',
      cell: (day) => (
        <Button onClick={() => setRecording(day.actionDate)} aria-label={`Record the returns for ${formatDateLong(day.actionDate)}`}>
          Record returns
        </Button>
      ),
    }] : []),
  ];

  return (
    <section className="mt-6" aria-labelledby="dod-returns-heading">
      <h3 id="dod-returns-heading" className="text-base font-semibold text-ink">The bank’s returns, by debit day</h3>
      <p className="mt-0.5 text-sm text-ink-muted">
        The Chief Financial Officer downloads one returns report for each debit day from online banking. Record each
        report as it arrives: recording an unpaid queues its letter at once.
      </p>
      <Table
        caption="Debit days and their returns"
        columns={columns}
        rows={days.rows}
        rowKey="actionDate"
        loading={days.state === 'loading'}
        error={days.state === 'error' ? readFailure(days.error, 'We could not load the debit days.') : null}
        onRetry={() => { setDays({ state: 'loading', rows: [], error: null }); load(); }}
        emptyTitle="No debit days"
        emptyMessage="This run has no debits, so no returns are expected."
        dense
      />
      <ReturnsBatches runId={run.id} />
      {recording && (
        <ReturnsDialog
          run={run}
          actionDate={recording}
          onClose={(changed) => {
            setRecording(null);
            if (changed) onChanged();
          }}
        />
      )}
    </section>
  );
}

function ReturnsBatches({ runId }) {
  const read = useCallback((page, size) => dodService.returnsBatches(runId, page, size), [runId]);
  const { data, state, goTo, retry } = usePagedRead(read, { size: 20, label: 'AcbRunReturns.batches' });
  const columns = [
    { key: 'actionDate', header: 'Debit day', priority: 'essential', cell: (b) => formatDateLong(b.actionDate) },
    { key: 'reportDate', header: 'Report of', priority: 'secondary', cell: (b) => formatDateLong(b.reportDate) },
    { key: 'recorded', header: 'Unpaids recorded', priority: 'essential',
      cell: (b) => `${formatInt(b.recorded)}${b.alreadyRecorded ? ` (${formatInt(b.alreadyRecorded)} already on record)` : ''}` },
    { key: 'lettersQueued', header: 'Letters queued', priority: 'secondary', cell: (b) => formatInt(b.lettersQueued) },
    { key: 'recordedBy', header: 'Recorded by', priority: 'detail', cell: (b) => b.recordedBy ?? '—' },
  ];
  return (
    <div className="mt-4">
      <Table
        caption="Returns reports recorded"
        columns={columns}
        rows={data.content}
        rowKey="id"
        loading={state === 'loading'}
        error={state === 'error' ? 'We could not load the reports recorded.' : null}
        onRetry={retry}
        emptyTitle="No returns recorded yet"
        emptyMessage="Each debit day's report appears here once it is recorded."
        dense
      />
      {data.totalPages > 1 && <PagerFor data={data} state={state} goTo={goTo} noun="reports" size={20} />}
    </div>
  );
}

/** What a row says about its code, from the bank codes on record -- or why it cannot say. */
const codeNote = (code, codes) => {
  if (!code) return null;
  if (!codes) return 'The bank codes could not be read, so this code’s meaning is not shown.';
  const known = codes.find((c) => c.bankCode === code);
  return known ? `Code ${code}: ${codeSays(known)}`
    : `Code ${code} is not on the bank codes list: it is recorded as unrecognised, and is not re-debited.`;
};

/**
 * One debit day's report, typed in as one batch: each line by the number after the slash of its trace number (the
 * file's sequence) and its unpaid code, with a decision now or later. All or nothing -- every problem is listed and
 * nothing is recorded until each line is right. The answer names each member recorded, to check against the report.
 */
function ReturnsDialog({ run, actionDate, onClose }) {
  const [reportDate, setReportDate] = useState('');
  const [rows, setRows] = useState([blankRow(1)]);
  const [codes, setCodes] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [problems, setProblems] = useState([]);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [result, setResult] = useState(null);
  const nextKey = useRef(2);
  const focusKey = useRef(null);
  const firstRef = useRef(null);
  // Each line's trace field, by the line's key -- how a line added from the keyboard gets the caret.
  const traceFields = useRef(new Map());

  useEffect(() => {
    let live = true;
    dodService.codes()
      .then((answer) => { if (live) setCodes(Array.isArray(answer?.bankCodes) ? answer.bankCodes : null); })
      .catch((err) => { reportError('AcbRunReturns.codes', err); if (live) setCodes(null); });
    return () => { live = false; };
  }, []);

  // A row added from the keyboard takes the caret, so a report is typed without reaching for the mouse.
  useEffect(() => {
    if (focusKey.current == null) return;
    traceFields.current.get(focusKey.current)?.focus();
    focusKey.current = null;
  }, [rows]);

  const change = (key, field, value) => setRows((all) => all.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  const addRow = () => {
    if (rows.length >= BATCH_LIMIT) return;
    const key = nextKey.current++;
    focusKey.current = key;
    setRows((all) => [...all, blankRow(key)]);
  };
  const removeRow = (key) => setRows((all) => (all.length > 1 ? all.filter((row) => row.key !== key) : all));

  const filled = rows.filter((row) => row.trace.trim() || row.code.trim());
  const traces = filled.map((row) => row.trace.trim());
  const rowProblem = (row) => {
    const trace = row.trace.trim();
    const code = row.code.trim();
    if (!trace && !code) return null;
    if (!/^\d{1,6}$/.test(trace) || Number(trace) < 1) return 'The trace number is the number after the slash, up to six digits.';
    if (!/^\d{1,3}$/.test(code)) return 'The unpaid code is the bank’s number, up to three digits.';
    if (traces.filter((t) => t === trace).length > 1) return `Trace number ${trace} is typed twice.`;
    return null;
  };
  const invalid = filled.filter(rowProblem).length;
  const why = !filled.length ? 'Type the first line of the report.'
    : invalid ? `${invalid} line${invalid === 1 ? ' needs' : 's need'} correcting first.` : null;

  const reDebitOf = (code) => codes?.find((c) => c.bankCode === code.trim())?.reDebit;

  const record = async () => {
    if (why || busy) return;
    setBusy(true);
    setNotice(null);
    setProblems([]);
    try {
      const answer = await dodService.recordReturns(run.id, {
        actionDate,
        reportDate: reportDate || undefined,
        entries: filled.map((row) => ({ fileSequence: Number(row.trace.trim()), code: row.code.trim(), decision: row.decision || undefined })),
      });
      setResult(answer);
    } catch (err) {
      reportError('AcbRunReturns.record', err);
      if (refusalCode(err) === DOD_REFUSAL.RETURNS_BATCH_INVALID) {
        setNotice({ message: 'Nothing was recorded. Correct these lines and record the report again:' });
        setProblems(problemsOf(err));
      } else {
        const outcome = writeOutcome(err, 'The report');
        setNotice({ message: outcome.message });
        setUnconfirmed(outcome.landed);
      }
    } finally {
      setBusy(false);
    }
  };

  const day = formatDateLong(actionDate);
  const done = result != null;
  return (
    <Modal
      open
      onOpenChange={closeOn(() => onClose(done || unconfirmed))}
      title={`Returns for ${day}`}
      description={done ? 'Check each member against the bank’s report.'
        : 'Type each line of the bank’s report for this debit day: the number after the slash of its trace number, and its unpaid code.'}
      size="xl"
      busy={busy}
      initialFocusRef={done ? undefined : firstRef}
      footer={done || unconfirmed ? <ModalClose>Close</ModalClose> : (
        <>
          {why && <p id="dod-returns-why" className="mr-auto text-sm text-ink-muted">{why}</p>}
          <ModalClose>Cancel</ModalClose>
          <Button variant="primary" loading={busy} disabled={Boolean(why)} onClick={record}
            aria-describedby={why ? 'dod-returns-why' : undefined}>
            Record {filled.length || ''} {filled.length === 1 ? 'unpaid' : 'unpaids'}
          </Button>
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
      {problems.length > 0 && (
        <ul className="mb-4 list-disc pl-5 text-sm text-status-suspended">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
      )}
      {done ? <BatchResult result={result} day={day} /> : (
        <div className="grid gap-4">
          <DateField label="Report date (optional)" name="reportDate" value={reportDate} max="today"
            onChange={(e) => setReportDate(e.target.value)} disabled={busy || unconfirmed} />
          <ol className="grid gap-3" aria-label="Lines of the report">
            {rows.map((row, index) => {
              const problem = rowProblem(row);
              const note = codeNote(row.code.trim(), codes);
              const reDebit = reDebitOf(row.code);
              return (
                <li key={row.key} className="grid gap-1 border-b border-line pb-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <TextInput
                      ref={(field) => {
                        if (field) traceFields.current.set(row.key, field);
                        else traceFields.current.delete(row.key);
                        if (index === 0) firstRef.current = field;
                      }}
                      className="w-32"
                      label={`Trace no. ${index + 1}`} kind="number" value={row.trace} disabled={busy || unconfirmed}
                      onChange={(e) => change(row.key, 'trace', e.target.value)} />
                    <TextInput className="w-28" label="Unpaid code" kind="number" value={row.code} disabled={busy || unconfirmed}
                      onChange={(e) => change(row.key, 'code', e.target.value)} />
                    <SelectInput className="w-44" label="Decision" value={row.decision} disabled={busy || unconfirmed}
                      onChange={(value) => change(row.key, 'decision', value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && index === rows.length - 1) { e.preventDefault(); addRow(); } }}
                      options={[
                        { value: '', label: 'Decide later' },
                        { value: 'RE_PRESENT', label: DECISION_LABEL.RE_PRESENT, disabled: reDebit !== 'YES' },
                        { value: 'SUSPEND', label: DECISION_LABEL.SUSPEND },
                      ]} />
                    <Button variant="ghost" onClick={() => removeRow(row.key)} disabled={rows.length === 1 || busy || unconfirmed}
                      aria-label={`Remove line ${index + 1}`}>
                      Remove
                    </Button>
                  </div>
                  {problem && <p className="text-sm text-status-suspended">{problem}</p>}
                  {!problem && note && <p className="text-sm text-ink-muted">{note}</p>}
                </li>
              );
            })}
          </ol>
          <div>
            <Button onClick={addRow} disabled={rows.length >= BATCH_LIMIT || busy || unconfirmed}>Add a line</Button>
            <p className="mt-1 text-sm text-ink-muted">
              Enter on a line’s decision adds the next line. Present again is offered only for a code that may be re-debited.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

function BatchResult({ result, day }) {
  const lines = Array.isArray(result.lines) ? result.lines : [];
  return (
    <div className="grid gap-3">
      <p role="status" className="text-sm text-ink">
        Recorded {formatInt(result.recorded)} unpaid{result.recorded === 1 ? '' : 's'} for {day}
        {result.alreadyRecorded ? ` (${formatInt(result.alreadyRecorded)} already on record, unchanged)` : ''}.
        {' '}{formatInt(result.lettersQueued)} letter{result.lettersQueued === 1 ? '' : 's'} queued.
      </p>
      {lines.length > 0 && (
        <ul className="grid gap-1 text-sm" aria-label="Members recorded">
          {lines.map((line) => (
            <li key={line.id}>
              {line.membershipNumber} · {memberName(line)} · code {line.unpaidCode}
              {line.unpaidReason ? ` (${UNPAID_REASON_LABEL[line.unpaidReason] ?? line.unpaidReason})` : ''}
              {line.decision ? ` · ${DECISION_LABEL[line.decision]}` : ' · decision to come'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
