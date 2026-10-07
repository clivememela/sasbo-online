import { useCallback, useEffect, useRef, useState } from 'react';
import Sheet from '../../components/common/Sheet.jsx';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import Table from '../../components/table/Table.jsx';
import Modal, { ModalClose, closeOn } from '../../components/overlay/Modal.jsx';
import { Button, DateField, SelectInput, TextInput } from '../../components/form';
import reportError from '../../lib/reportError.js';
import { formatDateLong, parseDate, weekdayOf } from '../../lib/format.js';
import { acbRunService } from '../../services/acbRunService.js';
import { dodService } from '../../services/dodService.js';
import { DAY_KIND_LABEL, readFailure, writeOutcome } from './dodRules.js';

/** The server keeps a day's name to this many characters (dod-api §7.2). */
const NAME_LIMIT = 100;

const KIND_OPTIONS = Object.entries(DAY_KIND_LABEL).map(([value, label]) => ({ value, label }));

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** `Fri 23 Oct 2026` -- the weekday says at a glance whether a debit day could fall on it. */
const dayAndDate = (iso) => {
  const date = parseDate(iso);
  return date ? `${WEEKDAYS[weekdayOf(date)]} ${formatDateLong(iso)}` : formatDateLong(iso);
};

/**
 * The non-working days (Stephne, DOD-15, DOD-17, DOD-18): the Act's public holidays and any day the bank says it is
 * closed -- a list WE keep, as she asked. A debit day on one moves to the next working day in its month, or back where
 * that would leave the month. Whether a bank closure moves the debits is SASBO's open choice (both boxes ticked,
 * Friday item 14): it does by default, and the switch here turns it off. A year at a time.
 */
export default function DodCalendar() {
  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => ({ value: String(y), label: String(y) }));
  const [year, setYear] = useState(String(thisYear));
  const [calendar, setCalendar] = useState({ state: 'loading', data: null, error: null });
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);
  const left = useRef(false);
  useEffect(() => () => { left.current = true; }, []);

  const ticket = useRef(0);
  const load = useCallback((which) => {
    const mine = ++ticket.current;
    acbRunService.holidayCalendar(Number(which))
      .then((data) => { if (!left.current && mine === ticket.current) setCalendar({ state: 'ready', data, error: null }); })
      .catch((err) => {
        reportError('DodCalendar.load', err);
        if (!left.current && mine === ticket.current) setCalendar({ state: 'error', data: null, error: err });
      });
  }, []);
  useEffect(() => { load(year); }, [load, year]);
  const reload = () => { setCalendar((now) => ({ ...now, state: 'loading' })); load(year); };

  const data = calendar.data && !Array.isArray(calendar.data) ? calendar.data : null;
  const days = Array.isArray(data?.holidays) ? data.holidays : [];
  const columns = [
    { key: 'date', header: 'Date', priority: 'essential', cell: (d) => dayAndDate(d.date) },
    { key: 'name', header: 'Name', priority: 'essential', cell: (d) => d.name },
    { key: 'kind', header: 'Kind', priority: 'secondary', cell: (d) => DAY_KIND_LABEL[d.kind] ?? DAY_KIND_LABEL.PUBLIC_HOLIDAY },
    { key: 'source', header: 'From', priority: 'detail', cell: (d) => (d.source === 'ADDED' ? 'Added by us' : 'The Public Holidays Act') },
    {
      key: 'remove', header: 'Remove', priority: 'essential',
      cell: (d) => (d.source === 'ADDED' ? (
        <Button variant="ghost" onClick={() => setDialog({ remove: d })} aria-label={`Remove ${formatDateLong(d.date)}, ${d.name}`}>Remove</Button>
      ) : null),
    },
  ];

  const done = (message) => {
    setDialog(null);
    setNotice({ tone: 'ok', message });
    reload();
  };

  return (
    <Sheet className="mt-6" aria-labelledby="dod-days-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-6 py-4">
        <div className="min-w-0">
          <h2 id="dod-days-heading" className="text-base font-semibold text-ink">Non-working days</h2>
          <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
            Public holidays, and any day the bank is closed. A debit day on one moves to the next working day in its
            month, or back where that would leave the month.
            {data?.knownUntil && ` The list is complete to ${formatDateLong(data.knownUntil)}; each new year’s public holidays are added for SASBO.`}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SelectInput className="w-32" label="Year" value={year} onChange={(value) => setYear(value)} options={years} />
          <Button onClick={() => setDialog({ add: true })}>Add a day</Button>
        </div>
      </div>
      {data && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-3 text-sm text-ink">
          <span>
            Bank closures {data.bankClosuresCount ? 'move' : 'do not move'} the debits on them.
            <span className="text-ink-muted"> SASBO is still to confirm which it should be; until then they do.</span>
          </span>
          <Button size="sm" onClick={() => setDialog({ toggle: !data.bankClosuresCount })}>
            {data.bankClosuresCount ? 'Stop counting bank closures' : 'Count bank closures'}
          </Button>
        </div>
      )}
      {notice && <div className="px-6 pt-4"><DialogNotice notice={notice} onDismiss={() => setNotice(null)} /></div>}
      <Table
        caption={`Non-working days in ${year}`}
        columns={columns}
        rows={days}
        rowKey="date"
        loading={calendar.state === 'loading'}
        error={calendar.state === 'error' ? readFailure(calendar.error, 'We could not load the non-working days.') : null}
        onRetry={reload}
        emptyTitle={`No non-working days on record for ${year}`}
        emptyMessage="That year's public holidays are not yet in the list: no month in it can be prepared until they are."
        dense
      />
      {dialog?.add && <AddDayDialog year={year} onClose={(changed) => { setDialog(null); if (changed) reload(); }}
        onAdded={(day) => done(`${formatDateLong(day.date)} is a non-working day: ${day.name}.`)} />}
      {dialog?.remove && (
        <StepDialog
          title={`Remove ${formatDateLong(dialog.remove.date)}?`}
          description={`${dialog.remove.name} stops being a non-working day, so a debit day on it is no longer moved. Runs already prepared keep their dates.`}
          confirmLabel="Remove the day" what="Removing the day" destructive
          send={() => dodService.removeDay(dialog.remove.date)}
          onClose={(changed) => { setDialog(null); if (changed) reload(); }}
          onDone={() => done(`${formatDateLong(dialog.remove.date)} is no longer a non-working day.`)}
        />
      )}
      {dialog && 'toggle' in dialog && (
        <StepDialog
          title={dialog.toggle ? 'Count bank closures?' : 'Stop counting bank closures?'}
          description={dialog.toggle
            ? 'A debit day on a day the bank is closed then moves, as one on a public holiday does. Runs already prepared keep their dates.'
            : 'Only public holidays then move a debit day; bank closures stay on the list. Runs already prepared keep their dates.'}
          confirmLabel={dialog.toggle ? 'Count them' : 'Stop counting them'} what="The change"
          send={() => dodService.calendarSettings(dialog.toggle)}
          onClose={(changed) => { setDialog(null); if (changed) reload(); }}
          onDone={() => done(dialog.toggle ? 'Bank closures now move the debits on them.' : 'Bank closures no longer move the debits on them.')}
        />
      )}
    </Sheet>
  );
}

function AddDayDialog({ year, onClose, onAdded }) {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState('BANK_CLOSED');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [settled, setSettled] = useState(false);
  const trimmed = name.trim();
  const why = !date ? 'Choose the date first.' : !trimmed ? 'Name the day.'
    : trimmed.length > NAME_LIMIT ? `Keep the name to ${NAME_LIMIT} characters.` : null;

  const add = async () => {
    if (why || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      onAdded(await dodService.addDay(date, trimmed, kind));
    } catch (err) {
      reportError('DodCalendar.add', err);
      setNotice({ message: writeOutcome(err, 'The day').message });
      setSettled(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onOpenChange={closeOn(() => onClose(settled))} title="Add a non-working day"
      description={`A day the bank is closed, or a public holiday the list does not have. The list now shows ${year}.`}
      size="md" busy={busy}
      footer={settled ? <ModalClose>Close</ModalClose> : (
        <>
          {why && <p id="dod-day-why" className="mr-auto text-sm text-ink-muted">{why}</p>}
          <ModalClose>Cancel</ModalClose>
          <Button variant="primary" loading={busy} disabled={Boolean(why)} onClick={add} aria-describedby={why ? 'dod-day-why' : undefined}>
            Add the day
          </Button>
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
      <div className="grid gap-4">
        <DateField label="Date" name="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={busy || settled} />
        <TextInput label="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy || settled}
          hint={`For example, “Bank closed for its systems upgrade”. At most ${NAME_LIMIT} characters.`} />
        <SelectInput label="Kind" value={kind} onChange={(value) => setKind(value)} options={KIND_OPTIONS} disabled={busy || settled} />
      </div>
    </Modal>
  );
}

/** One confirmed step with nothing to fill in: it asks, runs once, says a refusal inside itself, and never repeats. */
export function StepDialog({ title, description, confirmLabel, what, destructive = false, send, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [settled, setSettled] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      onDone(await send());
    } catch (err) {
      reportError('DodSettings.step', err);
      setNotice({ message: writeOutcome(err, what).message });
      setSettled(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onOpenChange={closeOn(() => onClose(settled))} title={title} description={description} size="sm" busy={busy}
      footer={settled ? <ModalClose>Close</ModalClose> : (
        <>
          <ModalClose variant="ghost">Not now</ModalClose>
          <Button variant={destructive ? 'danger' : 'primary'} loading={busy} onClick={run}>{confirmLabel}</Button>
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
    </Modal>
  );
}
