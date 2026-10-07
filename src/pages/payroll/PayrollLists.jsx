import { useCallback } from 'react';

import Criteria, { CRITERION } from '../../components/common/Criteria.jsx';
import StatusChip from '../../components/common/StatusChip.jsx';
import Button from '../../components/form/Button.jsx';
import SelectInput from '../../components/form/SelectInput.jsx';
import Table from '../../components/table/Table.jsx';
import { formatInt } from '../../lib/format.js';
import { PAGE_SIZE, getDiscrepancies, getRows } from '../../services/payrollService.js';
import { PagerFor, usePagedRead } from '../acb/acbPaging.jsx';
import { whoOf } from './PayrollDialogs.jsx';
import { ToneChip } from './PayrollParts.jsx';
import {
  DISCREPANCY_LABEL, DISCREPANCY_STATUS, MATCH_RULE, ROW_FILTER, amountStatusLabel, discrepancyLabel,
  discrepancyStatusOf, EMPTY, outcomeLabel, rands, RESOLVED,
} from './payrollRules.js';

/** The status filter's choices: the server's default is every discrepancy still to resolve. */
const STATUS_CHOICES = [
  { value: '', label: 'Still to resolve' },
  ...Object.entries(DISCREPANCY_STATUS).map(([value, { label }]) => ({ value, label })),
  { value: 'ALL', label: 'All, resolved too' },
];

/**
 * A file's discrepancies, by type and status -- each with its reason in plain words (`detail`) and what SASBO does
 * about it (`whatToDo`, from Stephne's answers), its status, and the way to its notes and outcome.
 */
export function DiscrepancyList({ fileId, vocabulary, byType, type, status, onFilter, onOpen }) {
  const read = useCallback(
    (page, size) => getDiscrepancies(fileId, { type, status }, page, size),
    [fileId, type, status],
  );
  const { data, state, goTo, retry } = usePagedRead(read, { size: PAGE_SIZE, label: 'PayrollFile.discrepancies' });

  // The kinds this file has, with how many are still to resolve; every kind the server knows stays choosable.
  const counts = new Map((byType ?? []).map((entry) => [entry.type, (entry.open ?? 0) + (entry.queried ?? 0)]));
  const typeChoices = Object.keys(DISCREPANCY_LABEL).map((value) => ({
    value,
    label: counts.get(value) ? `${discrepancyLabel(value, vocabulary)} (${formatInt(counts.get(value))})` : discrepancyLabel(value, vocabulary),
  }));

  const columns = [
    {
      key: 'type', header: 'Discrepancy',
      cell: (d) => (
        <span className="grid justify-items-start gap-0.5">
          <span className="font-medium text-ink">{discrepancyLabel(d.type, vocabulary)}</span>
          <span className="text-xs text-ink-muted">{whoOf(d)}</span>
          {d.member?.status && <StatusChip status={d.member.status} />}
        </span>
      ),
      nowrap: false,
    },
    { key: 'detail', header: 'What happened', cell: (d) => d.detail, nowrap: false },
    { key: 'whatToDo', header: 'What to do', priority: 'secondary', cell: (d) => d.whatToDo, nowrap: false },
    {
      key: 'status', header: 'Status',
      cell: (d) => {
        const s = discrepancyStatusOf(d.status);
        return (
          <span className="grid justify-items-start gap-1">
            <ToneChip tone={s.tone}>{s.label}</ToneChip>
            {d.resolution && <span className="text-xs text-ink-muted">{outcomeLabel(d.resolution.outcome, vocabulary)}</span>}
          </span>
        );
      },
    },
    {
      key: 'notes', header: 'Notes', priority: 'detail',
      cell: (d) => (d.noteCount ? `${formatInt(d.noteCount)} · last: ${d.lastNote?.text ?? ''}` : 'None'),
      nowrap: false,
    },
    {
      key: 'open', header: <span className="sr-only">Notes and outcome</span>, align: 'right',
      cell: (d) => (
        <Button
          size="sm"
          data-row-action=""
          onClick={() => onOpen(d)}
          aria-label={`Notes and outcome: ${discrepancyLabel(d.type, vocabulary)}, ${whoOf(d)}`}
        >
          {d.status === RESOLVED ? 'View' : 'Notes and outcome'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <Criteria className="px-5 pt-4" label="Which discrepancies">
        <SelectInput
          className={CRITERION}
          label="Kind"
          value={type}
          placeholder="Every kind"
          options={typeChoices}
          onChange={(value) => onFilter({ type: value })}
        />
        <SelectInput
          className={CRITERION}
          label="Status"
          value={status}
          options={STATUS_CHOICES}
          onChange={(value) => onFilter({ status: value })}
        />
      </Criteria>
      <Table
        caption="The file’s discrepancies"
        columns={columns}
        rows={data.content}
        rowKey="id"
        loading={state === 'loading'}
        error={state === 'error' ? 'The discrepancies could not be loaded.' : null}
        onRetry={retry}
        emptyTitle={type || status ? 'None of these' : 'Nothing to follow up'}
        emptyMessage={type || status
          ? 'No discrepancy of this kind or status. Choose another, or every kind.'
          : 'Every discrepancy on this file is resolved, or none was found.'}
      />
      <PagerFor data={data} state={state} goTo={goTo} noun="discrepancies" size={PAGE_SIZE} />
    </>
  );
}

/** A file's lines in file order, each with the member it matched and how (PAY-10), or why none fits. */
export function LineList({ fileId, show, onFilter }) {
  const read = useCallback((page, size) => getRows(fileId, show || undefined, page, size), [fileId, show]);
  const { data, state, goTo, retry } = usePagedRead(read, { size: PAGE_SIZE, label: 'PayrollFile.rows' });

  const columns = [
    { key: 'rowNumber', header: 'Row', align: 'right', cell: (line) => <span className="tabular-nums">{line.rowNumber}</span> },
    { key: 'staffNumber', header: 'Staff number', cell: (line) => line.staffNumber || EMPTY },
    { key: 'idNumber', header: 'ID number', priority: 'secondary', cell: (line) => line.idNumber || EMPTY },
    {
      key: 'name', header: 'Name on the file',
      cell: (line) => [line.initials, line.surname].filter(Boolean).join(' ') || EMPTY,
    },
    { key: 'amount', header: 'Amount', align: 'right', cell: (line) => <span className="tabular-nums">{rands(line.amount)}</span> },
    {
      key: 'match', header: 'Matched to',
      cell: (line) => {
        if (!line.valid) return <span className="text-status-suspended">{line.problem ?? 'Could not be read'}</span>;
        if (!line.match) return <span className="text-ink-muted">No member fits</span>;
        return (
          <span className="grid">
            <span>{line.match.memberName} ({line.match.membershipNumber})</span>
            <span className="text-xs text-ink-muted">
              By {MATCH_RULE[line.match.rule] ?? line.match.rule ?? 'a rule not named'}
              {line.match.reason ? `: ${line.match.reason}` : ''}
            </span>
          </span>
        );
      },
      nowrap: false,
    },
    { key: 'amountStatus', header: 'The amount', priority: 'secondary', cell: (line) => amountStatusLabel(line.match), nowrap: false },
  ];

  return (
    <>
      <Criteria className="px-5 pt-4" label="Which lines">
        <SelectInput
          className={CRITERION}
          label="Show"
          value={show}
          options={Object.entries(ROW_FILTER).map(([value, label]) => ({ value: value === 'ALL' ? '' : value, label }))}
          onChange={(value) => onFilter({ show: value })}
        />
      </Criteria>
      <Table
        caption="The file’s lines and what each matched"
        columns={columns}
        rows={data.content}
        rowKey="id"
        loading={state === 'loading'}
        error={state === 'error' ? 'The file’s lines could not be loaded.' : null}
        onRetry={retry}
        emptyTitle="No lines to show"
        emptyMessage={show ? 'No line of the file is of this kind.' : 'The file has no lines.'}
        dense
      />
      <PagerFor data={data} state={state} goTo={goTo} noun="lines" size={PAGE_SIZE} />
    </>
  );
}
