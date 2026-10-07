import { useCallback, useEffect, useRef, useState } from 'react';
import Sheet from '../../components/common/Sheet.jsx';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import Table from '../../components/table/Table.jsx';
import Modal, { ModalClose, closeOn } from '../../components/overlay/Modal.jsx';
import { Button, SelectInput, TextInput } from '../../components/form';
import reportError from '../../lib/reportError.js';
import { dodService } from '../../services/dodService.js';
import { UNPAID_REASON_LABEL } from './acbRunRules.js';
import { DOD_REFUSAL, RE_DEBIT_LABEL, readFailure, refusalCode, writeOutcome } from './dodRules.js';

/** The server's limits on a code's words (dod-api §7.1). */
const WORDING_LIMIT = 100;
const NOTE_LIMIT = 255;

const RE_DEBIT_OPTIONS = Object.entries(RE_DEBIT_LABEL).map(([value, label]) => ({ value, label }));
const REASON_OPTIONS = Object.entries(UNPAID_REASON_LABEL).map(([value, label]) => ({ value, label }));

/**
 * The bank's return codes and SASBO's suspension codes -- her "Suspension codes" sheet, as data (dod-api §7.1). Where
 * she has not said whether a code may be re-debited (6, 15, 18 and 26, Friday item 9), the code stays "not yet
 * confirmed" and nothing with it is presented again; once SASBO answers, the answer is set here, with the reason, and
 * the next run honours it. Changing a code is DOD_SETTINGS; the page is behind it.
 */
export default function DodCodes() {
  const [codes, setCodes] = useState({ state: 'loading', data: null, error: null });
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(null);
  const left = useRef(false);
  useEffect(() => () => { left.current = true; }, []);

  const load = useCallback(() => {
    dodService.codes()
      .then((data) => { if (!left.current) setCodes({ state: 'ready', data, error: null }); })
      .catch((err) => { reportError('DodCodes.load', err); if (!left.current) setCodes({ state: 'error', data: null, error: err }); });
  }, []);
  useEffect(() => { load(); }, [load]);
  const reload = () => { setCodes((now) => ({ ...now, state: 'loading' })); load(); };

  const bankCodes = Array.isArray(codes.data?.bankCodes) ? codes.data.bankCodes : [];
  const suspensionCodes = Array.isArray(codes.data?.suspensionCodes) ? codes.data.suspensionCodes : [];

  const columns = [
    { key: 'bankCode', header: 'Bank code', priority: 'essential', cell: (c) => <span className="tabular-nums">{c.bankCode}</span> },
    { key: 'wording', header: 'Meaning', priority: 'essential', cell: (c) => c.wording || UNPAID_REASON_LABEL[c.reason] || c.reason },
    {
      key: 'suspension', header: 'SASBO code', priority: 'secondary',
      cell: (c) => (c.suspensionCode == null ? 'None on record' : `${c.suspensionCode} ${c.suspensionName ?? ''}`.trim()),
    },
    {
      key: 'reDebit', header: 'Re-debit', priority: 'essential',
      cell: (c) => (
        <span>
          {RE_DEBIT_LABEL[c.reDebit] ?? c.reDebit}
          {(c.reDebitSource || c.provisional) && (
            <span className="block text-xs text-ink-muted">{[c.reDebitSource, c.provisional ? 'provisional' : null].filter(Boolean).join(' · ')}</span>
          )}
        </span>
      ),
    },
    { key: 'note', header: 'Why', priority: 'detail', nowrap: false, cell: (c) => c.note ?? '—' },
    {
      key: 'change', header: 'Change', priority: 'essential',
      cell: (c) => <Button onClick={() => setEditing({ code: c })} aria-label={`Change bank code ${c.bankCode}`}>Change</Button>,
    },
  ];

  return (
    <Sheet className="mt-6" aria-labelledby="dod-codes-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-6 py-4">
        <div className="min-w-0">
          <h2 id="dod-codes-heading" className="text-base font-semibold text-ink">The bank’s return codes</h2>
          <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
            What each code the bank returns means, SASBO’s suspension code for it, and whether the debit may be presented
            again. A code SASBO has not yet confirmed is never re-debited.
          </p>
        </div>
        {codes.state === 'ready' && <Button onClick={() => setEditing({ adding: true })}>Add a bank code</Button>}
      </div>
      {notice && <div className="px-6 pt-4"><DialogNotice notice={notice} onDismiss={() => setNotice(null)} /></div>}
      <Table
        caption="The bank's return codes"
        columns={columns}
        rows={bankCodes}
        rowKey="bankCode"
        loading={codes.state === 'loading'}
        error={codes.state === 'error' ? readFailure(codes.error, 'We could not load the bank codes.') : null}
        onRetry={reload}
        emptyTitle="No bank codes on record"
        emptyMessage="Add the codes the bank returns."
        dense
      />
      {editing && (
        <CodeDialog
          code={editing.code}
          suspensionCodes={suspensionCodes}
          onClose={(changed) => { setEditing(null); if (changed) reload(); }}
          onSaved={(saved) => {
            setEditing(null);
            setNotice({ tone: 'ok', message: `Bank code ${saved.bankCode} is saved: ${RE_DEBIT_LABEL[saved.reDebit] ?? saved.reDebit}.` });
            reload();
          }}
        />
      )}
    </Sheet>
  );
}

/** Changing one code, or adding one: always with the reason, which the code keeps. */
function CodeDialog({ code, suspensionCodes, onClose, onSaved }) {
  const adding = !code;
  const [form, setForm] = useState({
    bankCode: '', reason: 'OTHER', wording: code?.wording ?? '', reDebit: code?.reDebit ?? 'UNKNOWN',
    suspensionCode: code?.suspensionCode == null ? '' : String(code.suspensionCode), provisional: code?.provisional ?? true, note: '',
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [settled, setSettled] = useState(false);
  const set = (field) => (value) => setForm((now) => ({ ...now, [field]: value }));

  const note = form.note.trim();
  const wording = form.wording.trim();
  const why = adding && !/^[1-9]\d{0,2}$/.test(form.bankCode.trim()) ? 'The bank code is a number from 1 to 999.'
    : !wording ? 'Say what the code means.'
      : wording.length > WORDING_LIMIT ? `Keep the meaning to ${WORDING_LIMIT} characters.`
        : !note ? 'Say why it is set this way, and on whose word.'
          : note.length > NOTE_LIMIT ? `Keep the reason to ${NOTE_LIMIT} characters.` : null;

  const save = async () => {
    if (why || busy) return;
    setBusy(true);
    setNotice(null);
    const suspensionCode = form.suspensionCode === '' ? null : Number(form.suspensionCode);
    try {
      const saved = adding
        ? await dodService.addCode({ bankCode: form.bankCode.trim(), reason: form.reason, wording, reDebit: form.reDebit, suspensionCode, note })
        : await dodService.updateCode(code.bankCode, { version: code.version, reDebit: form.reDebit, suspensionCode, wording, provisional: form.provisional, note });
      onSaved(saved);
    } catch (err) {
      reportError('DodCodes.save', err);
      setNotice({
        message: refusalCode(err) === DOD_REFUSAL.CODE_VERSION_CONFLICT
          ? `Someone else changed bank code ${code?.bankCode} first. Nothing was changed. Close this and it shows as it stands.`
          : writeOutcome(err, adding ? 'The new code' : 'The change').message,
      });
      setSettled(true);
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || settled;
  return (
    <Modal
      open
      onOpenChange={closeOn(() => onClose(settled))}
      title={adding ? 'Add a bank code' : `Change bank code ${code.bankCode}`}
      description="The next run prepared honours the change. A re-debit already waiting whose code no longer allows one is not presented."
      size="md"
      busy={busy}
      footer={settled ? <ModalClose>Close</ModalClose> : (
        <>
          {why && <p id="dod-code-why" className="mr-auto text-sm text-ink-muted">{why}</p>}
          <ModalClose>Cancel</ModalClose>
          <Button variant="primary" loading={busy} disabled={Boolean(why)} onClick={save} aria-describedby={why ? 'dod-code-why' : undefined}>
            {adding ? 'Add the code' : 'Save the change'}
          </Button>
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
      <div className="grid gap-4">
        {adding && (
          <>
            <TextInput label="Bank code" kind="number" value={form.bankCode} onChange={(e) => set('bankCode')(e.target.value)} disabled={disabled} />
            <SelectInput label="Reason it stands for" value={form.reason} onChange={set('reason')} options={REASON_OPTIONS} disabled={disabled} />
          </>
        )}
        <TextInput label="Meaning" value={form.wording} onChange={(e) => set('wording')(e.target.value)} disabled={disabled}
          hint={`As the bank's report and SASBO's sheet say it. At most ${WORDING_LIMIT} characters.`} />
        <SelectInput label="May it be re-debited?" value={form.reDebit} onChange={set('reDebit')} options={RE_DEBIT_OPTIONS} disabled={disabled} />
        <SelectInput label="SASBO’s suspension code" value={form.suspensionCode} onChange={set('suspensionCode')} disabled={disabled}
          options={[{ value: '', label: 'None on record' }, ...suspensionCodes.map((s) => ({ value: String(s.code), label: `${s.code} ${s.name}` }))]} />
        {!adding && (
          <label className="flex items-center gap-3 text-sm text-ink">
            <input type="checkbox" className="size-4 shrink-0 accent-brand" checked={form.provisional} disabled={disabled}
              onChange={(e) => set('provisional')(e.target.checked)} />
            Provisional: still to be confirmed by SASBO
          </label>
        )}
        <TextInput label="Why, and on whose word" multiline rows={2} value={form.note} onChange={(e) => set('note')(e.target.value)}
          hint={`For example, “Stephne, by e-mail, 9 October”. At most ${NOTE_LIMIT} characters.`} disabled={disabled} />
      </div>
    </Modal>
  );
}
