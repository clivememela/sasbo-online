import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Download } from 'lucide-react';

import DataState from '../../components/common/DataState.jsx';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import Button from '../../components/form/Button.jsx';
import SelectInput from '../../components/form/SelectInput.jsx';
import TextInput from '../../components/form/TextInput.jsx';
import Modal, { ModalClose } from '../../components/overlay/Modal.jsx';
import Table from '../../components/table/Table.jsx';
import { formatInt } from '../../lib/format.js';
import reportError from '../../lib/reportError.js';
import saveFile from '../../lib/saveFile.js';
import { messageOf, writeMayHaveLanded } from '../../services/parseApiError.js';
import { downloadQuery, getFile, getQueries, payrollRefusalOf, raiseQueries } from '../../services/payrollService.js';
import { instantLabel } from '../admin/monthEndRules.js';
import { NavButton, ReadGate, SECTION_HEADING, usePayrollAccess } from './PayrollParts.jsx';
import {
  EMPTY, PASSWORD_MAX, PAYROLL_HOME, QUERY_ACTION, RECONCILED, discrepancyLabel, fileHref, fileTitle, idOf, monthLabel, passwordProblem,
  rands, REFUSAL,
} from './payrollRules.js';

/**
 * QUERIES TO THE EMPLOYER -- what SASBO asks an employer to change after a file is compared: add a member to its
 * deductions, delete a person from them, or correct an amount (Stephne, PAY-21: "We send them the discrepancy queries -
 * To add or delete."). A file's open discrepancies with a query action go on a list when it is raised; each list is
 * downloaded for the employer protected by a password the administrator chooses, because it leaves SASBO (POPIA).
 */
export default function PayrollQueries() {
  const { fileId } = useParams();
  const { canRead } = usePayrollAccess();
  const id = idOf(fileId);
  if (!canRead) {
    return (
      <Page>
        <PageTitle title="Queries to the employer" />
        <div className="mt-6 max-w-4xl"><ReadGate>{null}</ReadGate></div>
      </Page>
    );
  }
  return <QueriesScreen key={id ?? 'none'} id={id} />;
}

function QueriesScreen({ id }) {
  const { canProcess } = usePayrollAccess();
  const location = useLocation();
  const [state, setState] = useState(id ? 'loading' : 'missing');
  const [file, setFile] = useState(null);
  const [queries, setQueries] = useState([]);
  const [failure, setFailure] = useState(null);
  const [asked, setAsked] = useState(0);
  const [notice, setNotice] = useState(() =>
    (location.state?.raised ? { tone: 'ok', message: 'The query list was raised. Download it below for the employer.' } : null));
  const [raising, setRaising] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    if (!id) return undefined;
    let current = true;
    Promise.all([getFile(id), getQueries(id)])
      .then(([answer, lists]) => {
        if (!current) return;
        setFile(answer?.id != null ? answer : null);
        setQueries(Array.isArray(lists) ? [...lists].sort((a, b) => String(b.raisedAt).localeCompare(String(a.raisedAt))) : []);
        setState(answer?.id != null ? 'ready' : 'missing');
      })
      .catch((error) => {
        reportError('PayrollQueries.read', error);
        if (!current) return;
        setFailure(error);
        setState(payrollRefusalOf(error)?.code === REFUSAL.FILE_NOT_FOUND ? 'missing' : 'error');
      });
    return () => { current = false; };
  }, [id, asked]);

  const readAgain = () => {
    setState((was) => (was === 'ready' ? was : 'loading'));
    setAsked((n) => n + 1);
  };

  const raise = async () => {
    if (raising) return;
    setRaising(true);
    setNotice(null);
    try {
      await raiseQueries(id);
      setNotice({ tone: 'ok', message: 'The query list was raised. Download it below for the employer.' });
      readAgain();
    } catch (error) {
      reportError('PayrollQueries.raise', error);
      if (payrollRefusalOf(error)?.code === REFUSAL.NOTHING_TO_QUERY) setNotice({ message: error.message });
      else if (writeMayHaveLanded(error)) {
        setNotice({ message: 'Whether the query list was raised could not be confirmed. The lists have been read again: check them before raising another.' });
        readAgain();
      } else setNotice({ message: `No query list was raised. ${messageOf(error)}` });
    } finally {
      setRaising(false);
    }
  };

  const title = file ? `Queries to ${fileTitle(file)}` : 'Queries to the employer';
  return (
    <Page>
      <PageTitle
        title={title}
        subtitle="What SASBO asks the employer to change: add a member to its deductions, delete a person from them, or correct an amount. Each list leaves SASBO protected by a password."
        actions={<NavButton to={id && state !== 'missing' ? fileHref(id) : PAYROLL_HOME}>{id && state !== 'missing' ? 'Back to the file' : 'All files'}</NavButton>}
      />
      <div className="mt-4 max-w-5xl">
        <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
      </div>

      {state === 'missing' && (
        <Sheet className="mt-2 max-w-4xl">
          <DataState state="empty" layout="row" title={failure?.message ?? 'There is no payroll file at this address.'} message="Files are kept for a year after they are loaded." />
        </Sheet>
      )}
      {state === 'loading' && <Sheet className="mt-2 max-w-4xl"><DataState state="loading" layout="row" title="Reading the query lists…" /></Sheet>}
      {state === 'error' && (
        <Sheet className="mt-2 max-w-4xl">
          <DataState state="error" layout="row" error={failure} title="The query lists could not be loaded." onRetry={readAgain} />
        </Sheet>
      )}

      {state === 'ready' && (
        <>
          {canProcess && file.status === RECONCILED && (
            <div className="mt-2">
              <Button variant="primary" onClick={raise} loading={raising}>Raise a query list</Button>
              <p className="mt-1.5 max-w-prose text-sm text-ink-muted">
                Puts every open discrepancy that needs the employer, and is not on a list yet, on a new list.
              </p>
            </div>
          )}
          {queries.length === 0 ? (
            <Sheet className="mt-6 max-w-4xl">
              <DataState
                state="empty"
                layout="row"
                title="No query list raised yet"
                message={canProcess ? 'Raise one from the file’s open discrepancies.' : 'An administrator who processes payroll files raises them.'}
              />
            </Sheet>
          ) : queries.map((query) => (
            <QueryList key={query.id} query={query} canDownload={canProcess} onDownload={() => setDownloading(query)} />
          ))}
        </>
      )}

      {downloading && (
        <DownloadDialog
          query={downloading}
          file={file}
          onClose={(saved) => {
            setDownloading(null);
            if (saved) setNotice({ tone: 'ok', message: 'The query list is downloading. Send the password to the employer separately.' });
          }}
        />
      )}
    </Page>
  );
}

function QueryList({ query, canDownload, onDownload }) {
  const counts = query.counts ?? {};
  const columns = [
    {
      key: 'action', header: 'Ask',
      cell: (line) => (
        <span className="grid">
          <span className="font-medium text-ink">{QUERY_ACTION[line.action]?.label ?? line.action}</span>
          <span className="text-xs text-ink-muted">{QUERY_ACTION[line.action]?.ask}</span>
        </span>
      ),
    },
    {
      key: 'who', header: 'Person',
      cell: (line) => (
        <span className="grid">
          <span>{line.name || EMPTY}</span>
          <span className="text-xs text-ink-muted">
            {[line.staffNumber && `Staff number ${line.staffNumber}`, line.membershipNumber].filter(Boolean).join(' · ') || EMPTY}
          </span>
        </span>
      ),
    },
    { key: 'idNumber', header: 'ID number', priority: 'secondary', cell: (line) => line.idNumber || EMPTY },
    { key: 'amountOnFile', header: 'On the file', align: 'right', cell: (line) => <span className="tabular-nums">{rands(line.amountOnFile)}</span> },
    { key: 'expectedAmount', header: 'Expected', align: 'right', priority: 'secondary', cell: (line) => <span className="tabular-nums">{rands(line.expectedAmount)}</span> },
    {
      key: 'reason', header: 'Why',
      cell: (line) => (
        <span className="grid">
          <span>{line.reason}</span>
          <span className="text-xs text-ink-muted">{discrepancyLabel(line.type)}</span>
        </span>
      ),
      nowrap: false,
    },
  ];

  return (
    <Sheet className="mt-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 id={`payroll-query-${query.id}`} className={SECTION_HEADING}>
            Query list raised on {instantLabel(query.raisedAt)}
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {query.raisedBy ? `By ${query.raisedBy}. ` : ''}
            {formatInt(counts.add ?? 0)} to add, {formatInt(counts.delete ?? 0)} to delete, {formatInt(counts.correct ?? 0)} to correct.
          </p>
        </div>
        {canDownload && (
          <Button onClick={onDownload}>
            <Download aria-hidden="true" className="size-4 shrink-0" />
            Download for the employer
          </Button>
        )}
      </div>
      <Table
        caption={`Query list raised on ${instantLabel(query.raisedAt)}`}
        columns={columns}
        rows={Array.isArray(query.lines) ? query.lines : []}
        rowKey="discrepancyId"
        emptyTitle="No lines on this list"
        emptyMessage="Its discrepancies were resolved or replaced."
        dense
      />
    </Sheet>
  );
}

/**
 * The query list for the employer, in Excel or PDF, protected by a password typed here (8 to 64 characters). It is sent
 * once and kept nowhere -- not in the page, not in the browser -- so it is typed twice, and the dialog says it must reach
 * the employer separately from the file.
 */
function DownloadDialog({ query, file, onClose }) {
  const [format, setFormat] = useState('xlsx');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [tried, setTried] = useState(false);
  const passwordRef = useRef(null);
  const why = passwordProblem(password) ?? (again !== password ? 'The two passwords differ. Type the same password twice.' : null);

  const download = async () => {
    setTried(true);
    if (why || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const fetched = await downloadQuery(query.id, { format, password });
      saveFile(fetched, `Payroll queries - ${file?.employer?.name ?? 'employer'} - ${monthLabel(file?.period)}.${format}`);
      setPassword('');
      setAgain('');
      onClose(true);
    } catch (error) {
      reportError('PayrollQueries.download', error);
      setNotice({ message: `The query list could not be downloaded. ${messageOf(error)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose(false); }}
      title="Download the query list for the employer"
      description={`Raised on ${instantLabel(query.raisedAt)}. It leaves SASBO, so it is protected by a password.`}
      size="md"
      busy={busy}
      initialFocusRef={passwordRef}
      footer={(
        <>
          {tried && why && <p className="mr-auto text-sm text-ink-muted">{why}</p>}
          <ModalClose>Cancel</ModalClose>
          <Button variant="primary" onClick={download} loading={busy}>Download</Button>
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
      <div className="grid gap-4">
        <SelectInput
          label="Format"
          value={format}
          options={[{ value: 'xlsx', label: 'Excel (.xlsx)' }, { value: 'pdf', label: 'PDF' }]}
          onChange={(value) => setFormat(value || 'xlsx')}
          disabled={busy}
        />
        <TextInput
          ref={passwordRef}
          label="Password for the file"
          kind="newPassword"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value.slice(0, PASSWORD_MAX))}
          hint="At least 8 characters. Send it to the employer separately, never in the same e-mail as the file. It is not kept."
          error={tried ? passwordProblem(password) ?? undefined : undefined}
          disabled={busy}
        />
        <TextInput
          label="The same password again"
          kind="newPassword"
          required
          value={again}
          onChange={(event) => setAgain(event.target.value.slice(0, PASSWORD_MAX))}
          error={tried && !passwordProblem(password) && again !== password ? 'The two passwords differ.' : undefined}
          disabled={busy}
        />
      </div>
    </Modal>
  );
}
