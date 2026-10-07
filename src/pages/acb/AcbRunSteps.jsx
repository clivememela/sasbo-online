import { useEffect, useRef, useState } from 'react';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import Modal, { ModalClose, closeOn } from '../../components/overlay/Modal.jsx';
import { Button, SelectInput, TextInput } from '../../components/form';
import { useAuth } from '../../auth/useAuth';
import { PERMISSIONS } from '../../auth/permissions';
import reportError from '../../lib/reportError.js';
import saveFile from '../../lib/saveFile.js';
import { formatDateLong, formatInt, formatZar } from '../../lib/format.js';
import { dodService } from '../../services/dodService.js';
import { messageOf } from '../../services/parseApiError.js';
import { CANCELLABLE, DECLINE_REASON_LABEL, RUN_STATUS, RUN_STATUS_LABEL, monthLabel } from './acbRunRules.js';
import { DOD_REFUSAL, readFailure, refusalCode, runFileName, writeOutcome } from './dodRules.js';

/** The server keeps the bank's words to this many characters (dod-api §2). */
export const BANK_WORDS_LIMIT = 300;

const DECLINE_REASONS = Object.entries(DECLINE_REASON_LABEL).map(([value, label]) => ({ value, label }));

/**
 * A run's next steps after preparing, each for the permission that takes it (`contracts/dod-api.md` §2):
 * approve (DOD_PREPARE; no second approval, Stephne, DOD-10) -> the bank file (DOD_FILE, "The CFO only", DOD-11) ->
 * recorded as submitted (DOD_FILE) -> the returns, by debit day -> returns in (DOD_PREPARE) -> closed (DOD_PREPARE).
 * A submitted file the bank declines is recorded by DOD_FILE too.
 *
 * 🔑 EVERY STEP CARRIES THE VERSION THE SCREEN SHOWED, and nothing is repeated after an answer that never came: the
 * dialog says the step could not be confirmed, offers no second press, and closing it reads the run again. A refusal
 * is said inside the dialog, in the server's sentence, unless the screen has better words for it.
 *
 * `onChanged(notice)` re-reads the list and the run; the notice is the page's, since the run's panel remounts.
 */
export default function AcbRunSteps({ run, onChanged }) {
  const { can } = useAuth();
  const prepares = can(PERMISSIONS.DOD_PREPARE);
  const files = can(PERMISSIONS.DOD_FILE);
  const month = monthLabel(run.actionMonth);
  const downloads = run.fileDownloads ?? null;

  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialogNotice, setDialogNotice] = useState(null);
  // A refusal or an unconfirmed write: the dialog offers nothing more, and closing it reads the run again.
  const [settled, setSettled] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fileNotice, setFileNotice] = useState(null);

  const left = useRef(false);
  useEffect(() => () => { left.current = true; }, []);

  const steps = {
    approve: {
      title: `Approve the ${month} run?`,
      description: `${formatInt(run.lineCount)} debits, ${formatZar(run.totalAmount)}. Approving makes the bank file ready `
        + 'for the Chief Financial Officer to download. There is no second approval: the bank checks the file.',
      confirmLabel: 'Approve', what: 'The approval', verb: 'approved', destructive: false,
      send: () => dodService.approve(run.id, run.version),
      done: `The ${month} run is approved. The Chief Financial Officer can now download its bank file.`,
    },
    submitted: {
      title: `Record the ${month} file as submitted?`,
      description: 'Record this once the bank has the file. A submitted run can no longer be cancelled, and the bank’s '
        + 'returns are recorded against it, one report for each debit day.',
      confirmLabel: 'Record as submitted', what: 'The submission', verb: 'recorded', destructive: false,
      send: () => dodService.submitted(run.id, run.version),
      done: `The ${month} file is recorded as submitted to the bank. Record its returns as each debit day’s report arrives.`,
    },
    returned: {
      title: `Mark the ${month} returns as in?`,
      description: 'Every debit not recorded as unpaid is then marked paid, because the bank’s report lists only what came back.',
      confirmLabel: 'Mark returns in', what: 'Marking the returns in', verb: 'marked', destructive: false,
      send: () => dodService.returned(run.id, run.version),
      done: `The ${month} returns are in: every debit not recorded as unpaid is marked paid.`,
    },
    close: {
      title: `Close the ${month} run?`,
      description: 'Closing is final. Once closed, no unpaid in this run can be recorded or decided.',
      confirmLabel: 'Close the run', what: 'Closing the run', verb: 'closed', destructive: true,
      send: () => dodService.close(run.id, run.version),
      done: `The ${month} run is closed.`,
    },
  };

  const start = (key) => {
    setOpen(key);
    setDialogNotice(null);
    setSettled(false);
  };

  const close = () => {
    setOpen(null);
    // Whatever the answer was, the run is shown as it now stands.
    if (settled) onChanged();
  };

  const take = async (key, send) => {
    const step = steps[key] ?? DECLINE;
    setBusy(true);
    setDialogNotice(null);
    try {
      await send();
      if (left.current) return;
      setOpen(null);
      onChanged({ tone: 'ok', message: step.done ?? `The bank’s decline of the ${month} file is recorded. The month can be prepared again.` });
    } catch (err) {
      reportError(`AcbRunSteps.${key}`, err);
      if (left.current) return;
      setDialogNotice({ message: stepRefused(err, step) });
      setSettled(true);
    } finally {
      if (!left.current) setBusy(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    setFileNotice(null);
    try {
      const file = await dodService.runFile(run.id);
      if (left.current) return;
      saveFile(file, runFileName(run.actionMonth));
      onChanged({ tone: 'ok', message: `The ${month} bank file was downloaded as ${file.filename || runFileName(run.actionMonth)}. `
        + 'Take it to the bank, then record that it was submitted.' });
    } catch (err) {
      reportError('AcbRunSteps.download', err);
      if (!left.current) setFileNotice({ message: readFailure(err, `The bank file could not be downloaded. ${messageOf(err)}`, PERMISSIONS.DOD_FILE) });
    } finally {
      if (!left.current) setDownloading(false);
    }
  };

  const step = open && open !== 'declined' ? steps[open] : null;
  const status = run.status;

  return (
    <div className="mt-4 grid gap-3">
      {status === RUN_STATUS.PREPARED && (
        <StepRow
          action={prepares && <Button variant="primary" onClick={() => start('approve')}>Approve</Button>}
          note={prepares
            ? 'There is no second approval: whoever prepared the run may approve it, and the bank checks the file.'
            : 'An administrator approves the run. There is no second approval.'}
        />
      )}

      {status === RUN_STATUS.APPROVED && (
        <>
          <StepRow
            action={files && (
              <Button variant="primary" loading={downloading} onClick={download}>
                {downloads ? 'Download again' : 'Download the bank file'}
              </Button>
            )}
            note={files
              ? 'Take the file to the bank yourself. Every download is recorded.'
              : 'Only the Chief Financial Officer downloads the bank file and takes it to the bank.'}
          />
          <DialogNotice notice={fileNotice} onDismiss={() => setFileNotice(null)} />
          {files && (
            <StepRow
              action={(
                <Button onClick={() => start('submitted')} disabled={downloads === 0} aria-describedby="dod-submit-why">
                  Record as submitted
                </Button>
              )}
              note={downloads === 0 ? 'Download the file first: a run is recorded as submitted once its file has gone to the bank.'
                : 'Once the bank has the file, record it here.'}
              noteId="dod-submit-why"
            />
          )}
        </>
      )}
      {downloads > 0 && (
        <p className="text-sm text-ink-muted">
          The bank file was downloaded {downloads === 1 ? 'once' : `${formatInt(downloads)} times`}
          {run.lastDownloadedBy ? `, last by ${run.lastDownloadedBy}` : ''}
          {run.lastDownloadedAt ? ` on ${formatDateLong(run.lastDownloadedAt.slice(0, 10))}` : ''}.
        </p>
      )}

      {status === RUN_STATUS.SUBMITTED && (prepares || files) && (
        <div className="flex flex-wrap items-center gap-3">
          {prepares && <Button variant="primary" onClick={() => start('returned')}>Mark returns in</Button>}
          {files && <Button variant="danger" onClick={() => start('declined')}>The bank declined the file</Button>}
        </div>
      )}
      {status === RUN_STATUS.RETURNED && prepares && (
        <StepRow
          action={<Button variant="primary" onClick={() => start('close')}>Close the run</Button>}
          note="Close the run once every unpaid in it has a decision on Manage Re-Debits."
        />
      )}
      {status === RUN_STATUS.CLOSED && <p className="text-sm text-ink-muted">This run is closed.</p>}

      {step && (
        <Modal
          open
          onOpenChange={closeOn(close)}
          title={step.title}
          description={step.description}
          size="sm"
          busy={busy}
          footer={settled ? <ModalClose>Close</ModalClose> : (
            <>
              <ModalClose variant="ghost">Not now</ModalClose>
              <Button variant={step.destructive ? 'danger' : 'primary'} loading={busy} onClick={() => take(open, step.send)}>
                {step.confirmLabel}
              </Button>
            </>
          )}
        >
          <DialogNotice notice={dialogNotice} onDismiss={() => setDialogNotice(null)} />
        </Modal>
      )}

      {open === 'declined' && (
        <DeclineDialog month={month} busy={busy} notice={dialogNotice} settled={settled}
          onDismissNotice={() => setDialogNotice(null)} onClose={close}
          onRecord={(reason, words) => take('declined', () => dodService.declined(run.id, run.version, reason, words))} />
      )}
    </div>
  );
}

/** The decline's step words: a refusal is about the decline, and it releases the month when it goes through. */
const DECLINE = { what: 'The decline', verb: 'recorded' };

/** A step's refusal, in the screen's words where it has better ones than the server's. */
function stepRefused(err, step) {
  const code = refusalCode(err);
  if (code === DOD_REFUSAL.RUN_VERSION_CONFLICT || code === DOD_REFUSAL.RUN_NOT_IN_STATE) {
    const now = RUN_STATUS_LABEL[err.body.details?.status] ?? err.body.details?.status;
    return `Someone else changed this run first${now ? `: it is now ${String(now).toLowerCase()}` : ''}. `
      + `Nothing was ${step.verb}. Close this and the run shows as it stands.`;
  }
  if (code === DOD_REFUSAL.FILE_NOT_RENDERED) {
    return 'Download the bank file before recording that it went to the bank. Nothing was recorded.';
  }
  if (code === DOD_REFUSAL.UNPAIDS_UNDECIDED) {
    return `${messageOf(err)} Decide each one on Manage Re-Debits, then close the run.`;
  }
  return writeOutcome(err, step.what).message;
}

function StepRow({ action, note, noteId }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {action}
      <p id={noteId} className="text-sm text-ink-muted">{note}</p>
    </div>
  );
}

/** Recording that the bank declined the file: its reason from the short list, and its own words (D29). */
function DeclineDialog({ month, busy, notice, settled, onDismissNotice, onClose, onRecord }) {
  const [reason, setReason] = useState('');
  const [words, setWords] = useState('');
  const trimmed = words.trim();
  const why = !reason ? 'Choose the bank’s reason first.'
    : trimmed.length > BANK_WORDS_LIMIT ? `Keep the bank’s words to ${BANK_WORDS_LIMIT} characters.` : null;

  return (
    <Modal
      open
      onOpenChange={closeOn(onClose)}
      title={`Record that the bank declined the ${month} file`}
      description="Recording a decline releases the month, so it can be prepared again as a new run."
      size="md"
      busy={busy}
      footer={(
        <>
          {why && !settled && <p id="dod-decline-why" className="mr-auto text-sm text-ink-muted">{why}</p>}
          <ModalClose>{settled ? 'Close' : 'Cancel'}</ModalClose>
          {!settled && (
            <Button variant="danger" loading={busy} disabled={Boolean(why)} aria-describedby={why ? 'dod-decline-why' : undefined}
              onClick={() => onRecord(reason, trimmed)}>
              Record the decline
            </Button>
          )}
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={onDismissNotice} />
      <div className="grid gap-4">
        <SelectInput label="The bank’s reason" value={reason} onChange={(value) => setReason(value)} options={DECLINE_REASONS}
          placeholder="Choose" disabled={busy || settled} />
        <TextInput label="The bank’s words (optional)" multiline rows={3} value={words}
          onChange={(e) => setWords(e.target.value)} hint={`At most ${BANK_WORDS_LIMIT} characters.`} disabled={busy || settled} />
      </div>
    </Modal>
  );
}

/** The states a run's cancel is offered in, for the panel: a proposal, cancelled by whoever prepares runs. */
export const cancellable = (run, can) => CANCELLABLE.has(run.status) && can(PERMISSIONS.DOD_PREPARE);
