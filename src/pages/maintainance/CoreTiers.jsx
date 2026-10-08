import { useEffect, useRef, useState } from 'react';
import { Layers } from 'lucide-react';

import Criteria, { CRITERION, CRITERION_WIDE } from '../../components/common/Criteria.jsx';
import DialogNotice, { PageNotice } from '../../components/common/DialogNotice.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import Button from '../../components/form/Button.jsx';
import SelectInput from '../../components/form/SelectInput.jsx';
import TextInput from '../../components/form/TextInput.jsx';
import Modal, { ModalClose, closeOn } from '../../components/overlay/Modal.jsx';
import Table from '../../components/table/Table.jsx';
import {
  CORE_TIER_UNKNOWN, TABLE_CODE_UNKNOWN, emptyReasonSentence, listProvenance, listRows,
} from '../../config/monthEnd.js';
import useFocusOn from '../../hooks/useFocusOn.js';
import { formatInt } from '../../lib/format.js';
import reportError from '../../lib/reportError.js';
import { messageOf, writeMayHaveLanded } from '../../services/parseApiError.js';
import { getCoreTiers, getTableCodes, setCoreTier } from '../../services/referenceService.js';
import { failureOf } from '../admin/monthEndRules.js';
import { MaintainWhy, useMayMaintain } from './ReferenceParts.jsx';
import {
  OTHER, tableCodeMatches, tierChoices, tierCounts, tierName, tierValue, tiersOf,
} from './referenceRules.js';

/**
 * THE CORE TIERS -- Stephne, MEN-31: "Decisions are made by Senior Secretariat. | Core A - Absa, FNB, Nedbank, Standard,
 * Capitec, oldmutual. | Core B - … | Core C - … | All other are captured under individual institutions"
 * (`contracts/monthend-rules-api.md` R7). Every table code stands in Core A, B or C, or under "All other institutions";
 * the figures and the statistics group by it (`by=tier`), and a taken month keeps the tier each workplace stood in.
 *
 *   read     SASBO's table codes with the tier of each, and the tiers -- by anyone.
 *   held     setting a tier needs REFERENCE_MAINTAIN; anyone else sees the controls shut, and why.
 *   each     one table code at a time, in a dialog: Core A, B or C, or all other institutions (sent as `null`).
 *   words    a table code gone and a tier refused are the server's sentences; a change that could not be confirmed
 *            reads the list again before anything more is said of it.
 */

const WHY_ID = 'core-tiers-why';
const NOT_AVAILABLE = 'The core tiers are not available from this server yet.';
const UNCONFIRMED = 'The change could not be confirmed. The list is read again: look at it before trying again.';
const EVERY = 'every';

/**
 * The tiers and the table codes, read together, and again whenever a person asks. `latest` is the last pair read, kept
 * while they are read again: an open dialog keeps its tiers, and stays open, while the list behind it is being read.
 */
function useTiers() {
  const [attempt, setAttempt] = useState(0);
  const [read, setRead] = useState({ attempt: -1 });
  const [latest, setLatest] = useState(null);
  useEffect(() => {
    let current = true;
    Promise.all([getCoreTiers(), getTableCodes()])
      .then(([tierAnswer, codeAnswer]) => {
        const tiers = tiersOf(tierAnswer);
        const rows = listRows(codeAnswer);
        const answer = tiers && rows ? { tiers, codes: codeAnswer, rows } : null;
        if (!current) return;
        setRead({ attempt, answer, failure: answer ? null : failureOf(null, NOT_AVAILABLE) });
        if (answer) setLatest(answer);
      })
      .catch((error) => {
        reportError('CoreTiers.read', error);
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
    /** A table code's new tier, from the server's answer, put in its row. */
    place: (code, coreTier) => setRead((was) => (was.answer ? {
      ...was,
      answer: { ...was.answer, rows: was.answer.rows.map((row) => (row.code === code ? { ...row, coreTier } : row)) },
    } : was)),
  };
}

/** The dialog that sets one table code's tier. */
function TierForm({ row, tiers, onClose, onSet, onGone, onUnconfirmed }) {
  const [tier, setTier] = useState(row ? tierValue(row) : OTHER);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const tierField = useRef(null);

  // A new choice each time it opens, on the table code it opens on.
  const [openedFor, setOpenedFor] = useState(null);
  if ((row?.code ?? null) !== openedFor) {
    setOpenedFor(row?.code ?? null);
    setTier(row ? tierValue(row) : OTHER);
    setNotice(null);
  }

  const save = async () => {
    setNotice(null);
    setBusy(true);
    try {
      const answer = await setCoreTier(row.code, tier === OTHER ? null : tier);
      onSet(row, answer?.coreTier ?? (tier === OTHER ? null : tier));
    } catch (error) {
      const code = error?.body?.code;
      if (code === TABLE_CODE_UNKNOWN) {
        onGone(messageOf(error));
      } else if (code === CORE_TIER_UNKNOWN) {
        setNotice({ message: messageOf(error) });
      } else if (writeMayHaveLanded(error) && !code) {
        reportError('CoreTiers.save', error);
        setNotice({ message: UNCONFIRMED });
        onUnconfirmed();
      } else {
        setNotice({ message: messageOf(error) });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={closeOn(onClose)}
      title={row ? `Table code ${row.code}` : 'Table code'}
      description={row ? [row.name, row.employer && `of ${row.employer}`].filter(Boolean).join(', ') : undefined}
      size="sm"
      busy={busy}
      initialFocusRef={tierField}
      footer={(
        <>
          <ModalClose>Cancel</ModalClose>
          <Button variant="primary" onClick={save} loading={busy} disabled={row ? tier === tierValue(row) : true}>
            Save the tier
          </Button>
        </>
      )}
    >
      <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
      <SelectInput
        ref={tierField}
        label="Tier"
        value={tier}
        options={tierChoices(tiers)}
        onChange={(value) => setTier(value)}
        hint="Every workplace under this table code is counted in it, from now on. A month already taken keeps the tier it was taken with."
        disabled={busy}
      />
    </Modal>
  );
}

/** The route's page: the tiers and their table codes, and -- for someone who may -- setting a table code's tier. */
export default function CoreTiers() {
  const allowed = useMayMaintain();
  const list = useTiers();
  const [search, setSearch] = useState('');
  const [showing, setShowing] = useState(EVERY);
  const [setting, setSetting] = useState(null);
  const [notice, setNotice] = useState(null);
  const noticeRef = useFocusOn(notice, notice?.tone === 'error');

  const { answer } = list;
  const rows = answer?.rows ?? [];
  const shown = rows.filter((row) => (showing === EVERY || tierValue(row) === showing) && tableCodeMatches(row, search));
  const provisional = answer?.tiers.tiers.some((tier) => tier.provisional);
  const shut = !allowed;
  const narrowed = Boolean(search.trim()) || showing !== EVERY;

  const columns = [
    { key: 'code', header: 'Table code', cell: (row) => <span className="tabular-nums">{row.code}</span> },
    { key: 'name', header: 'Name', nowrap: false, cell: (row) => row.name },
    { key: 'employer', header: 'Employer', priority: 'secondary', nowrap: false, cell: (row) => row.employer ?? 'None on record' },
    { key: 'tier', header: 'Tier', nowrap: false, cell: (row) => tierName(answer.tiers, row) },
    {
      key: 'set',
      header: <span className="sr-only">Change the tier</span>,
      cell: (row) => (
        <Button size="sm" variant="ghost" disabled={shut} aria-describedby={shut ? WHY_ID : undefined}
          aria-label={`Change the tier of table code ${row.code}`} onClick={() => setSetting(row)}>
          <Layers size={14} strokeWidth={1.75} aria-hidden="true" />
          Change the tier
        </Button>
      ),
    },
  ];

  return (
    <Page>
      <PageTitle
        title="Core tiers"
        subtitle="Which of SASBO’s table codes stand in Core A, B and C. Every other table code is under “All other institutions”."
      />
      <MaintainWhy id={WHY_ID} what="the tiers" />

      {notice && (
        <PageNotice ref={noticeRef} id="core-tiers-notice" tone={notice.tone} className="max-w-5xl"
          onDismiss={() => setNotice(null)}>
          {notice.message}
        </PageNotice>
      )}

      {answer && (
        <div className="mt-5 grid max-w-prose gap-1 text-sm text-ink-muted">
          <p className="text-base text-ink" data-tier-counts="">
            {tierCounts(answer.tiers, rows).map((tier) => `${tier.label}: ${formatInt(tier.count)}`).join(' · ')}
          </p>
          <p>The Senior Secretariat decides each table code’s tier.</p>
          {provisional && (
            <p>The tiers shown are provisional, from SASBO’s Core List by table code, until the Senior Secretariat sets them.</p>
          )}
        </div>
      )}

      <Criteria className="mt-5 max-w-5xl" label="Which table codes">
        <TextInput
          className={CRITERION_WIDE}
          label="Search"
          kind="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="A table code, a name or an employer"
        />
        <SelectInput
          className={CRITERION}
          label="Tier"
          value={showing}
          options={[{ value: EVERY, label: 'Every tier' }, ...(answer ? tierChoices(answer.tiers) : [])]}
          onChange={(value) => setShowing(value)}
        />
      </Criteria>

      <Sheet className="mt-4 max-w-5xl">
        <Table
          caption="SASBO’s table codes and their tiers"
          columns={columns}
          rows={shown}
          rowKey="code"
          loading={list.pending}
          error={list.failure}
          onRetry={list.reload}
          emptyTitle={narrowed ? 'No table code matches.' : 'No table code is on record here.'}
          emptyMessage={narrowed ? 'Try another search or tier.' : emptyReasonSentence(answer?.codes?.reason) || undefined}
          dense
        />
      </Sheet>
      {answer?.codes?.printedOn && (
        <p className="mt-3 max-w-5xl text-right text-xs text-ink-muted">{listProvenance(answer.codes)}</p>
      )}

      {list.latest && (
        <TierForm
          row={setting}
          tiers={list.latest.tiers}
          onClose={() => setSetting(null)}
          onSet={(row, coreTier) => {
            setSetting(null);
            list.place(row.code, coreTier);
            setNotice({ tone: 'ok', message: `Table code ${row.code} is now under ${tierName(list.latest.tiers, { coreTier })}.` });
          }}
          onGone={(sentence) => {
            setSetting(null);
            setNotice({ tone: 'error', message: `${sentence} The list is read again.` });
            list.reload();
          }}
          onUnconfirmed={list.reload}
        />
      )}
    </Page>
  );
}
