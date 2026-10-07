import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Upload } from 'lucide-react';

import Criteria, { CRITERION } from '../../components/common/Criteria.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import SelectInput from '../../components/form/SelectInput.jsx';
import Table from '../../components/table/Table.jsx';
import { formatInt } from '../../lib/format.js';
import reportError from '../../lib/reportError.js';
import { PAGE_SIZE, getEmployers, getFiles } from '../../services/payrollService.js';
import { PagerFor, usePagedRead } from '../acb/acbPaging.jsx';
import { instantLabel } from '../admin/monthEndRules.js';
import { IN_TEXT, NavButton, ReadGate, ToneChip, usePayrollAccess } from './PayrollParts.jsx';
import {
  ENTRY, FILE_STATUS, LOAD_HREF, fileHref, fileState, fileTitle, idOf, monthLabel, paymentStatusOf, recentMonths,
} from './payrollRules.js';

/**
 * PAYROLL DEDUCTIONS AND RECONCILIATION -- the Files list: every employer's payroll file in one place, where every
 * administrator reaches them (Stephne, PAY-32: "will prefer it to be send to one portal where we can access it"),
 * newest month first, kept for a year (PAY-39). Each file opens by a press on its row or by its own address.
 *
 * The filters live in the address (`?employer=1&month=2026-09&status=RECONCILED`), so a filtered list can be sent to a
 * colleague or opened again, and nothing is kept in the browser.
 */
export default function PayrollFiles() {
  const { canProcess } = usePayrollAccess();
  return (
    <Page>
      <PageTitle
        title="Payroll Deductions and Reconciliation"
        subtitle="Every employer’s payroll file in one place: what was deducted, what matched SASBO’s members, and what to follow up. Files and their results are kept for a year."
        actions={canProcess && (
          <NavButton to={LOAD_HREF} variant="primary">
            <Upload aria-hidden="true" className="size-4 shrink-0" />
            Load a file
          </NavButton>
        )}
      />
      <ReadGate>
        <FilesList canProcess={canProcess} />
      </ReadGate>
    </Page>
  );
}

function FilesList({ canProcess }) {
  const [params, setParams] = useSearchParams();
  const employerId = idOf(params.get('employer')) ?? '';
  const month = /^\d{4}-\d{2}$/.test(params.get('month') ?? '') ? params.get('month') : '';
  const status = FILE_STATUS[params.get('status')] ? params.get('status') : '';

  const [employers, setEmployers] = useState({ state: 'loading', rows: [] });
  const [employersAsked, setEmployersAsked] = useState(0);
  useEffect(() => {
    let current = true;
    getEmployers()
      .then((rows) => current && setEmployers({ state: 'ready', rows: Array.isArray(rows) ? rows : [] }))
      .catch((error) => {
        reportError('PayrollFiles.employers', error);
        if (current) setEmployers({ state: 'error', rows: [], error });
      });
    return () => { current = false; };
  }, [employersAsked]);

  const choose = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <Criteria className="mt-6" label="Which files">
        <SelectInput
          className={CRITERION}
          label="Employer"
          value={employerId}
          placeholder="All employers"
          options={employers.rows.map((employer) => ({ value: String(employer.id), label: employer.name }))}
          loading={employers.state === 'loading'}
          loadError={employers.state === 'error' ? employers.error : null}
          onRetryLoad={() => { setEmployers({ state: 'loading', rows: [] }); setEmployersAsked((n) => n + 1); }}
          onChange={(value) => choose('employer', value)}
        />
        <SelectInput
          className={CRITERION}
          label="Month"
          value={month}
          placeholder="All months"
          options={recentMonths()}
          onChange={(value) => choose('month', value)}
        />
        <SelectInput
          className={CRITERION}
          label="File"
          value={status}
          placeholder="Every file"
          options={Object.entries(FILE_STATUS).map(([value, label]) => ({ value, label }))}
          onChange={(value) => choose('status', value)}
        />
      </Criteria>
      {/* A new choice starts at the first page: the sheet is remade, never asked for page 3 of a shorter list. */}
      <FilesSheet key={`${employerId}|${month}|${status}`} filters={{ employerId, period: month, status }} canProcess={canProcess} />
    </>
  );
}

function FilesSheet({ filters, canProcess }) {
  const { employerId, period, status } = filters;
  const read = useCallback(
    (page, size) => getFiles({ employerId, period, status }, page, size),
    [employerId, period, status],
  );
  const { data, state, goTo, retry } = usePagedRead(read, { size: PAGE_SIZE, label: 'PayrollFiles.read' });
  const filtered = Boolean(employerId || period || status);

  const columns = [
    { key: 'period', header: 'Month', cell: (file) => monthLabel(file.period) },
    {
      key: 'employer', header: 'Employer',
      cell: (file) => (
        <span>
          {file.employer?.name}
          {file.entry === 'TYPED' && <span className="ml-2 text-xs text-ink-muted">{ENTRY.TYPED.toLowerCase()}</span>}
        </span>
      ),
    },
    {
      key: 'lines', header: 'Lines', priority: 'secondary', align: 'right',
      cell: (file) => <span className="tabular-nums">{formatInt(file.rows)} · {formatInt(file.matched)} matched</span>,
    },
    {
      key: 'state', header: 'Discrepancies',
      cell: (file) => { const s = fileState(file); return <ToneChip tone={s.tone}>{s.label}</ToneChip>; },
    },
    {
      key: 'payment', header: 'Payment check', priority: 'secondary',
      cell: (file) => { const p = paymentStatusOf(file.paymentStatus); return <ToneChip tone={p.tone}>{p.label}</ToneChip>; },
    },
    {
      key: 'loaded', header: 'Loaded', priority: 'detail',
      cell: (file) => `${instantLabel(file.uploadedAt)}${file.uploadedBy ? ` by ${file.uploadedBy}` : ''}`,
    },
    {
      key: 'open', header: <span className="sr-only">Open</span>, align: 'right',
      cell: (file) => (
        <Link to={fileHref(file.id)} className={IN_TEXT} data-row-action="" aria-label={`Open ${fileTitle(file)}`}>
          Open
        </Link>
      ),
    },
  ];

  return (
    <Sheet className="mt-4" grow>
      <Table
        caption="Payroll files, newest month first"
        columns={columns}
        rows={data.content}
        rowKey="id"
        loading={state === 'loading'}
        error={state === 'error' ? 'The payroll files could not be loaded.' : null}
        onRetry={retry}
        emptyTitle={filtered ? 'No file matches these choices' : 'No payroll file loaded yet'}
        emptyMessage={filtered
          ? 'Choose another employer, month or file, or clear the choices to see every file.'
          : canProcess ? 'Load an employer’s file to compare it with SASBO’s members.' : 'Files appear here once an administrator loads them.'}
      />
      <PagerFor data={data} state={state} goTo={goTo} noun="files" size={PAGE_SIZE} />
    </Sheet>
  );
}
