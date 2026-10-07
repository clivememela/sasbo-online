import { useEffect, useState } from 'react';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import Modal, { ModalClose, closeOn } from '../../components/overlay/Modal.jsx';
import { Button, SelectInput, TextInput } from '../../components/form';
import reportError from '../../lib/reportError.js';
import { dodService } from '../../services/dodService.js';
import { DOD_REFUSAL, memberName, refusalCode, writeOutcome } from './dodRules.js';

/** The server keeps a suspension's note to this many characters (dod-api §4). */
export const SUSPEND_NOTE_LIMIT = 500;

/**
 * Suspending the member of an unpaid decided Suspend, with SASBO's suspension code (Stephne, DOD-12; her sheet maps
 * the bank's code to SASBO's: 4 -> 16, 30 -> 30, 15 -> 15, 26 -> 19, 6 -> 13, 2 -> 18). The code the bank's maps to is
 * chosen already and stays the administrator's to change; where the bank's code has none on record -- its 18,
 * "Deceased" (Friday item 1), or a code nobody knows -- one must be chosen. `onSuspended(answer)` is the server's word.
 */
export default function AcbSuspend({ run, line, onClose, onSuspended }) {
  const [codes, setCodes] = useState({ state: 'loading', list: [], error: null });
  const [attempt, setAttempt] = useState(0);
  const [code, setCode] = useState(line.suspensionCode == null ? '' : String(line.suspensionCode));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let live = true;
    dodService.codes()
      .then((answer) => { if (live) setCodes({ state: 'ready', list: Array.isArray(answer?.suspensionCodes) ? answer.suspensionCodes : [], error: null }); })
      .catch((err) => { reportError('AcbSuspend.codes', err); if (live) setCodes({ state: 'error', list: [], error: err }); });
    return () => { live = false; };
  }, [attempt]);

  const name = memberName(line);
  const trimmed = note.trim();
  const why = !code ? 'Choose SASBO’s suspension code first: the bank’s code has none on record.'
    : trimmed.length > SUSPEND_NOTE_LIMIT ? `Keep the note to ${SUSPEND_NOTE_LIMIT} characters.` : null;

  const suspend = async () => {
    if (why || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const answer = await dodService.suspendMember(run.id, line.id, { suspensionCode: Number(code), note: trimmed || undefined });
      onSuspended(answer);
    } catch (err) {
      reportError('AcbSuspend.suspend', err);
      setNotice({
        message: refusalCode(err) === DOD_REFUSAL.SUSPENSION_CODE_REQUIRED
          ? 'Choose SASBO’s suspension code: the bank’s code has none on record. Nothing was changed.'
          : writeOutcome(err, `Suspending ${name}`).message,
      });
      setSettled(true);
    } finally {
      setBusy(false);
    }
  };

  const options = codes.list.map((c) => ({ value: String(c.code), label: `${c.code} ${c.name}` }));
  return (
    <Modal
      open
      onOpenChange={closeOn(() => onClose(settled))}
      title={`Suspend ${name}?`}
      description={`Their status becomes Suspended, with SASBO’s suspension code. The unpaid is not presented again.`}
      size="md"
      busy={busy}
      footer={settled ? <ModalClose>Close</ModalClose> : (
        <>
          {why && <p id="dod-suspend-why" className="mr-auto text-sm text-ink-muted">{why}</p>}
          <ModalClose>Cancel</ModalClose>
          <Button variant="danger" loading={busy} disabled={Boolean(why)} onClick={suspend}
            aria-describedby={why ? 'dod-suspend-why' : undefined}>
            Suspend the member
          </Button>
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
      <div className="grid gap-4">
        <SelectInput
          label="SASBO’s suspension code"
          value={code}
          onChange={(value) => setCode(value)}
          options={options}
          placeholder="Choose"
          loading={codes.state === 'loading'}
          loadError={codes.error}
          onRetryLoad={() => { setCodes({ state: 'loading', list: [], error: null }); setAttempt((n) => n + 1); }}
          hint={line.unpaidCode ? `The bank returned code ${line.unpaidCode}.` : undefined}
          disabled={busy || settled}
        />
        <TextInput label="Note (optional)" multiline rows={2} value={note} onChange={(e) => setNote(e.target.value)}
          hint={`At most ${SUSPEND_NOTE_LIMIT} characters.`} disabled={busy || settled} />
      </div>
    </Modal>
  );
}
