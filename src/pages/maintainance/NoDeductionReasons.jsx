import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';

import DialogNotice, { PageNotice } from '../../components/common/DialogNotice.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import Button from '../../components/form/Button.jsx';
import SelectInput from '../../components/form/SelectInput.jsx';
import TextInput from '../../components/form/TextInput.jsx';
import Modal, { ModalClose, closeOn } from '../../components/overlay/Modal.jsx';
import Table from '../../components/table/Table.jsx';
import {
  NO_DEDUCTION_REASON_CHANGED_SINCE, NO_DEDUCTION_REASON_INVALID, NO_DEDUCTION_REASON_NOT_FOUND,
  NO_DEDUCTION_REASON_TAKEN, listRows,
} from '../../config/monthEnd.js';
import useAsyncOptions from '../../hooks/useAsyncOptions.js';
import useFocusOn from '../../hooks/useFocusOn.js';
import { formatInt } from '../../lib/format.js';
import reportError from '../../lib/reportError.js';
import { messageOf, writeMayHaveLanded } from '../../services/parseApiError.js';
import {
  addNoDeductionReason, changeNoDeductionReason, getNoDeductionReasons, getSuspensionCodes,
} from '../../services/referenceService.js';
import { failureOf, instantLabel } from '../admin/monthEndRules.js';
import { MaintainWhy, useMayMaintain } from './ReferenceParts.jsx';
import { PLACE_LIMIT, codeLabel, placeOf, reasonBody, reasonsOf, withReason } from './referenceRules.js';

/**
 * THE REASONS FOR NO PAYROLL DEDUCTION -- Stephne, MEN-17: "Can we have a dropdown sayin a reason for no payroll
 * deduction. Also have the opporenity to type a reason" (`contracts/monthend-rules-api.md` R1). Change status offers
 * these when a member is suspended under a code they stand under; this is where the list is kept.
 *
 *   read     every reason, offered or not, in the list's order -- by anyone (`GET /api/reference/no-deduction-reasons`).
 *   held     adding and changing need REFERENCE_MAINTAIN; anyone else sees the controls shut, and why.
 *   kept     there is no delete: a change of status may name the reason, so it is kept and stops being offered.
 *   stale    a change carries the version the screen read. Where somebody else changed the reason since, nothing is
 *            written, and the form takes their version so the person looks at it before changing it again.
 *   words    every refusal is the server's sentence, said where it happened: at the name, the code or the place, or
 *            above the form.
 */

const WHY_ID = 'no-deduction-reasons-why';
const NOT_AVAILABLE = 'The reasons for no payroll deduction are not available from this server yet.';
const UNCONFIRMED = 'The change could not be confirmed. The list is read again: look at it before trying again.';
const OFFERED = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No: kept, but not offered' },
];
const NO_ERRORS = { name: null, code: null, ordinal: null };

/** The form as `row` fills it, or empty for a new reason: offered unless said otherwise. */
const formOf = (row) => ({
  name: row?.name ?? '',
  code: row?.suspensionCode == null ? '' : String(row.suspensionCode),
  ordinal: row?.ordinal == null ? '' : String(row.ordinal),
  offered: row && !row.active ? 'no' : 'yes',
});

/** Who changed a reason last, and when -- the migration's own rows say so too. */
const changedLabel = (row) => [row.updatedAt && instantLabel(row.updatedAt), row.updatedBy && `by ${row.updatedBy}`]
  .filter(Boolean).join(' ');

/**
 * The list, read once and again whenever a person asks; a write's own answer, or the form's fresh read, is shown at
 * once (`show`). `latest` is the last list read, kept while the list is read again: the open form keeps its limits,
 * and stays open, while the list behind it is being read.
 */
function useReasons() {
  const [attempt, setAttempt] = useState(0);
  const [read, setRead] = useState({ attempt: -1 });
  const [latest, setLatest] = useState(null);
  useEffect(() => {
    let current = true;
    getNoDeductionReasons()
      .then((body) => {
        const answer = reasonsOf(body);
        if (!current) return;
        setRead({ attempt, answer, failure: answer ? null : failureOf(null, NOT_AVAILABLE) });
        if (answer) setLatest(answer);
      })
      .catch((error) => {
        reportError('NoDeductionReasons.read', error);
        if (current) setRead({ attempt, answer: null, failure: failureOf(error, NOT_AVAILABLE) });
      });
    return () => {
      current = false;
    };
  }, [attempt]);
  const pending = read.attempt !== attempt;
  return {
    pending,
    answer: pending ? null : read.answer,
    failure: pending ? null : read.failure,
    latest,
    reload: () => setAttempt((n) => n + 1),
    show: (answer) => {
      setRead({ attempt, answer, failure: null });
      setLatest(answer);
    },
  };
}

/**
 * The form, adding a reason (`editing` null) or changing one. `limits` are the list's (`nameLimit`). It reports what
 * it wrote through `onSaved(row)`, a list it read again through `onRead(answer)`, and a reason gone through `onGone`.
 */
function ReasonForm({ editing, adding, limits, onClose, onSaved, onRead, onGone }) {
  const open = Boolean(editing || adding);
  const [form, setForm] = useState(formOf(editing));
  const [version, setVersion] = useState(editing?.version);
  const [errors, setErrors] = useState(NO_ERRORS);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const nameField = useRef(null);

  // A new form each time it opens, for the reason it opens on.
  const [openedFor, setOpenedFor] = useState(null);
  const key = editing ? `edit:${editing.id}` : adding ? 'add' : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    setForm(formOf(editing));
    setVersion(editing?.version);
    setErrors(NO_ERRORS);
    setNotice(null);
  }

  const codes = useAsyncOptions(() => getSuspensionCodes().then((answer) => listRows(answer) ?? []), [],
    { enabled: open });
  const codeOptions = codes.options.map((row) => ({ value: String(row.code), label: codeLabel(row.code, row.name) }));
  // A reason under a code no longer on SASBO's list here keeps its code on offer, by its number.
  if (form.code && !codes.loading && !codeOptions.some((option) => option.value === form.code)) {
    codeOptions.push({ value: form.code, label: form.code });
  }

  const set = (field, value) => {
    setForm((was) => ({ ...was, [field]: value }));
    if (field in NO_ERRORS) setErrors((was) => ({ ...was, [field]: null }));
  };

  /** What the form can say before asking: a name, a code, and a place that is one. */
  const checked = () => {
    const found = {
      name: form.name.trim() ? null : 'Give the reason a name.',
      code: form.code ? null : 'Choose SASBO’s suspension code for it.',
      ordinal: placeOf(form.ordinal) === null ? `A place from 1 to ${PLACE_LIMIT}.` : null,
    };
    setErrors(found);
    return !found.name && !found.code && !found.ordinal;
  };

  /** Somebody else changed the reason since it was read: the list is read again, and the form takes theirs. */
  const takeTheirs = async (error) => {
    const { updatedBy, updatedAt } = error.body?.details ?? {};
    const who = [updatedBy && `by ${updatedBy}`, updatedAt && `on ${instantLabel(updatedAt)}`].filter(Boolean).join(' ');
    try {
      const fresh = reasonsOf(await getNoDeductionReasons());
      const theirs = fresh?.rows.find((row) => row.id === editing.id);
      if (fresh) onRead(fresh);
      if (!theirs) {
        setNotice({ message: `${messageOf(error)} The list could not show their version: close this and look at the list.` });
        return;
      }
      setForm(formOf(theirs));
      setVersion(theirs.version);
      setNotice({ message: `${messageOf(error)}${who ? ` It was changed ${who}.` : ''} Their version is in the form now.` });
    } catch (readError) {
      reportError('NoDeductionReasons.reread', readError);
      setNotice({ message: `${messageOf(error)} The list could not be read again: close this and try again.` });
    }
  };

  const save = async () => {
    setNotice(null);
    if (!checked()) return;
    setBusy(true);
    try {
      const row = editing
        ? await changeNoDeductionReason(editing.id, reasonBody(form, version))
        : await addNoDeductionReason(reasonBody(form));
      onSaved(row, Boolean(editing));
    } catch (error) {
      const code = error?.body?.code;
      const field = error?.body?.details?.field;
      if (code === NO_DEDUCTION_REASON_INVALID && ['name', 'suspensionCode', 'ordinal'].includes(field)) {
        setErrors((was) => ({ ...was, [field === 'suspensionCode' ? 'code' : field]: messageOf(error) }));
      } else if (code === NO_DEDUCTION_REASON_TAKEN) {
        setErrors((was) => ({ ...was, name: messageOf(error) }));
      } else if (code === NO_DEDUCTION_REASON_CHANGED_SINCE && editing) {
        await takeTheirs(error);
      } else if (code === NO_DEDUCTION_REASON_NOT_FOUND) {
        onGone(messageOf(error));
      } else if (writeMayHaveLanded(error) && !code) {
        reportError('NoDeductionReasons.save', error);
        setNotice({ message: UNCONFIRMED });
        onRead(null);
      } else {
        setNotice({ message: messageOf(error) });
      }
    } finally {
      setBusy(false);
    }
  };

  const title = editing ? `Change “${editing.name}”` : 'Add a reason';
  return (
    <Modal
      open={open}
      onOpenChange={closeOn(onClose)}
      title={title}
      description="Change status offers the reason when a member is suspended under its code, with no payroll deduction."
      busy={busy}
      initialFocusRef={nameField}
      footer={(
        <>
          <ModalClose>Cancel</ModalClose>
          <Button variant="primary" onClick={save} loading={busy}>{editing ? 'Save the change' : 'Add the reason'}</Button>
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
      <div className="grid gap-4">
        <TextInput
          ref={nameField}
          label="Reason"
          required
          value={form.name}
          onChange={(event) => set('name', event.target.value)}
          maxLength={limits.nameLimit}
          error={errors.name || undefined}
          hint={`Up to ${limits.nameLimit} characters, as Change status will offer it.`}
          disabled={busy}
        />
        <SelectInput
          label="SASBO’s suspension code"
          required
          value={form.code}
          placeholder="Choose a code"
          options={codeOptions}
          loading={codes.loading}
          loadError={codes.error}
          onRetryLoad={codes.refetch}
          onChange={(value) => set('code', value)}
          error={errors.code || undefined}
          hint="The code a suspension carries when this reason is chosen."
          disabled={busy}
        />
        <TextInput
          label="Place on the list"
          kind="number"
          value={form.ordinal}
          onChange={(event) => set('ordinal', event.target.value)}
          maxLength={3}
          error={errors.ordinal || undefined}
          hint={editing ? `1 to ${PLACE_LIMIT}, first to last.` : `1 to ${PLACE_LIMIT}, first to last. Left empty, it goes last.`}
          disabled={busy}
        />
        <SelectInput
          label="Offered on Change status"
          value={form.offered}
          options={OFFERED}
          onChange={(value) => set('offered', value)}
          hint="A reason is never deleted, because changes of status name it: stop offering it instead."
          disabled={busy}
        />
      </div>
    </Modal>
  );
}

/** The route's page: the list, and -- for someone who may -- adding and changing its reasons. */
export default function NoDeductionReasons() {
  const allowed = useMayMaintain();
  const list = useReasons();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState(null);
  const noticeRef = useFocusOn(notice, notice?.tone === 'error');

  const { answer } = list;
  const rows = answer?.rows ?? [];
  const full = Boolean(answer) && rows.length >= answer.ceiling;
  const offered = rows.filter((row) => row.active).length;
  const provisional = rows.some((row) => row.provisional);
  const shut = !allowed;

  const close = () => {
    setEditing(null);
    setAdding(false);
  };
  const saved = (row, changed) => {
    close();
    const shown = answer ?? list.latest;
    if (shown) list.show({ ...shown, rows: withReason(shown.rows, row) });
    setNotice({
      tone: 'ok',
      message: changed
        ? `“${row.name}” is saved${row.active ? '' : ', and no longer offered'}.`
        : `“${row.name}” is added under code ${row.suspensionCode}${row.active ? ', and Change status offers it' : ''}.`,
    });
  };

  const columns = [
    {
      key: 'name',
      header: 'Reason',
      nowrap: false,
      cell: (row) => (
        <>
          {row.name}
          {row.provisional && <span className="block text-xs text-ink-muted">Provisional code</span>}
        </>
      ),
    },
    { key: 'code', header: 'SASBO’s code', nowrap: false, cell: (row) => codeLabel(row.suspensionCode, row.suspensionName) },
    { key: 'place', header: 'Place', cell: (row) => row.ordinal },
    { key: 'offered', header: 'Offered', cell: (row) => (row.active ? 'Offered' : 'Not offered') },
    { key: 'changed', header: 'Last changed', priority: 'secondary', nowrap: false, cell: changedLabel },
    {
      key: 'change',
      header: <span className="sr-only">Change</span>,
      cell: (row) => (
        <Button size="sm" variant="ghost" disabled={shut} aria-describedby={shut ? WHY_ID : undefined}
          aria-label={`Change “${row.name}”`} onClick={() => setEditing(row)}>
          <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
          Change
        </Button>
      ),
    },
  ];

  return (
    <Page>
      <PageTitle
        title="Reasons for no payroll deduction"
        subtitle="What Change status offers when a member is suspended with no payroll deduction, each reason under one of SASBO’s suspension codes."
      />
      <MaintainWhy id={WHY_ID} what="the reasons" />

      {notice && (
        <PageNotice ref={noticeRef} id="no-deduction-reasons-notice" tone={notice.tone} className="max-w-4xl"
          onDismiss={() => setNotice(null)}>
          {notice.message}
        </PageNotice>
      )}

      <div className="mt-5 flex max-w-4xl flex-wrap items-end justify-between gap-3">
        <div className="grid max-w-prose gap-1 text-sm text-ink-muted">
          {answer && (
            <p className="text-base text-ink" data-reasons={rows.length}>
              {`${formatInt(rows.length)} ${rows.length === 1 ? 'reason' : 'reasons'}, ${formatInt(offered)} offered on `
                + `Change status. The list holds at most ${formatInt(answer.ceiling)}.`}
            </p>
          )}
          {provisional && (
            <p>A provisional code was chosen for SASBO and stands until SASBO confirms it: saving the reason confirms it.</p>
          )}
          {full && <p id="no-deduction-reasons-full">The list is full: stop offering a reason rather than adding one.</p>}
        </div>
        <Button variant="primary" disabled={shut || full || !answer}
          aria-describedby={shut ? WHY_ID : full ? 'no-deduction-reasons-full' : undefined} onClick={() => setAdding(true)}>
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          Add a reason
        </Button>
      </div>

      <Sheet className="mt-4 max-w-4xl">
        <Table
          caption="Reasons for no payroll deduction"
          columns={columns}
          rows={rows}
          rowKey="id"
          loading={list.pending}
          error={list.failure}
          onRetry={list.reload}
          emptyTitle="No reason is on the list."
          emptyMessage={allowed ? 'Add one, and Change status offers it.' : undefined}
          dense
        />
      </Sheet>

      {list.latest && (
        <ReasonForm
          editing={editing}
          adding={adding}
          limits={list.latest}
          onClose={close}
          onSaved={saved}
          onRead={(fresh) => (fresh ? list.show(fresh) : list.reload())}
          onGone={(sentence) => {
            close();
            setNotice({ tone: 'error', message: `${sentence} The list is read again.` });
            list.reload();
          }}
        />
      )}
    </Page>
  );
}
