import { useState } from 'react';

import RequirePermission from '../../auth/RequirePermission.jsx';
import { PERMISSIONS } from '../../auth/permissions.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import Pager from '../../components/common/Pager.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import Table from '../../components/table/Table.jsx';
import { monthLabel } from '../../config/monthEnd.js';
import { getDeliveries } from '../../services/monthEndSendService.js';
import { instantLabel } from './monthEndRules.js';
import { deliveriesOf, howSaid, kindSaid, outcomeSaid } from './monthEndSendRules.js';
import { NoMonthTaken, TakenMonthCriteria } from './MonthEndSendParts.jsx';
import useTakenMonth, { useMonthAnswer } from './useTakenMonth.js';

/**
 * WHAT WAS SENT, TO WHOM, AND WHEN -- every download, e-mail and SFTP upload of the month's packs and files, as the
 * server records them (`contracts/monthend-api.md` §4), the newest first, a page at a time. A refused or failed attempt
 * is on the record too, with why. Channels are download, e-mail and SFTP only: reports are never posted on WhatsApp
 * (SASBO, 5 Oct). A scoped caller sees only their own recipients' deliveries -- the server's to decide.
 */

const NOT_AVAILABLE = 'The record of what was sent is not available from this server yet.';
const PAGE_SIZE = 50;

/** One read a month and a page, under one key -- `2026-08|0` -- so a new page is a new question. */
const readPage = (key) => {
  const [month, page] = key.split('|');
  return getDeliveries(month, Number(page), PAGE_SIZE);
};

const COLUMNS = [
  { key: 'at', header: 'When', cell: (sent) => instantLabel(sent.at) },
  { key: 'what', header: 'What', nowrap: false, cell: (sent) => `${kindSaid(sent.kind)}: ${sent.recipientName}` },
  { key: 'how', header: 'How', nowrap: false, cell: (sent) => howSaid(sent) },
  { key: 'outcome', header: 'Outcome', nowrap: false, cell: (sent) => outcomeSaid(sent) },
  { key: 'by', header: 'By', priority: 'secondary', nowrap: false, cell: (sent) => sent.by },
  { key: 'file', header: 'File', priority: 'secondary', cell: (sent) => sent.fileName },
];

function SentRecord({ month, noneTaken }) {
  const [page, setPage] = useState(1);
  const read = useMonthAnswer(readPage, month ? `${month}|${page - 1}` : '', deliveriesOf, 'MonthEndSent.read',
    NOT_AVAILABLE);
  if (noneTaken) return <NoMonthTaken why="Packs and files are made, and sent, from a taken month." />;
  if (!month) return null;

  const { answer } = read;
  const items = answer?.items ?? [];
  const pages = answer ? Math.max(1, Math.ceil(answer.total / (answer.size || PAGE_SIZE))) : 1;
  const first = answer ? answer.page * (answer.size || PAGE_SIZE) : 0;
  return (
    <Sheet className="mt-6">
      <Table
        caption={`What was sent for ${monthLabel(month)}`}
        columns={COLUMNS}
        rows={items}
        rowKey="id"
        loading={read.pending}
        error={answer ? null : read.failure}
        onRetry={read.reload}
        emptyTitle={`Nothing has been sent for ${monthLabel(month)} yet.`}
        dense
      />
      {answer && answer.total > items.length && (
        <Pager page={page} totalPages={pages} onPageChange={setPage} count={answer.total} start={first + 1}
          end={first + items.length} noun="deliveries" error={false} />
      )}
    </Sheet>
  );
}

/** The route's page: the month, then its record for a person who may send -- and a sentence for anyone else. */
export default function MonthEndSent() {
  const taken = useTakenMonth('MonthEndSent.months');
  return (
    <Page>
      <PageTitle
        title="What was sent"
        subtitle="Every pack and file downloaded, e-mailed or sent by SFTP for the month: to whom, by whom, and when — and any that could not go, with why."
      />
      <TakenMonthCriteria taken={taken} />
      <RequirePermission permission={PERMISSIONS.MONTH_END_SEND}>
        {/* Keyed by the month: a new month opens on its first page. */}
        <SentRecord key={taken.month} month={taken.month} noneTaken={taken.noneTaken} />
      </RequirePermission>
    </Page>
  );
}
