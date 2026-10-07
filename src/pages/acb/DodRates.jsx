import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sheet from '../../components/common/Sheet.jsx';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import Table from '../../components/table/Table.jsx';
import { Button, SelectInput, TextInput } from '../../components/form';
import reportError from '../../lib/reportError.js';
import { formatZar } from '../../lib/format.js';
import { acbRunService } from '../../services/acbRunService.js';
import { dodService } from '../../services/dodService.js';
import { monthLabel } from './acbRunRules.js';
import { readFailure } from './dodRules.js';
import { StepDialog } from './DodCalendar.jsx';

/** The server keeps a rate's source to this many characters (dod-api §7.3). */
const SOURCE_LIMIT = 255;

/** The first days of the next fifteen months: a new rate starts on the first of a month still to come (D25). */
const futureMonths = (today = new Date()) => Array.from({ length: 15 }, (_, i) => {
  const date = new Date(today.getFullYear(), today.getMonth() + 1 + i, 1);
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return { value: `${month}-01`, label: monthLabel(month) };
});

/**
 * The flat debit order rate, dated (Q43): every rate on record, and a new one added from the first of a month still to
 * come -- rows are added, never edited (D25), and a month a live run has already charged is refused. SASBO tells the
 * banks each November (the subscription-increase letter); the rate is captured in December for January.
 */
export default function DodRates() {
  const months = useMemo(() => futureMonths(), []);
  const [rates, setRates] = useState({ state: 'loading', list: [], error: null });
  const [form, setForm] = useState({ effectiveFrom: months[0].value, amount: '', source: '' });
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState(null);
  const left = useRef(false);
  useEffect(() => () => { left.current = true; }, []);

  const load = useCallback(() => {
    acbRunService.rates()
      .then((data) => { if (!left.current) setRates({ state: 'ready', list: Array.isArray(data?.rates) ? data.rates : [], error: null }); })
      .catch((err) => { reportError('DodRates.load', err); if (!left.current) setRates({ state: 'error', list: [], error: err }); });
  }, []);
  useEffect(() => { load(); }, [load]);
  const reload = () => { setRates((now) => ({ ...now, state: 'loading' })); load(); };

  const amount = form.amount.trim().replace(',', '.');
  const source = form.source.trim();
  const why = !/^\d{1,4}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 ? 'Type the amount in rand, for example 185.00.'
    : !source ? 'Say where the rate comes from.'
      : source.length > SOURCE_LIMIT ? `Keep the source to ${SOURCE_LIMIT} characters.` : null;
  const from = monthLabel(form.effectiveFrom.slice(0, 7));

  const columns = [
    { key: 'effectiveFrom', header: 'From', priority: 'essential', cell: (r) => monthLabel(r.effectiveFrom.slice(0, 7)) },
    { key: 'amount', header: 'A member pays', priority: 'essential', cell: (r) => formatZar(r.amount) },
    { key: 'source', header: 'Source', priority: 'secondary', nowrap: false,
      cell: (r) => `${r.source ?? '—'}${r.provisional ? ' · provisional' : ''}` },
  ];

  return (
    <Sheet className="mt-6" aria-labelledby="dod-rates-heading">
      <div className="border-b border-line px-6 py-4">
        <h2 id="dod-rates-heading" className="text-base font-semibold text-ink">Subscription rates</h2>
        <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
          What each debit order member pays, from the month on which it starts. A new rate starts on the first of a month
          still to come; a rate on record is never changed.
        </p>
      </div>
      {notice && <div className="px-6 pt-4"><DialogNotice notice={notice} onDismiss={() => setNotice(null)} /></div>}
      <Table
        caption="Subscription rates"
        columns={columns}
        rows={rates.list}
        rowKey="effectiveFrom"
        loading={rates.state === 'loading'}
        error={rates.state === 'error' ? readFailure(rates.error, 'We could not load the rates.') : null}
        onRetry={reload}
        emptyTitle="No rate on record"
        emptyMessage="No month can be prepared until a rate is in force."
        dense
      />
      <div className="flex flex-wrap items-end gap-3 border-t border-line px-6 py-4">
        <SelectInput className="w-44" label="From" value={form.effectiveFrom} options={months}
          onChange={(value) => setForm((now) => ({ ...now, effectiveFrom: value }))} />
        <TextInput className="w-36" label="Amount (R)" kind="money" value={form.amount}
          onChange={(e) => setForm((now) => ({ ...now, amount: e.target.value }))} />
        <TextInput className="min-w-60 flex-1" label="Source" value={form.source}
          onChange={(e) => setForm((now) => ({ ...now, source: e.target.value }))} placeholder="For example, the letter to the banks of 26 November" />
        <Button variant="primary" disabled={Boolean(why)} aria-describedby={why ? 'dod-rate-why' : undefined}
          onClick={() => setConfirming(true)}>
          Add the rate
        </Button>
        {why && <p id="dod-rate-why" className="basis-full text-sm text-ink-muted">{why}</p>}
      </div>
      {confirming && (
        <StepDialog
          title={`Charge ${formatZar(Number(amount))} from ${from}?`}
          description={`Every run prepared for ${from} or later charges it. It cannot be changed once added; a later rate can follow it.`}
          confirmLabel="Add the rate" what="The rate"
          send={() => dodService.addRate(form.effectiveFrom, Number(amount), source)}
          onClose={(changed) => { setConfirming(false); if (changed) reload(); }}
          onDone={() => {
            setConfirming(false);
            setForm((now) => ({ ...now, amount: '', source: '' }));
            setNotice({ tone: 'ok', message: `${formatZar(Number(amount))} a member is charged from ${from}.` });
            reload();
          }}
        />
      )}
    </Sheet>
  );
}
