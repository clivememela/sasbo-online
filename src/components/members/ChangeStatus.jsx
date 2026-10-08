import { useRef, useState } from 'react';

import DialogNotice from '../common/DialogNotice';
import StatusChip from '../common/StatusChip';
import { Button, SelectInput, TextInput } from '../form';
import Modal, { ModalClose } from '../overlay/Modal';
import useAsyncOptions from '../../hooks/useAsyncOptions';
import { personName } from '../../lib/names';
import reportError from '../../lib/reportError';
import {
  DELETION_CODE_UNKNOWN, MEMBER_NOT_FOUND, MEMBER_STATUS_KIND, NO_DEDUCTION_REASON_REQUIRED,
  NO_DEDUCTION_REASON_UNKNOWN, STATUS_CHANGED_SINCE, STATUS_KIND, STATUS_REASON_MISMATCH, SUSPENSION_CODE_UNKNOWN,
  deletionCodeOptions, emptyReasonSentence, listProvenance, listRows, noDeductionReasonsUnder, reasonFor, statusKind,
  suspensionCodeOptions,
} from '../../config/monthEnd';
import { memberStatusService } from '../../services/memberStatusService';
import { writeMayHaveLanded } from '../../services/parseApiError';
import { getDeletionCodes, getNoDeductionReasons, getSuspensionCodes } from '../../services/referenceService';

/** The server keeps a note to this many characters and refuses one longer (03.1) -- so the field stops there. */
export const NOTE_LIMIT = 500;

const BLANK = {
  to: '', code: '', reason: '', noDeduction: '', note: '', notice: null, codeError: null, reasonError: null,
  noDeductionError: null, gone: false,
};

/** MEN-17's refusals, each said at the reason for no payroll deduction. */
const NO_DEDUCTION_REFUSALS = [NO_DEDUCTION_REASON_REQUIRED, NO_DEDUCTION_REASON_UNKNOWN, STATUS_REASON_MISMATCH];

/** Why a list has nothing to choose from when the SERVER gave no reason -- the route is not there, or not a list. */
const NOT_HERE = 'This server does not have this list yet.';
const UNREADABLE = 'This server’s answer could not be read.';

/** Said of a change whose answer never came -- a timeout, a lost connection, a 5xx -- once the member is read again. */
const UNCONFIRMED = 'The change could not be confirmed.';
const AGAIN = 'Asking again is safe — the same change asked twice is written once.';
/** A return in the month of the leaving it undoes (MEN-23): the membership is kept, and neither is counted. */
const UNDONE = 'Their leaving earlier this month is undone: they keep their membership, and neither the leaving nor '
  + 'this return counts in the month’s figures.';

/**
 * One of SASBO's code lists, asked for the first time the dialog needs it and kept while the record's page lives (MD69).
 *
 * FOUR STATES, and none of them is an empty dropdown: `loading`; ready -- the list's answer, its rows and where they were
 * read from; EMPTY -- no rows, with the sentence that says why: the server's own reason (ME-19), a 404 from a server
 * built before the route (MD58), or an answer that is not a list's (the suite's shared fixture answers every read with
 * `[]`, MV-36); and `error` -- a failure, said as one, with Try again (`refetch`), never as "none".
 */
function useCodeList(read, wanted) {
  // Latched during render (React's documented adjustment), never in an effect: once needed, asked for.
  const [asked, setAsked] = useState(false);
  if (wanted && !asked) setAsked(true);
  return useAsyncOptions(
    () => read().then(
      (answer) => [listRows(answer) ? answer : { rows: [], why: UNREADABLE }],
      (error) => {
        if (error?.status === 404) return [{ rows: [], why: NOT_HERE }];
        reportError('ChangeStatus.codes', error);
        throw error;
      },
    ),
    [],
    { enabled: asked },
  );
}

/**
 * *CHANGE STATUS* -- month end `03.3`, the member record's one way to move a status (`POST /api/members/{id}/status`).
 *
 * The new status, SASBO's code for it, a note. A status is judged by its KIND, never its spelling (03.2): into a leaving
 * status SASBO's deletion code, by its number (RC7); into *Suspended* its suspension code; any other is a reinstatement
 * and carries none.
 *
 * 🔑 THE REASON UNDER A CODE (04.5). SASBO keeps reasons under a code -- the reasons a member gave for resigning, under
 * 2 -- and its `resigned` report counts them. Where the chosen code has any, *The reason they gave* offers them: optional,
 * sent by its name as `reasonUnderCode` only when one is chosen, and named in what is said once the change is made. The
 * note stays the administrator's own words; nothing is written into it for them. A reason the server no longer keeps
 * under the code (`DELETION_CODE_UNKNOWN` naming what it `known`s) is said at the reason, and the list asked for again.
 *
 * 🔑 THE REASON FOR NO PAYROLL DEDUCTION (Stephne, MEN-17: "Can we have a dropdown sayin a reason for no payroll
 * deduction. Also have the opporenity to type a reason"). Where the suspension code chosen is one the reasons stand under
 * (11, 12 and 21 as seeded), *Reason for no payroll deduction* offers the active reasons under it, sent by id as
 * `noDeductionReasonId`; or the reason is typed in the note. One of the two is needed before the change is sent, and a
 * refusal of it (`NO_DEDUCTION_REASON_REQUIRED`, `_UNKNOWN`, `STATUS_REASON_MISMATCH`) is said at the reason, the list
 * read again. A debit order code (13 and the like) needs neither.
 *
 * `expectedStatus` is the status this screen shows, so a change made on a stale view is refused `STATUS_CHANGED_SINCE`
 * rather than written over somebody else's. WHAT IS SAID IS SAID AFTER THE MEMBER IS READ AGAIN (ME-3): the page's
 * `reread(id, status)` answers the member as they now stand -- `null` where that read failed, the record then showing
 * `status` when one is known -- and refreshes the record and its row with them.
 *
 *   done                     -- read again, then `onDone` says so, and the page closes the dialog;
 *   STATUS_CHANGED_SINCE     -- read again, the server's sentence said here, the choices kept;
 *   no answer (a timeout, a  -- read again BEFORE a word is said: already there is done; anything else is said as it
 *   lost connection, a 5xx)     is, and asking again is safe, because the same change asked twice is written once;
 *   a code no longer listed  -- the server's sentence at the code, and the list asked for again;
 *   the member gone, or any  -- the server's sentence (ME-13), nothing to send.
 *   other refusal
 *
 * While the write runs nothing closes the dialog (`busy`), and the member cannot be changed twice at once.
 *
 * @param {object}   member     the record as the screen shows it
 * @param {boolean}  open
 * @param {Function} onOpenChange
 * @param {(id: number, status?: string) => Promise<object|null>} reread  the record's own reload
 * @param {(sentence: string) => void} onDone  what happened, once the member has been read again
 */
export default function ChangeStatus({ member, open, onOpenChange, reread, onDone }) {
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  // A fresh form each time the dialog opens -- set during render, React's documented adjustment, never in an effect.
  const [opened, setOpened] = useState(open);
  if (open !== opened) {
    setOpened(open);
    if (open) setForm(BLANK);
  }
  const edit = (changes) => setForm((was) => ({ ...was, ...changes }));

  const kind = statusKind(form.to);
  const leaving = kind === STATUS_KIND.LEAVING;
  const suspending = kind === STATUS_KIND.SUSPENDED;
  const deletions = useCodeList(getDeletionCodes, open && leaving);
  const suspensions = useCodeList(getSuspensionCodes, open && suspending);
  const noDeductionList = useCodeList(getNoDeductionReasons, open && suspending);
  const list = leaving ? deletions : suspending ? suspensions : null;
  const answer = list && !list.loading && !list.error ? list.options[0] : null;
  const codes = !answer ? [] : leaving ? deletionCodeOptions(answer.rows) : suspensionCodeOptions(answer.rows);
  const chosen = codes.find((option) => String(option.code) === form.code);
  // The reasons SASBO keeps under the deletion code chosen -- none under most codes, and none for a suspension.
  const reasons = leaving ? chosen?.under ?? [] : [];
  // MEN-17: the active reasons for no payroll deduction under the suspension code chosen -- none under a debit order code.
  const noDeductionAnswer = noDeductionList.loading || noDeductionList.error ? null : noDeductionList.options[0];
  const noDeduction = suspending && chosen ? noDeductionReasonsUnder(noDeductionAnswer, chosen.code) : [];
  const offersNoDeduction = noDeduction.length > 0 || Boolean(suspending && chosen && noDeductionList.error);
  const chosenNoDeduction = noDeduction.find((option) => option.value === form.noDeduction);

  const who = personName(member) || 'This member';
  const why = form.gone ? null : !form.to ? 'Choose the new status.' : list && !chosen ? 'Choose SASBO’s code for it.'
    : suspending && noDeductionList.loading ? 'Reading the reasons for no payroll deduction.'
      : noDeduction.length > 0 && !chosenNoDeduction && !form.note.trim()
        ? 'Choose the reason for no payroll deduction, or type it in the note.' : null;

  const submit = async () => {
    const { to, code } = form;
    const note = form.note.trim();
    const reasonUnderCode = reasons.includes(form.reason) ? form.reason : '';
    // What was written is the server's to say: the reason is named as its answer names it, and not where it names none.
    // MEN-23 ("We would like to retain current membership as it happened in the same month"): a return that undid a
    // leaving not yet in any month taken (`undoes`, the leaving's id) is said, because neither is counted.
    const done = (status, already, reason, noDeductionReason, undoes) =>
      onDone(already ? `${who} was already ${status}. Nothing more was written.`
        : `${who} is now ${status}.${reason ? ` The reason they gave: ${reason}.` : ''}${noDeductionReason
          ? ` The reason for no payroll deduction: ${noDeductionReason}.` : ''}${undoes != null ? ` ${UNDONE}` : ''}`);
    setBusy(true);
    edit({ notice: null, codeError: null, reasonError: null, noDeductionError: null });
    try {
      const changed = await memberStatusService.changeStatus(member.id, {
        toStatus: to,
        expectedStatus: member.status,
        reason: reasonFor(to),
        ...(leaving && { deletionCode: Number(code) }),
        ...(leaving && reasonUnderCode && { reasonUnderCode }),
        ...(suspending && { suspensionCode: Number(code) }),
        ...(suspending && chosenNoDeduction && { noDeductionReasonId: Number(chosenNoDeduction.value) }),
        ...(note && { note }),
      });
      await reread(member.id, changed.status);
      done(changed.status, !changed.change, changed.change?.reasonUnderCode, changed.change?.noDeductionReason,
        changed.change?.undoes);
    } catch (error) {
      reportError('ChangeStatus.change', error);
      const refused = error?.body?.code;
      if (refused === DELETION_CODE_UNKNOWN && error.body.details && 'known' in error.body.details) {
        // The code stands; the reason under it is not one SASBO keeps (any more): said there, and the list read again.
        edit({ reason: '', reasonError: error.message });
        list?.refetch();
      } else if (suspending && offersNoDeduction && NO_DEDUCTION_REFUSALS.includes(refused)) {
        // MEN-17: said at the reason, in the server's words, the code kept -- and the reasons read again.
        edit({ noDeduction: '', noDeductionError: error.message });
        noDeductionList.refetch();
      } else if (refused === DELETION_CODE_UNKNOWN || refused === SUSPENSION_CODE_UNKNOWN) {
        edit({ code: '', reason: '', codeError: error.message });
        list?.refetch();
      } else if (refused === STATUS_CHANGED_SINCE || writeMayHaveLanded(error)) {
        const now = error?.body?.details?.currentStatus;
        const fresh = await reread(member.id, statusKind(now) ? now : undefined);
        if (fresh?.status === to) done(to);
        else {
          edit({
            notice: refused ? error.message
              : `${UNCONFIRMED} ${fresh ? `${who} is ${fresh.status} now.` : 'The member could not be read again either.'} ${AGAIN}`,
          });
        }
      } else {
        edit({ notice: error?.message, gone: refused === MEMBER_NOT_FOUND });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Change status"
      description={[personName(member), member?.membershipNumber].filter(Boolean).join(' · ') || undefined}
      size="sm"
      busy={busy}
      initialFocusRef={first}
      footer={(
        <>
          {why && <p id="change-status-why" className="mr-auto text-sm text-ink-muted">{why}</p>}
          <ModalClose>Cancel</ModalClose>
          <Button variant="primary" onClick={submit} loading={busy} disabled={Boolean(why) || form.gone}
            aria-describedby={why ? 'change-status-why' : undefined}>
            Change status
          </Button>
        </>
      )}
    >
      <DialogNotice notice={form.notice && { message: form.notice }} onDismiss={() => edit({ notice: null })} />
      <div className="space-y-4">
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          Now <StatusChip status={member?.status} />
          {form.to && (
            <>
              <span aria-hidden="true">→</span>
              <span className="sr-only">to become</span>
              <StatusChip status={form.to} />
            </>
          )}
        </p>
        <SelectInput
          ref={first}
          label="New status"
          required
          value={form.to}
          onChange={(to) => edit({
            to, code: '', reason: '', noDeduction: '', codeError: null, reasonError: null, noDeductionError: null,
          })}
          options={Object.keys(MEMBER_STATUS_KIND).filter((status) => status !== member?.status)}
          placeholder="Choose a status"
          disabled={busy || form.gone}
        />
        {list && (
          <SelectInput
            label={`SASBO’s ${leaving ? 'deletion' : 'suspension'} code`}
            required
            value={form.code}
            onChange={(code) => edit({
              code, reason: '', noDeduction: '', codeError: null, reasonError: null, noDeductionError: null,
            })}
            options={codes}
            optionValue="code"
            optionLabel="label"
            placeholder="Choose a code"
            loading={list.loading}
            loadError={list.error}
            onRetryLoad={list.refetch}
            emptyLabel={answer?.why ?? emptyReasonSentence(answer?.reason || 'EMPTY')}
            error={form.codeError || undefined}
            hint={listProvenance(answer) || undefined}
            disabled={busy}
          />
        )}
        {reasons.length > 0 && (
          <SelectInput
            label="The reason they gave"
            value={form.reason}
            onChange={(reason) => edit({ reason, reasonError: null })}
            options={reasons}
            placeholder="No reason given"
            error={form.reasonError || undefined}
            hint={`Optional — a reason SASBO keeps under ${chosen.label}.`}
            disabled={busy}
          />
        )}
        {offersNoDeduction && (
          <SelectInput
            label="Reason for no payroll deduction"
            value={form.noDeduction}
            onChange={(choice) => edit({ noDeduction: choice, noDeductionError: null })}
            options={[{ value: '', label: 'None chosen: typed in the note' }, ...noDeduction]}
            loadError={noDeductionList.error}
            onRetryLoad={noDeductionList.refetch}
            error={form.noDeductionError || undefined}
            hint={`Choose one, or type the reason in the note. The reasons kept under ${chosen?.label}.`}
            disabled={busy}
          />
        )}
        <TextInput
          label="Note"
          multiline
          value={form.note}
          onChange={(event) => edit({ note: event.target.value })}
          maxLength={NOTE_LIMIT}
          hint={`${form.note.length} of ${NOTE_LIMIT} characters`}
          disabled={busy}
        />
      </div>
    </Modal>
  );
}
