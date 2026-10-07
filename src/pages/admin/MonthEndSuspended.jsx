import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import RequirePermission from '../../auth/RequirePermission.jsx';
import { PERMISSIONS } from '../../auth/permissions.js';
import Criteria, { CRITERION, CRITERION_WIDE } from '../../components/common/Criteria.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import Pager from '../../components/common/Pager.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import SelectInput from '../../components/form/SelectInput.jsx';
import Table from '../../components/table/Table.jsx';
import { dayLabel, listRows } from '../../config/monthEnd.js';
import useAsyncOptions from '../../hooks/useAsyncOptions.js';
import { formatInt } from '../../lib/format.js';
import reportError from '../../lib/reportError.js';
import { getLapsedSuspensions, getSuspendedMembers } from '../../services/monthEndService.js';
import { getEmployers, getSuspensionCodes } from '../../services/referenceService.js';
import { failureOf, lapsedSaid } from './monthEndRules.js';

/**
 * THE SUSPENDED MEMBERS, BY NAME -- Stephne, MEN-18: "We should also know who the suspended members are name, mem number
 * etc. The system should also remind us when the suspension period for a member have lapsed, so we can delete.
 * (suspensions is only for 3months)" (`contracts/monthend-rules-api.md` R5).
 *
 *   who      everyone suspended now, the oldest suspension first -- or, with `?lapsed=1`, only those whose three months
 *            are up: the members who can be deleted. A bank (an employer, through the workplace) and a suspension code
 *            narrow either list; the address keeps all three, so the list can be sent to somebody as it is.
 *   held     by MEMBERS_VIEW and MONTH_END_VIEW both: the list names members, and organisers do not see suspensions
 *            (DOD-14) -- nothing is asked of the server before both are held. The server scopes it to the caller's
 *            region or area.
 *   each     the membership number (opening the member in the register, where a lapsed member is deleted), the name,
 *            the bank and workplace, the code and the reason for no payroll deduction, and the day it began and the day
 *            it lapses (three calendar months on). No identity, account or telephone number is in the list.
 *
 * The suspended by bank and code, as counts, are a statistic: *Suspended members, by bank* on the Month end page.
 */

const PAGE_SIZE = 50;
const NOT_AVAILABLE = 'The suspended members are not available from this server yet.';

/** An answer this screen can read: a page of the suspended, with its counts -- anything else is not available (MV-36). */
const suspendedPageOf = (answer) => (answer && typeof answer === 'object' && Array.isArray(answer.items)
  && Number.isInteger(answer.total) && Number.isInteger(answer.lapsed) ? answer : null);

/** The register, searched for one member by their number: where a lapsed member is opened and deleted. */
const registerHref = (membershipNumber) => `/members?q=${encodeURIComponent(membershipNumber)}`;

const IN_TEXT = 'rounded-sm font-medium text-brand-ink underline underline-offset-2 focus-visible:outline-2 '
  + 'focus-visible:outline-offset-2 focus-visible:outline-brand-ring';

const COLUMNS = [
  {
    key: 'number',
    header: 'Member',
    cell: (member) => (
      <Link to={registerHref(member.membershipNumber)} className={IN_TEXT}
        aria-label={`Open ${member.membershipNumber} in the register`}>
        {member.membershipNumber}
      </Link>
    ),
  },
  { key: 'name', header: 'Name', nowrap: false, cell: (member) => member.name },
  { key: 'bank', header: 'Bank', nowrap: false, cell: (member) => member.bank },
  {
    key: 'code',
    header: 'Code',
    nowrap: false,
    cell: (member) => [member.suspensionCode, member.suspensionName].filter((part) => part != null && part !== '').join(' · ')
      || 'No code on record',
  },
  { key: 'reason', header: 'Reason', priority: 'secondary', nowrap: false, cell: (member) => member.noDeductionReason ?? '' },
  { key: 'workplace', header: 'Workplace', priority: 'secondary', nowrap: false, cell: (member) => member.workplace ?? '' },
  { key: 'from', header: 'Suspended on', cell: (member) => (member.suspendedOn ? dayLabel(member.suspendedOn) : 'No date on record') },
  {
    key: 'lapses',
    header: 'Lapses on',
    nowrap: false,
    cell: (member) => (member.lapsesOn ? (
      <>
        {dayLabel(member.lapsesOn)}
        {member.lapsed && <span className="block text-xs font-medium text-status-pending">lapsed: can be deleted</span>}
      </>
    ) : ''),
  },
];

/** A page of the list, read for what the address asks -- and again only when a person asks. `page` counts from 0. */
function useSuspendedPage(lapsed, employer, code, page) {
  const [attempt, setAttempt] = useState(0);
  const question = `${lapsed}|${employer}|${code}|${page}|${attempt}`;
  const [read, setRead] = useState({ question: null });
  useEffect(() => {
    let current = true;
    const asked = `${lapsed}|${employer}|${code}|${page}|${attempt}`;
    (lapsed ? getLapsedSuspensions : getSuspendedMembers)({ page, size: PAGE_SIZE, employer, code })
      .then((body) => {
        const answer = suspendedPageOf(body);
        if (current) setRead({ question: asked, answer, failure: answer ? null : failureOf(null, NOT_AVAILABLE) });
      })
      .catch((error) => {
        reportError('MonthEndSuspended.read', error);
        if (current) setRead({ question: asked, answer: null, failure: failureOf(error, NOT_AVAILABLE) });
      });
    return () => {
      current = false;
    };
  }, [lapsed, employer, code, page, attempt]);
  const pending = read.question !== question;
  return {
    pending,
    answer: pending ? null : read.answer,
    failure: pending ? null : read.failure,
    retry: () => setAttempt((n) => n + 1),
  };
}

/** One of SASBO's lists as a filter's choices: asked for when the control is first opened, and kept (MD69). */
function useChoices(read, toOption, wanted) {
  const list = useAsyncOptions(() => read().then((answer) => listRows(answer) ?? []), [], { enabled: wanted });
  return { ...list, options: list.options.map(toOption) };
}

function SuspendedList() {
  const [params, setParams] = useSearchParams();
  const lapsed = params.get('lapsed') === '1';
  const employer = params.get('employer') ?? '';
  const code = params.get('code') ?? '';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const read = useSuspendedPage(lapsed, employer, code, page - 1);

  // SASBO's employers and suspension codes, asked for when a filter is first opened -- or at once where one is chosen.
  const [opened, setOpened] = useState({ employer: Boolean(employer), code: Boolean(code) });
  const employers = useChoices(getEmployers, (row) => ({ value: String(row.id), label: row.name }), opened.employer);
  const codes = useChoices(getSuspensionCodes, (row) => ({ value: String(row.code), label: `${row.code} · ${row.name}` }),
    opened.code);

  /** A person's question: the address says it, and the list is read for it -- on its first page. */
  const change = (next) => {
    const merged = { lapsed: lapsed ? '1' : '', employer, code, ...next };
    const query = new URLSearchParams();
    if (merged.lapsed) query.set('lapsed', '1');
    if (merged.employer) query.set('employer', merged.employer);
    if (merged.code) query.set('code', merged.code);
    if (merged.page && merged.page > 1) query.set('page', String(merged.page));
    setParams(query, { replace: true });
  };

  const { answer } = read;
  const pages = answer ? Math.max(1, answer.totalPages || Math.ceil(answer.total / PAGE_SIZE)) : 1;
  const first = answer ? answer.page * (answer.size || PAGE_SIZE) : 0;
  const filtered = Boolean(employer || code);
  return (
    <>
      <Criteria className="mt-6" label="Which suspended members">
        <SelectInput
          className={CRITERION_WIDE}
          label="Show"
          value={lapsed ? 'lapsed' : 'all'}
          options={[{ value: 'all', label: 'Every suspended member' }, { value: 'lapsed', label: 'Only the lapsed' }]}
          onChange={(value) => change({ lapsed: value === 'lapsed' ? '1' : '', page: 1 })}
        />
        <SelectInput
          className={CRITERION_WIDE}
          label="Bank"
          value={employer}
          options={[{ value: '', label: 'Every bank' }, ...(employers.options.length ? employers.options
            : employer ? [{ value: employer, label: 'The bank asked for' }] : [])]}
          loadError={employers.error}
          onRetryLoad={employers.refetch}
          onFocus={() => setOpened((was) => ({ ...was, employer: true }))}
          onMouseDown={() => setOpened((was) => ({ ...was, employer: true }))}
          onChange={(value) => change({ employer: value, page: 1 })}
        />
        <SelectInput
          className={CRITERION}
          label="Code"
          value={code}
          options={[{ value: '', label: 'Every code' }, ...(codes.options.length ? codes.options
            : code ? [{ value: code, label: code }] : [])]}
          loadError={codes.error}
          onRetryLoad={codes.refetch}
          onFocus={() => setOpened((was) => ({ ...was, code: true }))}
          onMouseDown={() => setOpened((was) => ({ ...was, code: true }))}
          onChange={(value) => change({ code: value, page: 1 })}
        />
      </Criteria>

      {answer && (
        <div className="mt-3 grid max-w-prose gap-1 text-sm text-ink-muted" data-suspended={answer.total}>
          <p className="text-base text-ink">{lapsedSaid(answer.lapsed)}</p>
          <p>
            {`As at ${dayLabel(answer.asAt)}: ${formatInt(answer.total)} ${lapsed ? 'lapsed' : 'suspended'}`
              + `${filtered ? ' for what is chosen' : ''}. A suspension lapses ${answer.lapseMonths ?? 3} months after the `
              + 'day it began.'}
            {answer.undated > 0 && ` ${formatInt(answer.undated)} ${answer.undated === 1 ? 'has' : 'have'} no date on record.`}
          </p>
        </div>
      )}

      <Sheet className="mt-4">
        <Table
          caption={lapsed ? 'Suspensions that have lapsed' : 'Members suspended now'}
          columns={COLUMNS}
          rows={answer?.items ?? []}
          rowKey="memberId"
          loading={read.pending}
          error={read.failure}
          onRetry={read.retry}
          emptyTitle={lapsed ? 'No suspension has lapsed.' : 'No member is suspended.'}
          emptyMessage={filtered ? 'Nothing matches the bank or code chosen.' : undefined}
          dense
        />
        {answer && answer.total > answer.items.length && (
          <Pager page={page} totalPages={pages} onPageChange={(next) => change({ page: next })} count={answer.total}
            start={first + 1} end={first + answer.items.length} noun="members" error={false} />
        )}
      </Sheet>
    </>
  );
}

/** The route's page: the list for someone who may see members and month end both -- and a sentence for anyone else. */
export default function MonthEndSuspended() {
  return (
    <Page>
      <PageTitle
        title="Suspended members"
        subtitle="Who is suspended now, the oldest suspension first, and whose three months are up so that they can be deleted."
      />
      <RequirePermission permission={PERMISSIONS.MEMBERS_VIEW}>
        <RequirePermission permission={PERMISSIONS.MONTH_END_VIEW}>
          <SuspendedList />
        </RequirePermission>
      </RequirePermission>
    </Page>
  );
}
