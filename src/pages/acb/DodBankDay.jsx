import { useCallback, useEffect, useRef, useState } from 'react';
import Sheet from '../../components/common/Sheet.jsx';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import { Button, SelectInput } from '../../components/form';
import reportError from '../../lib/reportError.js';
import { formatInt } from '../../lib/format.js';
import { dodService } from '../../services/dodService.js';
import { RUN_STATUS_LABEL, monthLabel, ordinal } from './acbRunRules.js';
import { DEBIT_DAY_OPTIONS, DOD_REFUSAL, readFailure, refusalCode } from './dodRules.js';
import { StepDialog } from './DodCalendar.jsx';

/** "12 on the 20th, 32 on the 25th and 1 with no day" -- a bank's members by the day each is on now. */
const byDay = (counts) => {
  const parts = Object.entries(counts ?? {})
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => (a === 'none') - (b === 'none') || Number(a) - Number(b))
    .map(([day, count]) => `${formatInt(count)} ${day === 'none' ? 'with no day' : `on the ${ordinal(day)}`}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0] ?? '';
};

/**
 * Moving a bank's members to a new debit day in one step (Stephne, DOD-19): choose the bank and the day, see what would
 * move -- nothing changes yet -- then confirm. EVERY debit-order member of the bank moves, whatever day each is on now
 * (dod-api §7.4), and the bank's own day with them; a run already prepared keeps its days, and the next one uses the
 * new day. The move carries the count the preview showed, and is refused if the bank's members changed since.
 */
export default function DodBankDay() {
  const [banks, setBanks] = useState({ state: 'loading', list: [], error: null });
  const [bankId, setBankId] = useState('');
  const [day, setDay] = useState('');
  const [preview, setPreview] = useState({ state: 'idle', data: null, error: null });
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState(null);
  const left = useRef(false);
  useEffect(() => () => { left.current = true; }, []);

  const load = useCallback(() => {
    dodService.banks()
      .then((data) => { if (!left.current) setBanks({ state: 'ready', list: Array.isArray(data?.banks) ? data.banks : [], error: null }); })
      .catch((err) => { reportError('DodBankDay.banks', err); if (!left.current) setBanks({ state: 'error', list: [], error: err }); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const choose = (setter) => (value) => {
    setter(value);
    setPreview({ state: 'idle', data: null, error: null });
  };

  const ask = async () => {
    setNotice(null);
    setPreview({ state: 'loading', data: null, error: null });
    try {
      const data = await dodService.previewMove(bankId, day);
      if (!left.current) setPreview({ state: 'ready', data, error: null });
    } catch (err) {
      reportError('DodBankDay.preview', err);
      if (!left.current) setPreview({ state: 'error', data: null, error: err });
    }
  };

  const shown = preview.data;
  const options = banks.list.map((b) => ({
    value: String(b.bankId), label: `${b.name} (${formatInt(b.debitOrderMembers)} debit-order members)`,
  }));

  return (
    <Sheet className="mt-6" aria-labelledby="dod-move-heading">
      <div className="border-b border-line px-6 py-4">
        <h2 id="dod-move-heading" className="text-base font-semibold text-ink">Move a bank’s members to a new debit day</h2>
        <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
          When a bank changes its debit day, every debit-order member of that bank moves to the new day in one step. See
          what would move first: nothing changes until you confirm.
        </p>
      </div>
      {notice && <div className="px-6 pt-4"><DialogNotice notice={notice} onDismiss={() => setNotice(null)} /></div>}
      <div className="flex flex-wrap items-end gap-3 px-6 py-4">
        <SelectInput className="min-w-64 flex-1" label="Bank" value={bankId} onChange={choose(setBankId)} options={options}
          placeholder="Choose a bank" loading={banks.state === 'loading'}
          loadError={banks.state === 'error' ? readFailure(banks.error, 'The banks could not be loaded.') : null}
          onRetryLoad={() => { setBanks({ state: 'loading', list: [], error: null }); load(); }} />
        <SelectInput className="w-36" label="New debit day" value={day} onChange={choose(setDay)} options={DEBIT_DAY_OPTIONS} placeholder="Choose" />
        <Button onClick={ask} disabled={!bankId || !day} loading={preview.state === 'loading'}>See what would move</Button>
      </div>
      {preview.state === 'error' && (
        <p role="alert" className="px-6 pb-4 text-sm text-status-suspended">
          {readFailure(preview.error, 'What would move could not be worked out. Try again.')}
        </p>
      )}
      {shown && (
        <div className="grid gap-2 border-t border-line px-6 py-4 text-sm text-ink" data-testid="dod-move-preview">
          {shown.toMove > 0 ? (
            <p>
              {formatInt(shown.toMove)} member{shown.toMove === 1 ? '' : 's'} of {shown.bankName} would move to the{' '}
              {ordinal(shown.newDay)}: {byDay(shown.byCurrentDay)}.
              {shown.alreadyOnDay > 0 && ` ${formatInt(shown.alreadyOnDay)} on the ${ordinal(shown.newDay)} already stay as they are.`}
            </p>
          ) : (
            <p>Every debit-order member of {shown.bankName} is on the {ordinal(shown.newDay)} already: nobody would move.</p>
          )}
          {(shown.liveRuns ?? []).map((run) => (
            <p key={run.runId} className="text-ink-muted">
              The {monthLabel(run.actionMonth)} run is {String(RUN_STATUS_LABEL[run.status] ?? run.status).toLowerCase()} and
              keeps the days it was prepared with; the next run prepared uses the new day.
            </p>
          ))}
          {shown.toMove > 0 && (
            <div>
              <Button variant="primary" onClick={() => setConfirming(true)}>
                Move {formatInt(shown.toMove)} member{shown.toMove === 1 ? '' : 's'}
              </Button>
            </div>
          )}
        </div>
      )}
      {confirming && shown && (
        <StepDialog
          title={`Move ${formatInt(shown.toMove)} members of ${shown.bankName} to the ${ordinal(shown.newDay)}?`}
          description="Each member’s record notes the change of debit day, and the bank’s own day moves with them."
          confirmLabel="Move them" what="The move"
          send={async () => {
            try {
              return await dodService.move(shown.bankId, shown.newDay, shown.toMove);
            } catch (err) {
              // The bank's members changed since the preview: say how, and ask for a fresh look rather than a retry.
              if (refusalCode(err) !== DOD_REFUSAL.MOVE_COUNT_CHANGED) throw err;
              const { expected, actual } = err.body.details ?? {};
              throw Object.assign(new Error(`the bank’s members changed since the preview: ${expected ?? shown.toMove} were to move, `
                + `${actual ?? 'a different number'} would now. Close this and look again.`), { kind: 'http', status: 409 });
            }
          }}
          onClose={(changed) => {
            setConfirming(false);
            if (changed) { setPreview({ state: 'idle', data: null, error: null }); load(); }
          }}
          onDone={(answer) => {
            setConfirming(false);
            setPreview({ state: 'idle', data: null, error: null });
            setNotice({ tone: 'ok', message: `${formatInt(answer?.moved ?? shown.toMove)} members of ${shown.bankName} now have the ${ordinal(shown.newDay)} as their debit day.` });
            load();
          }}
        />
      )}
    </Sheet>
  );
}
