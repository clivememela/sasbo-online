import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Download, FileSpreadsheet } from 'lucide-react';

import DataState from '../../components/common/DataState.jsx';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import Button from '../../components/form/Button.jsx';
import FigureStrip from '../../components/members/FigureStrip.jsx';
import { formatInt } from '../../lib/format.js';
import reportError from '../../lib/reportError.js';
import { cn } from '../../lib/utils.js';
import { messageOf, writeMayHaveLanded } from '../../services/parseApiError.js';
import {
  compareAgain, downloadDiscrepancies, downloadFullReport, downloadOriginal, getFile, getVocabulary, payrollRefusalOf,
  raiseQueries,
} from '../../services/payrollService.js';
import { instantLabel } from '../admin/monthEndRules.js';
import { ColumnsDialog, DiscrepancyDialog, PaymentDialog } from './PayrollDialogs.jsx';
import { DiscrepancyList, LineList } from './PayrollLists.jsx';
import { IN_TEXT, NavButton, ReadGate, SECTION_HEADING, ToneChip, useDownload, usePayrollAccess } from './PayrollParts.jsx';
import {
  COLUMN_FIELDS, DISCREPANCY_LABEL, DISCREPANCY_STATUS, ENTRY, PAYROLL_HOME, PURGED, RECONCILED, ROW_FILTER, SUPERSEDED, amountOf, dayLabel, differenceLabel, discrepancyLabel, fileHref, fileTitle, idOf,
  monthLabel, paymentStatusOf, percentLabel, queriesHref, rands, REFUSAL,
} from './payrollRules.js';

/**
 * A PAYROLL FILE -- its own address (`/admin/payroll/files/:fileId`), read with GETs only: the summary first (lines,
 * matches, discrepancies by kind, the file's total against what was expected, the employer's fee and the money
 * received -- the payment check, PAY-28), then the discrepancies, or every line with its match.
 *
 * Writes are for an administrator who processes payroll files: compare again (new columns, or the members as they now
 * stand), raise the query list for the employer, record a payment, note and resolve a discrepancy. Every one reads the
 * file again afterwards, so what the page says is what the server holds.
 */
export default function PayrollFile() {
  const { fileId } = useParams();
  const { canRead } = usePayrollAccess();
  const id = idOf(fileId);
  // The page's one heading stands whoever reads it; the notice says what is needed. Nothing is asked of the server.
  if (!canRead) {
    return (
      <Page>
        <PageTitle title="Payroll file" />
        <div className="mt-6 max-w-4xl"><ReadGate>{null}</ReadGate></div>
      </Page>
    );
  }
  return id ? <FileScreen key={id} id={id} /> : <NotFound />;
}

function NotFound({ message }) {
  return (
    <Page>
      <PageTitle title="Payroll file not found" />
      <Sheet className="mt-6 max-w-4xl">
        <DataState
          state="empty"
          layout="row"
          title={message ?? 'There is no payroll file at this address.'}
          message="Files are kept for a year after they are loaded."
          action={<NavButton to={PAYROLL_HOME}>All files</NavButton>}
        />
      </Sheet>
    </Page>
  );
}

function FileScreen({ id }) {
  const [state, setState] = useState('loading');
  const [file, setFile] = useState(null);
  const [failure, setFailure] = useState(null);
  const [asked, setAsked] = useState(0);
  const [vocabulary, setVocabulary] = useState(null);

  useEffect(() => {
    let current = true;
    getFile(id)
      .then((answer) => {
        if (!current) return;
        setFile(answer && typeof answer === 'object' && !Array.isArray(answer) && answer.id != null ? answer : null);
        setState(answer && answer.id != null ? 'ready' : 'missing');
      })
      .catch((error) => {
        reportError('PayrollFile.read', error);
        if (!current) return;
        setFailure(error);
        setState(payrollRefusalOf(error)?.code === REFUSAL.FILE_NOT_FOUND ? 'missing' : 'error');
      });
    return () => { current = false; };
  }, [id, asked]);

  // Outcome and kind labels; the page keeps its own words for the kinds if this cannot be read.
  useEffect(() => {
    let current = true;
    getVocabulary()
      .then((answer) => current && setVocabulary(answer && typeof answer === 'object' ? answer : null))
      .catch((error) => reportError('PayrollFile.vocabulary', error));
    return () => { current = false; };
  }, []);

  const readAgain = () => {
    setState((was) => (was === 'ready' ? was : 'loading'));
    setAsked((n) => n + 1);
  };

  if (state === 'missing') return <NotFound message={failure?.message} />;
  if (state !== 'ready' || !file) {
    return (
      <Page>
        <PageTitle title="Payroll file" />
        <Sheet className="mt-6 max-w-4xl">
          {state === 'error'
            ? <DataState state="error" layout="row" error={failure} title="This payroll file could not be loaded." onRetry={readAgain} />
            : <DataState state="loading" layout="row" title="Reading the file’s results…" />}
        </Sheet>
      </Page>
    );
  }
  return <FileReady file={file} setFile={setFile} vocabulary={vocabulary} readAgain={readAgain} />;
}

function FileReady({ file, setFile, vocabulary, readAgain }) {
  const { canProcess } = usePayrollAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'lines' && file.status !== PURGED ? 'lines' : 'discrepancies';
  // The address's choices, each only as one the lists offer: what a person typed is never sent as a filter.
  const type = DISCREPANCY_LABEL[params.get('type')] ? params.get('type') : '';
  const status = DISCREPANCY_STATUS[params.get('status')] || params.get('status') === 'ALL' ? params.get('status') : '';
  const show = ROW_FILTER[params.get('show')] && params.get('show') !== 'ALL' ? params.get('show') : '';
  const [round, setRound] = useState(0);
  const [notice, setNotice] = useState(() => arrivalNotice(location.state?.loaded, file));
  const [dialog, setDialog] = useState(null);
  const [working, setWorking] = useState(null);
  const downloads = useDownload();
  const live = file.status === RECONCILED;
  const name = fileTitle(file);

  const filter = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  /** The page after a write: the summary from the server's answer (or read again), and the lists asked again. */
  const settled = (answer, message) => {
    if (answer?.id != null) setFile(answer);
    else readAgain();
    setRound((n) => n + 1);
    if (message) setNotice(message);
  };

  const compare = async () => {
    if (working) return;
    setWorking('compare');
    setNotice(null);
    try {
      const answer = await compareAgain(file.id, { version: file.version });
      settled(answer, { tone: 'ok', message: `Compared again: ${formatInt(answer.openDiscrepancies)} discrepancies still open. Any no longer found are resolved as such.` });
    } catch (error) {
      reportError('PayrollFile.compare', error);
      if (payrollRefusalOf(error)?.code === REFUSAL.FILE_CHANGED_SINCE || writeMayHaveLanded(error)) {
        settled(null, { message: `${writeMayHaveLanded(error) ? 'Whether the file was compared again could not be confirmed.' : error.message} The file has been read again.` });
      } else setNotice({ message: `The file was not compared again. ${messageOf(error)}` });
    } finally {
      setWorking(null);
    }
  };

  const raise = async () => {
    if (working) return;
    setWorking('raise');
    setNotice(null);
    try {
      const query = await raiseQueries(file.id);
      navigate(queriesHref(file.id), { state: { raised: query?.id ?? true } });
    } catch (error) {
      reportError('PayrollFile.raise', error);
      if (payrollRefusalOf(error)?.code === REFUSAL.NOTHING_TO_QUERY) setNotice({ message: error.message });
      else if (writeMayHaveLanded(error)) settled(null, { message: 'Whether the query list was raised could not be confirmed. The file has been read again: see its queries before raising another.' });
      else setNotice({ message: `No query list was raised. ${messageOf(error)}` });
    } finally {
      setWorking(null);
    }
  };

  const reportName = (what, format) => `${what} - ${file.employer?.name ?? 'employer'} - ${monthLabel(file.period)}.${format}`;

  return (
    <Page>
      <PageTitle
        title={name}
        subtitle={`${ENTRY[file.entry] ?? 'Loaded'}${file.originalName ? `: ${file.originalName}` : ''}. Loaded on ${instantLabel(file.uploadedAt)}`
          + `${file.uploadedBy ? ` by ${file.uploadedBy}` : ''}${file.retainUntil ? `; kept until ${dayLabel(file.retainUntil)}` : ''}.`}
        actions={<NavButton to={PAYROLL_HOME}>All files</NavButton>}
      />

      <div className="mt-4 max-w-5xl">
        <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
        {file.status === SUPERSEDED && (
          <p className="mb-4 text-sm text-ink-muted" role="status">
            A later file for {file.employer?.name}, {monthLabel(file.period)} replaced this one; its open discrepancies were closed as replaced.
          </p>
        )}
        {file.status === PURGED && (
          <p className="mb-4 text-sm text-ink-muted" role="status">
            Its lines were deleted a year after it was loaded. Its discrepancies and what was done about them are kept.
          </p>
        )}
      </div>

      <section aria-labelledby="payroll-summary-heading" className="max-w-5xl">
        <h2 id="payroll-summary-heading" className="sr-only">Summary</h2>
        <FigureStrip label={`Summary of ${name}`} figures={summaryFigures(file)} className="mt-2" />
        <ByKind file={file} vocabulary={vocabulary} onChoose={(type) => filter({ view: '', type, status: '' })} />
      </section>

      <div className="mt-6 grid max-w-5xl gap-6 lg:grid-cols-2">
        <PaymentCheck file={file} canRecord={canProcess && live} onRecord={() => setDialog({ kind: 'payment' })} />
        <ColumnsRead
          file={file}
          canChange={canProcess && live}
          working={working}
          onChange={() => setDialog({ kind: 'columns' })}
          onCompare={compare}
        />
      </div>

      <div className="mt-6 grid max-w-5xl gap-6 lg:grid-cols-2">
        <Sheet className="gap-3 px-5 py-4">
          <h2 className={SECTION_HEADING}>Queries to the employer</h2>
          {(file.queries ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">No query list raised for this file yet.</p>
          ) : (
            <ul className="grid gap-1 text-sm text-ink">
              {file.queries.map((query) => (
                <li key={query.id}>
                  Raised on {instantLabel(query.raisedAt)}{query.raisedBy ? ` by ${query.raisedBy}` : ''}: {formatInt(query.add)} to add,
                  {' '}{formatInt(query.delete)} to delete, {formatInt(query.correct)} to correct.
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {(file.queries ?? []).length > 0 && <Link className={IN_TEXT} to={queriesHref(file.id)}>Open the queries</Link>}
            {canProcess && live && (
              <Button onClick={raise} loading={working === 'raise'} disabled={working != null}>Raise a query list</Button>
            )}
          </div>
        </Sheet>

        <Sheet className="gap-3 px-5 py-4">
          <h2 className={SECTION_HEADING}>Reports</h2>
          <p className="text-sm text-ink-muted">The discrepancies on their own, or the full report: matched, not matched, missing and the totals.</p>
          <DialogNotice notice={downloads.notice} onDismiss={() => downloads.setNotice(null)} />
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ['discrepancies-xlsx', 'Discrepancies (Excel)', () => downloadDiscrepancies(file.id, 'xlsx'), reportName('Payroll discrepancies', 'xlsx')],
              ['discrepancies-pdf', 'Discrepancies (PDF)', () => downloadDiscrepancies(file.id, 'pdf'), reportName('Payroll discrepancies', 'pdf')],
              ['full-xlsx', 'Full report (Excel)', () => downloadFullReport(file.id, 'xlsx'), reportName('Payroll reconciliation', 'xlsx')],
              ['full-pdf', 'Full report (PDF)', () => downloadFullReport(file.id, 'pdf'), reportName('Payroll reconciliation', 'pdf')],
            ].map(([key, label, fetchFile, fallback]) => (
              <Button key={key} onClick={() => downloads.run(key, fetchFile, fallback)} loading={downloads.busy === key} disabled={downloads.busy != null}>
                <Download aria-hidden="true" className="size-4 shrink-0" />
                {label}
              </Button>
            ))}
          </div>
          {/* The file as it arrived -- the one place every administrator reaches it (PAY-32); kept a year (PAY-39). */}
          {file.entry === 'UPLOAD' && file.status !== PURGED && (
            <Button
              onClick={() => downloads.run('original', () => downloadOriginal(file.id), file.originalName
                ?? reportName('Payroll file', (file.format ?? 'xlsx').toLowerCase()))}
              loading={downloads.busy === 'original'}
              disabled={downloads.busy != null}
            >
              <Download aria-hidden="true" className="size-4 shrink-0" />
              The employer’s file, as it arrived
            </Button>
          )}
        </Sheet>
      </div>

      <Sheet className="mt-6 max-w-5xl" grow>
        <nav aria-label="What the list shows" className="flex gap-1 border-b border-line px-5 pt-3">
          {[['discrepancies', `Discrepancies (${formatInt(file.discrepancies)})`], ...(file.status === PURGED ? [] : [['lines', `Every line (${formatInt(file.rows)})`]])]
            .map(([key, label]) => (
              <Link
                key={key}
                to={`${fileHref(file.id)}${key === 'lines' ? '?view=lines' : ''}`}
                replace
                aria-current={view === key ? 'page' : undefined}
                className={cn(
                  'touch-target px-3 pb-2.5 pt-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring',
                  view === key
                    ? 'font-semibold text-brand-ink shadow-[inset_0_-2px_0_var(--color-brand)]'
                    : 'text-ink-muted hover-hover:hover:text-ink',
                )}
              >
                {label}
              </Link>
            ))}
        </nav>
        {view === 'lines' ? (
          <LineList key={`lines-${round}-${show}`} fileId={file.id} show={show} onFilter={filter} />
        ) : (
          <DiscrepancyList
            key={`d-${round}-${type}-${status}`}
            fileId={file.id}
            vocabulary={vocabulary}
            byType={file.discrepanciesByType}
            type={type}
            status={status}
            onFilter={filter}
            onOpen={(d) => setDialog({ kind: 'discrepancy', id: d.id })}
          />
        )}
      </Sheet>

      {dialog?.kind === 'discrepancy' && (
        <DiscrepancyDialog
          discrepancyId={dialog.id}
          vocabulary={vocabulary}
          canProcess={canProcess}
          onClose={(changed) => { setDialog(null); if (changed) settled(null); }}
        />
      )}
      {dialog?.kind === 'payment' && (
        <PaymentDialog
          file={file}
          onClose={(outcome) => {
            setDialog(null);
            if (outcome === 'saved') settled(null, { tone: 'ok', message: 'The payment was recorded, and the payment check worked out again.' });
            if (outcome === 'unconfirmed') settled(null, { message: 'Whether the payment was recorded could not be confirmed. The file has been read again: check the payment check before recording it again.' });
          }}
        />
      )}
      {dialog?.kind === 'columns' && (
        <ColumnsDialog
          file={file}
          onClose={(result) => {
            setDialog(null);
            if (result?.answer) settled(result.answer, { tone: 'ok', message: 'Compared again with the new columns.' });
            else if (result?.message) settled(null, { message: result.message });
          }}
        />
      )}
    </Page>
  );
}

/** What the page says on arrival from Load a file: loaded now, or found already loaded and not loaded twice. */
const arrivalNotice = (loaded, file) => {
  if (loaded === 'new') {
    return { tone: 'ok', message: `Loaded and compared: ${formatInt(file.rows)} lines, ${formatInt(file.openDiscrepancies)} discrepancies to follow up.` };
  }
  if (loaded === 'already') {
    return { tone: 'ok', message: 'This file was already loaded for the employer and month, so nothing was loaded twice. Here are its results.' };
  }
  return null;
};

/** The ruled strip of the summary: a reading of one file, never tiles. */
const summaryFigures = (file) => {
  const counts = file.counts ?? {};
  const how = [
    counts.matchedByStaffNumber && `${formatInt(counts.matchedByStaffNumber)} by staff number`,
    counts.matchedByIdNumber && `${formatInt(counts.matchedByIdNumber)} by ID number`,
    counts.matchedByName && `${formatInt(counts.matchedByName)} by name`,
  ].filter(Boolean).join(' · ');
  return [
    {
      label: 'Lines on the file', value: counts.rowsRead ?? file.rows,
      breakdown: counts.rowsUnreadable ? `${formatInt(counts.rowsUnreadable)} could not be read` : undefined,
    },
    { label: 'Matched to members', value: counts.matched ?? file.matched, breakdown: how || undefined },
    { label: 'Not members', value: counts.notMembers },
    { label: 'Members missing', value: counts.missingMembers },
    {
      label: 'Discrepancies', value: file.discrepancies,
      breakdown: `${formatInt(file.openDiscrepancies)} still to resolve`,
    },
  ];
};

/** The kinds this file has, each a way into the list filtered to it. */
function ByKind({ file, vocabulary, onChoose }) {
  const kinds = (file.discrepanciesByType ?? []).filter((entry) => (entry.open ?? 0) + (entry.queried ?? 0) + (entry.resolved ?? 0) > 0);
  if (kinds.length === 0) return null;
  return (
    <ul aria-label="Discrepancies by kind" className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
      {kinds.map((entry) => (
        <li key={entry.type}>
          <button type="button" className={IN_TEXT} onClick={() => onChoose(entry.type)}>
            {discrepancyLabel(entry.type, vocabulary)}
          </button>
          <span className="ml-1.5 tabular-nums text-ink-muted">
            {formatInt(entry.open ?? 0)} open · {formatInt(entry.queried ?? 0)} queried · {formatInt(entry.resolved ?? 0)} resolved
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One line of a ledger: the term, then its amount, right-aligned and tabular. */
function Ledger({ term, children, strong = false, note }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className="text-sm text-ink-muted">
        {term}
        {note && <span className="block text-xs">{note}</span>}
      </dt>
      <dd className={cn('whitespace-nowrap text-right tabular-nums', strong ? 'font-semibold text-ink' : 'text-ink')}>{children}</dd>
    </div>
  );
}

/**
 * THE PAYMENT CHECK (PAY-28): the lines' total, the total the file prints, the employer's fee (Absa keeps 3% --
 * PAY-27), the payment expected, the money received and the difference. A payment short by exactly the fee is as
 * expected: the fee is already out of what the employer is expected to pay.
 */
function PaymentCheck({ file, canRecord, onRecord }) {
  const totals = file.totals ?? {};
  const verdict = paymentStatusOf(totals.paymentStatus ?? file.paymentStatus);
  const fee = amountOf(totals.adminFeePercent) > 0;
  const payments = file.payments ?? [];
  return (
    <Sheet className="gap-3 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={SECTION_HEADING}>The payment check</h2>
        <ToneChip tone={verdict.tone}>{verdict.label}</ToneChip>
      </div>
      <dl>
        <Ledger term="Total of the lines on the file">{rands(totals.fileTotal ?? file.fileTotal)}</Ledger>
        {totals.statedTotal != null && (
          <Ledger term="Total printed on the file" note={totals.statedTotalAgrees === false ? 'Not the sum of its lines.' : undefined}>
            {rands(totals.statedTotal)}
          </Ledger>
        )}
        {totals.expectedTotal != null && (
          <Ledger
            term="Expected from SASBO’s members on record"
            note={totals.subscription ? `${rands(totals.subscription.amount)} a member, from ${dayLabel(totals.subscription.effectiveFrom)}.` : undefined}
          >
            {rands(totals.expectedTotal)}
          </Ledger>
        )}
        {fee && (
          <Ledger term={`${file.employer?.name ?? 'The employer'}’s admin fee, ${percentLabel(totals.adminFeePercent)}`}>
            − {rands(totals.adminFee)}
          </Ledger>
        )}
        <Ledger term="Payment expected" strong>{rands(totals.expectedPayment)}</Ledger>
        <Ledger
          term="Received"
          note={payments.length > 0
            ? payments.map((payment) => `${rands(payment.amount)} on ${dayLabel(payment.receivedOn)}${payment.reference ? `, ${payment.reference}` : ''}`).join('; ')
            : undefined}
        >
          {totals.received != null ? rands(totals.received) : 'Nothing recorded yet'}
        </Ledger>
        {totals.paymentDifference != null && <Ledger term="Difference" strong>{differenceLabel(totals.paymentDifference)}</Ledger>}
      </dl>
      {fee && totals.paymentStatus === 'EXACT' && (
        <p className="text-sm text-ink-muted">Short of the file’s total by the fee alone, which is as expected.</p>
      )}
      {canRecord && (
        <div><Button onClick={onRecord}>Record a payment received</Button></div>
      )}
    </Sheet>
  );
}

/** The columns the file was read by -- the heading it prints for each field -- and the way to change them. */
function ColumnsRead({ file, canChange, working, onChange, onCompare }) {
  const layout = file.layout ?? {};
  const typed = file.entry === 'TYPED';
  return (
    <Sheet className="gap-3 px-5 py-4">
      <h2 className={SECTION_HEADING}>
        <FileSpreadsheet aria-hidden="true" className="mr-2 inline size-4 align-[-2px] text-brand" />
        The columns read
      </h2>
      {typed ? (
        <p className="text-sm text-ink-muted">Typed in from the employer’s document: there were no columns to read.</p>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            {layout.headingRow ? `Headings on row ${formatInt(layout.headingRow)}${layout.sheet ? ` of the sheet “${layout.sheet}”` : ''}.` : 'The headings the file was read by.'}
          </p>
          <dl>
            {COLUMN_FIELDS.map(({ field, label }) => (
              <Ledger key={field} term={label}>
                {layout.headings?.[field] ?? <span className="text-ink-muted">Not on the file</span>}
              </Ledger>
            ))}
          </dl>
        </>
      )}
      {canChange && (
        <div className="flex flex-wrap gap-2">
          {!typed && <Button onClick={onChange} disabled={working != null}>Change the columns</Button>}
          <Button onClick={onCompare} loading={working === 'compare'} disabled={working != null}>Compare again</Button>
        </div>
      )}
      {canChange && (
        <p className="text-xs text-ink-muted">
          Comparing again matches the lines against the members as they are now. A discrepancy still found keeps its notes.
        </p>
      )}
    </Sheet>
  );
}
