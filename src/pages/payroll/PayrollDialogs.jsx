import { useEffect, useRef, useState } from 'react';

import DataState from '../../components/common/DataState.jsx';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import StatusChip from '../../components/common/StatusChip.jsx';
import Button from '../../components/form/Button.jsx';
import DateField from '../../components/form/DateField.jsx';
import SelectInput from '../../components/form/SelectInput.jsx';
import TextInput from '../../components/form/TextInput.jsx';
import Modal, { ModalClose } from '../../components/overlay/Modal.jsx';
import { formatInt } from '../../lib/format.js';
import reportError from '../../lib/reportError.js';
import { messageOf, writeMayHaveLanded } from '../../services/parseApiError.js';
import {
  addNote, compareAgain, getDiscrepancy, payrollRefusalOf, recordPayment, resolveDiscrepancy,
} from '../../services/payrollService.js';
import { instantLabel } from '../admin/monthEndRules.js';
import { ToneChip } from './PayrollParts.jsx';
import {
  COLUMN_FIELDS, DEFAULT_LIMITS, differenceLabel, discrepancyLabel, discrepancyStatusOf, fileTitle, mappingOf,
  mappingProblems, monthLabel, noteProblem, outcomeLabel, rands, RESOLVED, typedAmountOf, REFUSAL,
} from './payrollRules.js';

/** Who a discrepancy is about, in a few words: the member on record, else the line on the file, else the file. */
export const whoOf = (discrepancy) => {
  if (discrepancy?.member) return `${discrepancy.member.name} (${discrepancy.member.membershipNumber})`;
  const row = discrepancy?.row;
  if (row) {
    const name = [row.initials, row.surname].filter(Boolean).join(' ');
    return [name, row.staffNumber && `staff number ${row.staffNumber}`].filter(Boolean).join(', ') || `Line ${row.rowNumber}`;
  }
  return 'The whole file';
};

/**
 * A DISCREPANCY: why it is listed, what to do (Stephne's rule, in the server's words), its notes, and -- for an
 * administrator who processes payroll -- a note, or the outcome that resolves it. It stays open until resolved
 * (PAY-20). Resolving records what was done; it never changes the member's record, which is done on the record itself.
 *
 * 🔴 A RESOLVE SENDS THE VERSION LAST READ. Two administrators can work the same list; one resolving a discrepancy the
 * other has just changed is refused (`DISCREPANCY_CHANGED_SINCE`, `DISCREPANCY_ALREADY_RESOLVED`), and the dialog reads
 * it again and says so rather than writing over the other's work. A write whose answer never arrived is read again
 * too, before anything is said of it.
 */
export function DiscrepancyDialog({ discrepancyId, vocabulary, canProcess, onClose }) {
  const [state, setState] = useState('loading');
  const [discrepancy, setDiscrepancy] = useState(null);
  const [failure, setFailure] = useState(null);
  const [asked, setAsked] = useState(0);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState('');
  const [saving, setSaving] = useState(null);
  const [notice, setNotice] = useState(null);
  // Which press was tried -- 'note' or 'resolve' -- so a note sent alone never complains of a missing outcome.
  const [tried, setTried] = useState(null);
  const changed = useRef(false);
  const noteRef = useRef(null);
  const limit = vocabulary?.limits?.noteMaxLength ?? DEFAULT_LIMITS.noteMaxLength;

  useEffect(() => {
    let current = true;
    getDiscrepancy(discrepancyId)
      .then((answer) => {
        if (!current) return;
        setDiscrepancy(answer);
        setState('ready');
      })
      .catch((error) => {
        reportError('PayrollDiscrepancy.read', error);
        if (!current) return;
        setFailure(error);
        setState('error');
      });
    return () => { current = false; };
  }, [discrepancyId, asked]);

  const readAgain = () => {
    setState('loading');
    setAsked((n) => n + 1);
  };

  const resolved = discrepancy?.status === RESOLVED;
  const noteWhy = noteProblem(note, limit);
  const resolveWhy = !outcome ? 'Choose the outcome first.' : noteWhy;

  const write = async (kind) => {
    setTried(kind);
    if (saving || (kind === 'note' ? noteWhy : resolveWhy)) return;
    setSaving(kind);
    setNotice(null);
    try {
      const answer = kind === 'note'
        ? await addNote(discrepancyId, note.trim())
        : await resolveDiscrepancy(discrepancyId, { outcome, note: note.trim(), version: discrepancy.version });
      changed.current = true;
      setDiscrepancy(answer);
      setNote('');
      setTried(null);
      setNotice({
        tone: 'ok',
        message: kind === 'note' ? 'The note was added.' : `Resolved: ${outcomeLabel(outcome, vocabulary)}.`,
      });
    } catch (error) {
      reportError(`PayrollDiscrepancy.${kind}`, error);
      const code = payrollRefusalOf(error)?.code;
      if (code === REFUSAL.DISCREPANCY_CHANGED_SINCE || code === REFUSAL.DISCREPANCY_ALREADY_RESOLVED) {
        changed.current = true;
        setNotice({ message: `${error.message} It has been read again, as it now stands.` });
        readAgain();
      } else if (writeMayHaveLanded(error)) {
        changed.current = true;
        setNotice({ message: 'Whether that was saved could not be confirmed. It has been read again: check it before trying again.' });
        readAgain();
      } else {
        setNotice({ message: `Nothing was saved. ${messageOf(error)}` });
      }
    } finally {
      setSaving(null);
    }
  };

  const label = discrepancy ? discrepancyLabel(discrepancy.type, vocabulary) : 'Discrepancy';
  const status = discrepancyStatusOf(discrepancy?.status);

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose(changed.current); }}
      title={label}
      description={discrepancy ? `${whoOf(discrepancy)} · ${discrepancy.employer?.name ?? ''}, ${monthLabel(discrepancy.period)}` : undefined}
      size="lg"
      busy={saving != null}
      initialFocusRef={canProcess ? noteRef : undefined}
      footer={(
        <>
          <ModalClose>Close</ModalClose>
          {canProcess && state === 'ready' && !resolved && (
            <>
              <Button onClick={() => write('note')} loading={saving === 'note'} disabled={saving != null}>Add the note</Button>
              <Button variant="primary" onClick={() => write('resolve')} loading={saving === 'resolve'} disabled={saving != null}>
                Resolve
              </Button>
            </>
          )}
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
      {state === 'loading' && <DataState state="loading" compact title="Reading the discrepancy…" />}
      {state === 'error' && (
        <DataState state="error" compact error={failure} title="The discrepancy could not be read." onRetry={readAgain} />
      )}
      {state === 'ready' && discrepancy && (
        <div className="grid gap-5">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(8rem,auto)_1fr]">
            {discrepancy.member && (
              <>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Member</dt>
                <dd className="flex flex-wrap items-center gap-2 text-base text-ink">
                  {discrepancy.member.name} ({discrepancy.member.membershipNumber})
                  <StatusChip status={discrepancy.member.status} />
                  {discrepancy.member.paymentType && <span className="text-sm text-ink-muted">{discrepancy.member.paymentType}</span>}
                </dd>
              </>
            )}
            {discrepancy.row && (
              <>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">On the file</dt>
                <dd className="text-base text-ink">
                  Row {discrepancy.row.rowNumber}: {[
                    discrepancy.row.staffNumber && `staff number ${discrepancy.row.staffNumber}`,
                    discrepancy.row.idNumber && `ID number ${discrepancy.row.idNumber}`,
                    [discrepancy.row.initials, discrepancy.row.surname].filter(Boolean).join(' '),
                    discrepancy.row.amount != null && rands(discrepancy.row.amount),
                  ].filter(Boolean).join(' · ')}
                </dd>
              </>
            )}
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">What happened</dt>
            <dd className="text-base text-ink">{discrepancy.detail}</dd>
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">What to do</dt>
            <dd className="text-base text-ink">
              {discrepancy.whatToDo}
              {discrepancy.rule && <>{' '}<span className="ml-1 text-xs text-ink-muted">({discrepancy.rule})</span></>}
            </dd>
            {(discrepancy.amountOnFile != null || discrepancy.expectedAmount != null) && (
              <>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Amounts</dt>
                <dd className="tabular-nums text-ink">
                  {rands(discrepancy.amountOnFile)} on the file · {rands(discrepancy.expectedAmount)} expected
                  {discrepancy.difference != null && ` · ${differenceLabel(discrepancy.difference)}`}
                </dd>
              </>
            )}
            {discrepancy.months != null && (
              <>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Months</dt>
                <dd className="tabular-nums text-ink">{formatInt(discrepancy.months)}</dd>
              </>
            )}
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Status</dt>
            <dd className="flex flex-wrap items-center gap-2 text-sm text-ink">
              <ToneChip tone={status.tone}>{status.label}</ToneChip>
              {discrepancy.query && <span>On the query list raised on {instantLabel(discrepancy.query.raisedAt)}.</span>}
              {discrepancy.resolution && (
                <span>
                  {outcomeLabel(discrepancy.resolution.outcome, vocabulary)}, by {discrepancy.resolution.by} on{' '}
                  {instantLabel(discrepancy.resolution.at)}.
                </span>
              )}
            </dd>
          </dl>

          <section aria-labelledby="payroll-notes-heading" className="grid gap-2">
            <h3 id="payroll-notes-heading" className="text-base font-semibold text-ink">Notes</h3>
            {(discrepancy.notes ?? []).length === 0 ? (
              <p className="text-sm text-ink-muted">No notes yet.</p>
            ) : (
              <ol className="grid gap-2">
                {discrepancy.notes.map((entry) => (
                  <li key={entry.id} className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
                    <p className="whitespace-pre-wrap text-ink">{entry.text}</p>
                    <p className="mt-1 text-xs text-ink-muted">{entry.by}, {instantLabel(entry.at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {canProcess && !resolved && (
            <div className="grid gap-3">
              <TextInput
                ref={noteRef}
                label="Note"
                multiline
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                hint={`What was done or found, at most ${formatInt(limit)} characters. A note is needed to resolve.`}
                error={tried ? noteWhy ?? undefined : undefined}
                disabled={saving != null}
              />
              <SelectInput
                label="Outcome, to resolve it"
                value={outcome}
                placeholder="Choose the outcome"
                options={(discrepancy.outcomes ?? []).map((code) => ({ value: code, label: outcomeLabel(code, vocabulary) }))}
                onChange={(value) => setOutcome(value)}
                error={tried === 'resolve' && !outcome ? 'Choose the outcome first.' : undefined}
                disabled={saving != null}
              />
              <p className="text-sm text-ink-muted">
                Resolving records what was done. A member’s status or payment is changed on the member’s record.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/**
 * RECORD A PAYMENT -- the money an employer paid in for the month (PAY-28). The file is then checked again: a
 * difference from the file's total less the employer's fee opens a *Payment differs*, an exact total resolves it.
 *
 * 🔴 A PAYMENT IS NOT SAFE TO SEND TWICE -- two records are two payments. So an answer that never arrived closes the
 * dialog and reads the file again, for the administrator to see whether it was recorded before trying again.
 */
export function PaymentDialog({ file, onClose }) {
  const [amount, setAmount] = useState('');
  const [receivedOn, setReceivedOn] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [tried, setTried] = useState(false);
  const amountRef = useRef(null);

  const money = typedAmountOf(amount);
  const why = !money ? 'Give the amount received, in rands and cents.'
    : !receivedOn ? 'Choose the day it was received.'
      : reference.trim().length > 60 ? 'Keep the reference to 60 characters.' : null;

  const save = async () => {
    setTried(true);
    if (why || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      await recordPayment({
        employerId: file.employer.id, period: file.period, amount: money, receivedOn, reference: reference.trim() || null,
      });
      onClose('saved');
    } catch (error) {
      reportError('PayrollPayment.record', error);
      if (writeMayHaveLanded(error)) onClose('unconfirmed');
      else setNotice({ message: `The payment was not recorded. ${messageOf(error)}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose(null); }}
      title="Record a payment received"
      description={`From ${file.employer?.name ?? 'the employer'}, for ${monthLabel(file.period)}.`}
      size="md"
      busy={saving}
      initialFocusRef={amountRef}
      footer={(
        <>
          {tried && why && <p className="mr-auto text-sm text-ink-muted">{why}</p>}
          <ModalClose>Cancel</ModalClose>
          <Button variant="primary" onClick={save} loading={saving}>Record the payment</Button>
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
      <div className="grid gap-4">
        <TextInput
          ref={amountRef}
          label="Amount received (R)"
          kind="money"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={tried && !money ? 'Give the amount in rands and cents, such as 5738.52.' : undefined}
          disabled={saving}
        />
        <DateField
          label="Received on"
          required
          max="today"
          value={receivedOn}
          onChange={(event) => setReceivedOn(event.target.value)}
          error={tried && !receivedOn ? 'Choose the day it was received.' : undefined}
          disabled={saving}
        />
        <TextInput
          label="Reference"
          kind="reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          hint="The bank statement’s reference, if there is one."
          disabled={saving}
        />
      </div>
    </Modal>
  );
}

/**
 * CHANGE THE COLUMNS -- the heading the file prints for each field, chosen from the headings the server found on the
 * file's heading row (`layout.columns`), then the file compared again with them (route 10). Every employer lays its
 * file out differently (PAY-03, PAY-08); a wrong column is fixed here rather than by loading the file again.
 */
export function ColumnsDialog({ file, onClose }) {
  const found = Array.isArray(file.layout?.columns) ? file.layout.columns : [];
  const [draft, setDraft] = useState(() => ({ ...(file.layout?.headings ?? {}) }));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [tried, setTried] = useState(false);
  const problems = mappingProblems(draft);

  const save = async () => {
    setTried(true);
    if (problems.length || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      onClose({ answer: await compareAgain(file.id, { version: file.version, columnMapping: mappingOf(draft) }) });
    } catch (error) {
      reportError('PayrollColumns.compare', error);
      const code = payrollRefusalOf(error)?.code;
      if (code === REFUSAL.FILE_CHANGED_SINCE) onClose({ message: `${error.message} The file has been read again.` });
      else if (writeMayHaveLanded(error)) onClose({ message: 'Whether the file was compared again could not be confirmed. It has been read again.' });
      else setNotice({ message: `The file was not compared again. ${messageOf(error)}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose(null); }}
      title="Change the columns"
      description={`The heading ${fileTitle(file)} prints for each field. The file is compared again with them.`}
      size="lg"
      busy={saving}
      footer={(
        <>
          <ModalClose>Cancel</ModalClose>
          <Button variant="primary" onClick={save} loading={saving}>Compare again with these columns</Button>
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
      <div className="grid gap-4 sm:grid-cols-2">
        {COLUMN_FIELDS.map(({ field, label }) => (found.length > 0 ? (
          <SelectInput
            key={field}
            label={label}
            value={draft[field] ?? ''}
            placeholder="Not on the file"
            options={found.map((heading) => ({ value: heading, label: heading }))}
            onChange={(value) => setDraft((was) => ({ ...was, [field]: value || null }))}
            disabled={saving}
          />
        ) : (
          <TextInput
            key={field}
            label={label}
            value={draft[field] ?? ''}
            hint="As printed on the heading row."
            onChange={(event) => setDraft((was) => ({ ...was, [field]: event.target.value }))}
            disabled={saving}
          />
        )))}
      </div>
      {file.layout?.headingRow && (
        <p className="mt-3 text-sm text-ink-muted">
          Read from {file.layout.sheet ? `the sheet “${file.layout.sheet}”, ` : ''}row {formatInt(file.layout.headingRow)}.
        </p>
      )}
      {tried && problems.length > 0 && (
        <ul className="mt-3 list-disc pl-5 text-sm text-status-suspended" role="alert">
          {problems.map((problem) => <li key={problem}>{problem}</li>)}
        </ul>
      )}
    </Modal>
  );
}

