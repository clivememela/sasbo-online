import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import RequirePermission from '../../auth/RequirePermission.jsx';
import { PERMISSIONS } from '../../auth/permissions.js';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import Button from '../../components/form/Button.jsx';
import Field, { controlClasses } from '../../components/form/Field.jsx';
import SelectInput from '../../components/form/SelectInput.jsx';
import TextInput from '../../components/form/TextInput.jsx';
import TableScroller from '../../components/table/TableScroller.jsx';
import { ConfirmDialog } from '../../components/overlay/Modal.jsx';
import { formatInt, formatZar } from '../../lib/format.js';
import reportError from '../../lib/reportError.js';
import { SLOW_NOTICE_MS, messageOf, writeMayHaveLanded } from '../../services/parseApiError.js';
import { getEmployers, getVocabulary, payrollRefusalOf, typeInFile, uploadFile } from '../../services/payrollService.js';
import { instantLabel } from '../admin/monthEndRules.js';
import { IN_TEXT, NavButton, SECTION_HEADING } from './PayrollParts.jsx';
import {
  ACCEPTED_EXTENSIONS, ACCEPT_ATTRIBUTE, COLUMN_FIELDS, DEFAULT_LIMITS, PAYROLL_HOME, fileHref, fileProblem, limitsOf,
  mappingOf, mappingProblems, monthLabel, readHead, recentMonths, sizeLabel, typedAmountOf, REFUSAL,
} from './payrollRules.js';

/**
 * LOAD A FILE -- an employer's payroll file for a month, read and compared with SASBO's members in one press (route 5),
 * or, for an employer whose file is a PDF or a picture (GBS, SA Reserve Bank -- PAY-03), its lines typed in (route 6).
 *
 * The file is checked BEFORE it is sent: its type by name and by its first bytes (a PDF or a picture goes to typed
 * entry), and its size against the server's limit, which the screen states. The server then reads the employer's
 * layout; when it finds no row of headings it knows, the screen asks for each heading as printed and sends again.
 *
 * 🔴 A LOAD IS SAFE TO REPEAT. The same bytes for the same employer and month answer `alreadyLoaded` and load nothing
 * twice, so a timeout, a lost connection or a Cancel is said as unconfirmed -- "load it again" is the honest advice,
 * never "nothing was loaded", which nobody checked. A different file for a month already loaded is replaced only when
 * the administrator says so, in a confirm naming what is there.
 */
export default function PayrollLoad() {
  return (
    <Page>
      <PageTitle
        title="Load an employer’s file"
        subtitle="Choose the employer and the month the deductions are for, then the file the employer sent. It is read and compared with SASBO’s members straight away."
        actions={<NavButton to={PAYROLL_HOME}>All files</NavButton>}
      />
      <RequirePermission permission={PERMISSIONS.PAYROLL_PROCESS}>
        <LoadForm />
      </RequirePermission>
    </Page>
  );
}

const blankLine = (key) => ({ key, staffNumber: '', idNumber: '', initials: '', surname: '', amount: '' });
const LINE_FIELDS = [
  { field: 'staffNumber', label: 'Staff number', width: '9rem' },
  { field: 'idNumber', label: 'ID number', width: '10rem' },
  { field: 'initials', label: 'Initials', width: '5rem' },
  { field: 'surname', label: 'Surname', width: '11rem' },
  { field: 'amount', label: 'Amount (R)', width: '7rem' },
];
const isBlank = (line) => LINE_FIELDS.every(({ field }) => !line[field].trim());

/** Why a typed line cannot be sent, or `null`: someone to match it to, and an amount in rands and cents. */
const lineProblem = (line) => {
  if (!line.staffNumber.trim() && !line.idNumber.trim() && !line.surname.trim()) {
    return 'Give a staff number, an ID number or a surname.';
  }
  return typedAmountOf(line.amount) ? null : 'Give the amount in rands and cents, such as 174.00.';
};

const STOPPED = 'Stopped waiting. The file may still have reached the server: loading it again is safe, because the '
  + 'same file is never loaded twice.';
const UNCONFIRMED = 'The file was sent, but whether it was loaded could not be confirmed. Load it again: the same file '
  + 'is never loaded twice.';

function LoadForm() {
  const navigate = useNavigate();
  const [employers, setEmployers] = useState({ state: 'loading', rows: [] });
  const [asked, setAsked] = useState(0);
  const [limits, setLimits] = useState(DEFAULT_LIMITS);
  const [employerId, setEmployerId] = useState('');
  const [period, setPeriod] = useState('');
  const [typing, setTyping] = useState(false);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [headings, setHeadings] = useState(null);
  const [lookedFor, setLookedFor] = useState('');
  const [lines, setLines] = useState(() => [blankLine(1)]);
  const [statedTotal, setStatedTotal] = useState('');
  const [lineError, setLineError] = useState(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [notice, setNotice] = useState(null);
  const [loaded, setLoaded] = useState(null);
  const cancel = useRef(null);
  const nextKey = useRef(2);

  useEffect(() => {
    let current = true;
    getEmployers()
      .then((rows) => current && setEmployers({ state: 'ready', rows: Array.isArray(rows) ? rows : [] }))
      .catch((error) => {
        reportError('PayrollLoad.employers', error);
        if (current) setEmployers({ state: 'error', rows: [], error });
      });
    return () => { current = false; };
  }, [asked]);

  // The limits the server states; until it answers (or if it cannot), its documented ones.
  useEffect(() => {
    let current = true;
    getVocabulary()
      .then((vocabulary) => current && setLimits(limitsOf(vocabulary)))
      .catch((error) => reportError('PayrollLoad.vocabulary', error));
    return () => { current = false; };
  }, []);

  const employer = employers.rows.find((row) => String(row.id) === employerId) ?? null;
  const unreadable = employer?.readable === false;
  const typed = unreadable || typing;

  const chooseFile = async (event) => {
    const chosen = event.target.files?.[0] ?? null;
    setFile(chosen);
    setHeadings(null);
    setNotice(null);
    if (!chosen) {
      setFileError(null);
      return;
    }
    let head = null;
    try {
      head = await readHead(chosen);
    } catch {
      // Unreadable here is the server's to judge; the name and the size are still checked.
    }
    setFileError(fileProblem(chosen, { maxBytes: limits.maxBytes, head }));
  };

  const filled = lines.filter((line) => !isBlank(line));
  const typedProblem = !typed ? null
    : filled.length === 0 ? 'Type at least one line.'
      : filled.length > limits.maxTypedRows ? `At most ${formatInt(limits.maxTypedRows)} lines can be typed in.`
        : (() => {
          const index = filled.findIndex((line) => lineProblem(line));
          return index === -1 ? null : `Line ${lines.indexOf(filled[index]) + 1}: ${lineProblem(filled[index])}`;
        })();
  const headingProblems = !typed && headings ? mappingProblems(headings) : [];
  const stated = statedTotal.trim() ? typedAmountOf(statedTotal) : null;
  const statedProblem = statedTotal.trim() && !stated ? 'Give the total in rands and cents, such as 1218.00.' : null;
  const typedTotal = filled.reduce((sum, line) => sum + (Number(typedAmountOf(line.amount)) || 0), 0);

  const why = !employerId ? 'Choose the employer.'
    : !period ? 'Choose the month.'
      : typed ? (typedProblem ?? statedProblem)
        : !file ? 'Choose the employer’s file.'
          : fileError?.message ?? headingProblems[0] ?? null;

  const send = async ({ replace = false } = {}) => {
    setTried(true);
    if (why || busy) return;
    setBusy(true);
    setNotice(null);
    setLineError(null);
    setLoaded(null);
    const stop = new AbortController();
    cancel.current = stop;
    const slowly = setTimeout(() => setSlow(true), SLOW_NOTICE_MS);
    try {
      const summary = typed
        ? await typeInFile({
          employerId: Number(employerId),
          period,
          statedTotal: stated,
          rows: filled.map((line) => ({
            staffNumber: line.staffNumber.trim() || null,
            idNumber: line.idNumber.trim() || null,
            initials: line.initials.trim() || null,
            surname: line.surname.trim() || null,
            amount: typedAmountOf(line.amount),
          })),
        }, { cancel: stop.signal })
        : await uploadFile({
          file, employerId, period, replace, columnMapping: headings ? mappingOf(headings) : null,
        }, { cancel: stop.signal });
      navigate(fileHref(summary.id), { state: { loaded: summary.alreadyLoaded ? 'already' : 'new' } });
    } catch (error) {
      reportError('PayrollLoad.send', error);
      const refusal = payrollRefusalOf(error);
      if (error?.kind === 'abort') setNotice({ message: STOPPED });
      else if (refusal?.code === REFUSAL.FILE_EXISTS_FOR_PERIOD) setLoaded({ ...refusal.details, message: error.message });
      else if (refusal?.code === REFUSAL.HEADING_ROW_NOT_FOUND) {
        setHeadings((was) => was ?? {});
        setLookedFor(refusal.details.lookedFor ?? '');
        setNotice({ message: `${error.message} Give the heading of each column below, as printed on the file, and load it again.` });
      } else if (refusal?.code === REFUSAL.TYPED_ENTRY_REQUIRED) {
        setTyping(true);
        setNotice({ message: `${error.message} Type its lines in below.` });
      } else if (refusal?.code === REFUSAL.TYPED_ROWS_INVALID) {
        setLineError({ row: Number(refusal.details.row), field: refusal.details.field });
        setNotice({ message: error.message });
      } else if (writeMayHaveLanded(error)) setNotice({ message: UNCONFIRMED });
      else setNotice({ message: `Nothing was loaded. ${messageOf(error)}` });
    } finally {
      clearTimeout(slowly);
      cancel.current = null;
      setSlow(false);
      setBusy(false);
    }
  };

  const setLine = (key, field, value) =>
    setLines((was) => was.map((line) => (line.key === key ? { ...line, [field]: value } : line)));
  const addLine = () => setLines((was) => [...was, blankLine(nextKey.current++)]);
  const removeLine = (key) => setLines((was) => (was.length > 1 ? was.filter((line) => line.key !== key) : [blankLine(nextKey.current++)]));

  return (
    <Sheet className="mt-6 max-w-4xl gap-5 px-5 py-5">
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />

      <div className="flex flex-wrap gap-4">
        <SelectInput
          className="min-w-[14rem] flex-1 basis-56"
          label="Employer"
          required
          value={employerId}
          placeholder="Choose the employer"
          options={employers.rows.map((row) => ({
            value: String(row.id),
            label: row.readable === false ? `${row.name} (lines typed in)` : row.name,
          }))}
          loading={employers.state === 'loading'}
          loadError={employers.state === 'error' ? employers.error : null}
          onRetryLoad={() => { setEmployers({ state: 'loading', rows: [] }); setAsked((n) => n + 1); }}
          onChange={(value) => { setEmployerId(value); setTyping(false); setHeadings(null); setNotice(null); }}
          disabled={busy}
          error={tried && !employerId ? 'Choose the employer.' : undefined}
        />
        <SelectInput
          className="min-w-[12rem] flex-1 basis-48"
          label="Month the deductions are for"
          required
          value={period}
          placeholder="Choose the month"
          options={recentMonths()}
          onChange={(value) => { setPeriod(value); setNotice(null); }}
          disabled={busy}
          error={tried && !period ? 'Choose the month.' : undefined}
        />
      </div>

      {employer && !typed && (
        <div className="grid gap-2">
          <Field
            label="The employer’s file"
            required
            hint={`Excel or CSV (${ACCEPTED_EXTENSIONS.join(', ')}), up to ${sizeLabel(limits.maxBytes)}.`}
            error={fileError?.message ?? (tried && !file ? 'Choose the employer’s file.' : undefined)}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                disabled={busy}
                onChange={chooseFile}
                className={controlClasses({
                  invalid,
                  className: 'py-1.5 file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-surface-2 '
                    + 'file:px-3 file:py-1 file:text-sm file:font-medium file:text-ink',
                })}
              />
            )}
          </Field>
          {file && !fileError && (
            <p className="text-sm text-ink-muted">{file.name}, {sizeLabel(file.size)}: ready to load.</p>
          )}
          <p className="text-sm text-ink-muted">
            {fileError?.typeIn ? 'This employer’s file cannot be read. ' : 'Is this employer’s file a PDF or a picture? '}
            <button type="button" className={IN_TEXT} onClick={() => { setTyping(true); setNotice(null); }} disabled={busy}>
              Type its lines in instead
            </button>
          </p>
        </div>
      )}

      {employer && !typed && headings && (
        <fieldset className="grid gap-3 rounded-lg border border-line p-4">
          <legend className={`${SECTION_HEADING} px-1`}>The file’s headings</legend>
          <p className="max-w-prose text-sm text-ink-muted">
            Give each heading exactly as printed on the file’s heading row; leave a field empty if the file has no such
            column. The amount, and a staff number, an ID number or a surname, are needed.
            {lookedFor && ` The system looked for headings such as: ${lookedFor}.`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {COLUMN_FIELDS.map(({ field, label }) => (
              <TextInput
                key={field}
                label={label}
                value={headings[field] ?? ''}
                onChange={(event) => setHeadings((was) => ({ ...was, [field]: event.target.value }))}
                disabled={busy}
              />
            ))}
          </div>
          {tried && headingProblems.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-status-suspended">
              {headingProblems.map((problem) => <li key={problem}>{problem}</li>)}
            </ul>
          )}
        </fieldset>
      )}

      {employer && typed && (
        <section aria-labelledby="payroll-typed-heading" className="grid gap-3">
          <h2 id="payroll-typed-heading" className={SECTION_HEADING}>The lines, typed in</h2>
          <p className="max-w-prose text-sm text-ink-muted">
            {unreadable
              ? `${employer.name} sends its deductions as a document that cannot be read, so type each line from it. `
              : 'Type each line from the employer’s document. '}
            One line for each person deducted; leave a line empty to skip it.
            {!unreadable && (
              <>
                {' '}
                <button type="button" className={IN_TEXT} onClick={() => setTyping(false)} disabled={busy}>
                  Load a file instead
                </button>
              </>
            )}
          </p>
          <TableScroller label="Lines typed in from the employer’s document">
            <table className="w-full text-sm">
              <caption className="sr-only">Lines typed in from the employer’s document</caption>
              <thead>
                <tr>
                  <th scope="col" className="px-1 pb-1 text-left text-xs font-semibold uppercase tracking-[0.08em] text-head-ink">Line</th>
                  {LINE_FIELDS.map(({ field, label, width }) => (
                    <th key={field} scope="col" style={{ minWidth: width }} className="px-1 pb-1 text-left text-xs font-semibold uppercase tracking-[0.08em] text-head-ink">
                      {label}
                    </th>
                  ))}
                  <th scope="col" className="px-1 pb-1"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const checked = tried && !isBlank(line);
                  const nobody = !line.staffNumber.trim() && !line.idNumber.trim() && !line.surname.trim();
                  return (
                    <tr key={line.key} data-line={index + 1}>
                      <td className="px-1 py-1 tabular-nums text-ink-muted">{index + 1}</td>
                      {LINE_FIELDS.map(({ field, label }) => {
                        const wrong = (lineError?.row === index + 1 && lineError.field === field)
                          || (checked && (field === 'amount' ? !typedAmountOf(line.amount) : nobody && field !== 'initials'));
                        return (
                          <td key={field} className="px-1 py-1">
                            <input
                              aria-label={`Line ${index + 1}: ${label}`}
                              value={line[field]}
                              inputMode={field === 'amount' ? 'decimal' : undefined}
                              autoComplete="off"
                              aria-invalid={wrong || undefined}
                              disabled={busy}
                              onChange={(event) => setLine(line.key, field, event.target.value)}
                              className={controlClasses({ invalid: wrong, className: 'w-full' })}
                            />
                          </td>
                        );
                      })}
                      <td className="px-1 py-1">
                        <Button size="icon" variant="ghost" aria-label={`Remove line ${index + 1}`} onClick={() => removeLine(line.key)} disabled={busy}>
                          <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroller>
          <div className="flex flex-wrap items-end gap-4">
            <Button onClick={addLine} disabled={busy}>
              <Plus aria-hidden="true" className="size-4 shrink-0" />
              Add a line
            </Button>
            <p className="text-sm text-ink-muted" aria-live="polite">
              {formatInt(filled.length)} {filled.length === 1 ? 'line' : 'lines'}, totalling{' '}
              <span className="font-semibold tabular-nums text-ink">{formatZar(typedTotal)}</span>
            </p>
            <TextInput
              className="ml-auto w-48"
              label="Total printed on the document"
              kind="money"
              value={statedTotal}
              onChange={(event) => setStatedTotal(event.target.value)}
              hint="If it has one."
              error={tried ? statedProblem ?? undefined : undefined}
              disabled={busy}
            />
          </div>
          {tried && typedProblem && <p role="alert" className="text-sm text-status-suspended">{typedProblem}</p>}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => send()} loading={busy} aria-describedby={why ? 'payroll-load-why' : undefined}>
          {typed ? 'Compare the typed lines' : 'Load and compare'}
        </Button>
        {busy && <Button onClick={() => cancel.current?.abort()}>Cancel</Button>}
        {!busy && why && <p id="payroll-load-why" className="text-sm text-ink-muted">{why}</p>}
      </div>
      {busy && (
        <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
          {slow
            ? 'Still comparing: a long file takes a little longer. You can wait, or cancel and load it again later.'
            : typed ? 'Comparing the typed lines with SASBO’s members…' : 'Loading the file and comparing it with SASBO’s members…'}
        </p>
      )}

      <ConfirmDialog
        open={loaded != null}
        onOpenChange={(open) => { if (!open) setLoaded(null); }}
        title="Replace the file already loaded?"
        description={loaded ? `A different file is loaded for ${employer?.name ?? 'this employer'}, ${monthLabel(period)}`
          + `${loaded.uploadedAt ? `: loaded on ${instantLabel(loaded.uploadedAt)}` : ''}${loaded.uploadedBy ? ` by ${loaded.uploadedBy}` : ''}. `
          + 'Replacing it keeps the old file as replaced, and closes its open discrepancies as replaced.' : undefined}
        confirmLabel="Replace the file"
        onConfirm={() => { setLoaded(null); send({ replace: true }); }}
      >
        {loaded?.fileId && (
          <p className="text-sm text-ink-muted">
            <Link className={IN_TEXT} to={fileHref(loaded.fileId)}>Open the file already loaded</Link> to compare first.
          </p>
        )}
      </ConfirmDialog>
    </Sheet>
  );
}
