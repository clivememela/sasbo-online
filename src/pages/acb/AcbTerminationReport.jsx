import { useCallback, useState } from 'react';
import Sheet from '../../components/common/Sheet.jsx';
import StatusChip from '../../components/common/StatusChip.jsx';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import Table from '../../components/table/Table.jsx';
import Modal, { ModalClose, closeOn } from '../../components/overlay/Modal.jsx';
import { Button } from '../../components/form';
import reportError from '../../lib/reportError.js';
import { formatDateLong } from '../../lib/format.js';
import { acbRunService } from '../../services/acbRunService.js';
import { dodService } from '../../services/dodService.js';
import { PagerFor, usePagedRead } from './acbPaging.jsx';
import { LETTER_STATUS_LABEL, monthLabel } from './acbRunRules.js';
import { writeOutcome } from './dodRules.js';

const PAGE_SIZE = 50;

/** The member status the returns loop writes for SUBS_IN_ARREARS (03.5). */
const TERMINATED = 'Terminated';

/**
 * 03.5 -- who three unpaid presentations reach, and who is one away (Q27: every unpaid counts, a re-debit included).
 * Three can fall inside two months, so it is a report an administrator acts on, never a rule that acts: a staff member
 * confirms each ending (Stephne, DOD-22), and the member is sent a short letter (DOD-24). The ending is dated the day
 * it is confirmed; the third unpaid's date is shown beside it, because SASBO ticked both answers (DOD-23, Friday item 6).
 *
 * The server's word decides: a confirmed ending shows the status and letter it answered, never the one asked for.
 */
export default function AcbTerminationReport() {
  const [about, setAbout] = useState({ countingFrom: null, blindness: null });
  const read = useCallback((page, size) => acbRunService.terminationReport(page, size).then((report) => {
    setAbout({ countingFrom: report?.countingFrom ?? null, blindness: report?.blindness ?? null });
    return report?.members;
  }), []);
  const { data, state, goTo, retry } = usePagedRead(read, { size: PAGE_SIZE, label: 'AcbTerminationReport.read' });
  const [ended, setEnded] = useState({});
  const [confirming, setConfirming] = useState(null);
  const [notice, setNotice] = useState(null);

  const rows = data.content.map((member) => (ended[member.memberId] ? { ...member, status: ended[member.memberId].status } : member));
  const columns = [
    {
      key: 'member', header: 'Member', priority: 'essential',
      cell: (member) => (
        <span>
          {member.surname || member.membershipNumber}
          <span className="ml-2 text-xs text-ink-muted">{member.membershipNumber}</span>
        </span>
      ),
    },
    {
      key: 'count', header: 'Unpaids in a row', priority: 'essential',
      cell: (member) => (
        <span className={member.terminate ? 'font-semibold text-ink' : 'text-ink'}>
          {member.unpaidCount}
          <span className="ml-2 text-xs font-normal text-ink-muted">
            {member.terminate ? 'three — the ending is to confirm' : 'one more makes three'}
          </span>
        </span>
      ),
    },
    {
      key: 'third', header: 'Third unpaid', priority: 'secondary',
      cell: (member) => (member.thirdUnpaidOn ? formatDateLong(member.thirdUnpaidOn) : '—'),
    },
    {
      key: 'months', header: 'Months unpaid', priority: 'secondary',
      cell: (member) => (member.unpaidMonths ?? []).map(monthLabel).join(', '),
    },
    { key: 'twelve', header: 'Last 12 months', priority: 'detail', cell: (member) => member.twelveMonthTotal },
    {
      key: 'opening', header: 'From the old system', priority: 'detail',
      cell: (member) => (member.openingUnpaids ? member.openingUnpaids : '—'),
    },
    { key: 'status', header: 'Status', priority: 'essential', cell: (member) => <StatusChip status={member.status} /> },
    {
      key: 'act', header: 'Ending', priority: 'essential',
      cell: (member) => (member.terminate && member.status !== TERMINATED ? (
        <Button variant="danger" onClick={() => setConfirming(member)}
          aria-label={`Confirm the ending of ${member.surname || member.membershipNumber}’s membership`}>
          Confirm the ending
        </Button>
      ) : null),
    },
  ];

  return (
    <Sheet className="mt-6" aria-labelledby="acb-termination-heading">
      <div className="border-b border-line px-6 py-4">
        <h2 id="acb-termination-heading" className="text-base font-semibold text-ink">
          Members at two unpaids or more
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          Three unpaid presentations in a row end a membership — a debit, the next month’s and a re-debit count alike —
          once a staff member confirms it.{about.countingFrom ? ` Counted from ${monthLabel(about.countingFrom)}.` : ''}
        </p>
        {about.blindness && <p className="mt-1 text-sm text-ink-muted">{about.blindness}</p>}
      </div>
      {notice && (
        <div className="px-6 pt-4">
          <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
        </div>
      )}
      <Table
        caption="Members the termination rule reaches, or is one away from"
        columns={columns}
        rows={rows}
        rowKey="memberId"
        loading={state === 'loading'}
        error={state === 'error' ? 'We could not load the termination report.' : null}
        onRetry={retry}
        emptyTitle="Nobody at two unpaids"
        emptyMessage="No member has two unpaid presentations in a row in the last thirteen months."
        dense
      />
      {/* Only when there is a next page, as the member search does: a short list needs no pager. */}
      {data.totalPages > 1 && (
        <PagerFor data={data} state={state} goTo={goTo} noun="members" size={PAGE_SIZE} />
      )}
      {confirming && (
        <EndingDialog
          member={confirming}
          onClose={(refused) => {
            setConfirming(null);
            if (refused) retry();
          }}
          onEnded={(answer) => {
            setEnded((previous) => ({ ...previous, [confirming.memberId]: answer }));
            const letter = LETTER_STATUS_LABEL[answer?.letterStatus];
            setNotice({
              tone: 'ok',
              message: `${confirming.surname || confirming.membershipNumber}’s membership is ended.`
                + (letter ? ` Their letter: ${letter.toLowerCase()}.` : ''),
            });
            setConfirming(null);
          }}
        />
      )}
    </Sheet>
  );
}

/** Confirming one ending: irreversible here, so it asks first and says what happens. The request carries nothing. */
function EndingDialog({ member, onClose, onEnded }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [settled, setSettled] = useState(false);
  const name = member.surname || member.membershipNumber;

  const end = async () => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      onEnded(await dodService.terminate(member.memberId));
    } catch (err) {
      reportError('AcbTerminationReport.terminate', err);
      setNotice({ message: writeOutcome(err, `Ending ${name}’s membership`).message });
      setSettled(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={closeOn(() => onClose(settled))}
      title={`End ${name}’s membership?`}
      description={`${member.thirdUnpaidOn ? `Their third unpaid was on ${formatDateLong(member.thirdUnpaidOn)}. ` : ''}`
        + 'The membership ends today, the day you confirm it, and a short letter is prepared for them. This cannot be undone here.'}
      size="md"
      busy={busy}
      footer={settled ? <ModalClose>Close</ModalClose> : (
        <>
          <ModalClose>Cancel</ModalClose>
          <Button variant="danger" loading={busy} onClick={end}>Confirm the ending</Button>
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
    </Modal>
  );
}
