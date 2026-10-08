import { useRef, useState } from 'react';
import { Download, Mail } from 'lucide-react';

import RequirePermission from '../../auth/RequirePermission.jsx';
import { PERMISSIONS } from '../../auth/permissions.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import Button from '../../components/form/Button.jsx';
import { formatInt } from '../../lib/format.js';
import reportError from '../../lib/reportError.js';
import saveFile from '../../lib/saveFile.js';
import {
  downloadRegionPack, emailRegionPack, emailRegionPacks, getRegionPacks, produceRegionPack,
} from '../../services/monthEndSendService.js';
import { messageOf, writeMayHaveLanded } from '../../services/parseApiError.js';
import { instantLabel } from './monthEndRules.js';
import {
  DELIVERY, DELIVERY_CHOICES, FORMATS, MAIL_OFF, PACKS_UNAVAILABLE, SEND_REFUSAL, areasSaid, defaultDelivery, downloads,
  emails, formatLabel, formatsSaid, howSaid, outcomeSaid, packSaid, regionPacksOf, takeSaid, uncoveredSaid, whyNoEmail,
} from './monthEndSendRules.js';
import { ActionNotice, NoMonthTaken, SendState, TakenMonthCriteria } from './MonthEndSendParts.jsx';
import useTakenMonth, { useMonthAnswer } from './useTakenMonth.js';

/**
 * THE REGIONS' PACKS -- the October build's month end, item 3 of the 14 Oct Show & Tell: each Regional Secretary's own
 * region's figures and lists (Stephne, MEN-02, MEN-08: six regions, "Johannesburg - 2x files"), produced from the month's
 * newest take, then downloaded or e-mailed -- "Both, chosen each month" (MEN-04) -- as PDF, Excel or both (MEN-05).
 *
 *   the month       a taken month only (`useTakenMonth`): a pack is made from a take, never from the open month;
 *   a recipient     one card a pack set in the caller's scope, with what this month's pack is to be: downloaded,
 *                   e-mailed or both, as PDF, Excel or both -- chosen here, for this visit, and kept nowhere;
 *   produce         one call a recipient; *Produce the packs* is one call a recipient in turn, a refusal never stopping
 *                   the rest. A double click produces nothing twice (the server answers the pack in hand);
 *   download        FETCHED, never linked: the route is held by `MONTH_END_SEND`, and a link carries no session;
 *   e-mail          refused cleanly where the server sends no mail (`MAIL_NOT_CONFIGURED`): said, the e-mail shut for
 *                   the visit, and downloading untouched. Never WhatsApp (SASBO, 5 Oct: reports are e-mailed);
 *   what was sent   each recipient's deliveries, newest first, read again after every action -- the server records
 *                   every attempt, refused or not.
 */

const NOT_AVAILABLE = 'The regions’ packs are not available from this server yet.';

/** Said where an answer never came back: the server may have done it, and the list below is read again. */
const PRODUCE_UNCONFIRMED = 'The pack could not be confirmed. The list is read again below; producing it again is safe — '
  + 'a pack in hand is answered, never made twice.';
const AGAIN_UNCONFIRMED = 'The new pack could not be confirmed. Look at the list below before producing it again.';
const EMAIL_UNCONFIRMED = 'The e-mail could not be confirmed. Look at what was sent, below, before sending it again.';

/** A failure the server never answered, rather than one it refused in its own words. */
const unconfirmed = (error) => writeMayHaveLanded(error) && !error?.body?.code;

const produceAllLabel = (toProduce, of) => {
  if (!toProduce) return 'Every pack is produced';
  return toProduce === of ? 'Produce every pack' : `Produce the ${formatInt(toProduce)} still to produce`;
};

/** The id of the page's own line that says this server sends no mail -- what a shut e-mail control is described by. */
const MAIL_OFF_ID = 'region-packs-mail-off';
/** The id of the line that says no pack can be made on this server -- what a shut Produce is described by. */
const UNAVAILABLE_ID = 'region-packs-unavailable';

function RecipientCard({ row, choice, onChoose, mailOn, canProduce, busy, locked, notice, actions }) {
  const { set, pack, deliveries = [] } = row;
  const id = `pack-${set.code}`;
  const noEmail = whyNoEmail(set, mailOn);
  const working = Boolean(busy) || locked;
  const toggle = (format) => onChoose({
    formats: choice.formats.includes(format)
      ? choice.formats.filter((chosen) => chosen !== format)
      : FORMATS.filter((known) => known === format || choice.formats.includes(known)),
  });
  return (
    <section aria-labelledby={id} data-set={set.code}>
      <Sheet className="gap-3 px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id={id} className="text-lg font-semibold text-ink">{set.label}</h2>
          <span className="text-sm font-medium text-ink-muted">{set.code}</span>
        </div>
        <p className="text-sm text-ink-muted">
          {[areasSaid(set.areaLetters), set.position, set.email || 'No e-mail address on record'].join(' · ')}
        </p>
        <p className="text-sm text-ink" data-pack={pack ? 'produced' : 'none'}>{pack ? packSaid(pack) : 'Not produced yet.'}</p>

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-ink-muted">This month</legend>
            <div className="mt-1 flex flex-wrap gap-x-4">
              {DELIVERY_CHOICES.map((option) => {
                const shut = option.value !== DELIVERY.DOWNLOAD && Boolean(noEmail);
                return (
                  <label key={option.value} className="touch-target flex items-center gap-2 text-sm text-ink">
                    <input
                      type="radio"
                      name={`delivery-${set.code}`}
                      value={option.value}
                      checked={choice.delivery === option.value}
                      onChange={() => onChoose({ delivery: option.value })}
                      disabled={shut || working}
                      aria-describedby={shut ? (mailOn ? `${id}-no-email` : MAIL_OFF_ID) : undefined}
                      className="size-4 accent-brand"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Format</legend>
            <div className="mt-1 flex flex-wrap gap-x-4">
              {FORMATS.map((format) => (
                <label key={format} className="touch-target flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={choice.formats.includes(format)} onChange={() => toggle(format)}
                    disabled={working} className="size-4 accent-brand" />
                  {formatLabel(format)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {/* The page says once that this server sends no mail; a card says only what is its own. */}
        {noEmail && mailOn && <p id={`${id}-no-email`} className="text-sm text-ink-muted">{noEmail}</p>}
        {choice.formats.length === 0 && <p className="text-sm text-ink-muted">Choose PDF, Excel or both.</p>}

        <div className="flex flex-wrap items-center gap-2">
          {!pack ? (
            <Button variant="primary" onClick={actions.produce} loading={busy === 'produce'} disabled={working || !canProduce}
              aria-describedby={canProduce ? undefined : UNAVAILABLE_ID}>
              Produce the pack
            </Button>
          ) : (
            <>
              {downloads(choice.delivery) && choice.formats.map((format) => (
                <Button key={format} onClick={() => actions.download(format)} loading={busy === `download-${format}`}
                  disabled={working}>
                  <Download aria-hidden="true" className="size-4 shrink-0" />
                  Download {formatLabel(format)}
                </Button>
              ))}
              {emails(choice.delivery) && (
                <Button variant="primary" onClick={actions.email} loading={busy === 'email'}
                  disabled={working || choice.formats.length === 0}>
                  <Mail aria-hidden="true" className="size-4 shrink-0" />
                  E-mail {formatsSaid(choice.formats) || 'the pack'}
                </Button>
              )}
              <Button variant="ghost" onClick={actions.again} loading={busy === 'again'} disabled={working || !canProduce}
                aria-describedby={canProduce ? `${id}-again` : UNAVAILABLE_ID}>
                Produce again
              </Button>
              <span id={`${id}-again`} className="sr-only">
                Makes a new pack beside this one, for after the recipient’s areas changed.
              </span>
            </>
          )}
        </div>
        <ActionNotice notice={notice} />

        {deliveries.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-ink">What was sent</h3>
            <ul className="mt-1 grid gap-0.5 text-sm text-ink-muted" aria-label={`What was sent to ${set.label}`}>
              {deliveries.map((sent) => (
                <li key={sent.id} data-outcome={sent.outcome}>
                  {`${instantLabel(sent.at)}: ${howSaid(sent)}, by ${sent.by}. ${outcomeSaid(sent)}.`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Sheet>
    </section>
  );
}

function RegionPacks({ month, noneTaken }) {
  const read = useMonthAnswer(getRegionPacks, month, regionPacksOf, 'MonthEndRegionPacks.read', NOT_AVAILABLE);
  const { answer } = read;
  // A refusal said this server sends no mail, whatever the read said: e-mail is shut for the rest of the visit.
  const [mailRefused, setMailRefused] = useState(false);
  const mailOn = Boolean(answer?.mail?.configured) && !mailRefused;
  const [chosen, setChosen] = useState({});
  const [notices, setNotices] = useState({});
  const [busy, setBusy] = useState({});
  const [bulk, setBulk] = useState(null);
  // What is in flight, known at once: two presses inside one tick both see the render before either.
  const running = useRef(new Set());

  if (noneTaken) return <NoMonthTaken why="A region’s pack is made from a taken month." />;
  if (!month) return null;
  if (read.pending) return <SendState state="loading" title="Reading the regions’ packs…" />;
  if (!answer) return <SendState state="error" error={read.failure} onRetry={read.reload} />;

  const rows = answer.sets;
  // Where the server cannot place members in regions, no pack can be made: every Produce is shut, and says why.
  const canProduce = answer.available !== false;
  const say = (code, notice) => setNotices((was) => ({ ...was, [code]: notice }));
  const choiceOf = ({ set }) => ({
    delivery: whyNoEmail(set, mailOn) ? DELIVERY.DOWNLOAD : chosen[set.code]?.delivery ?? defaultDelivery(set, mailOn),
    formats: chosen[set.code]?.formats ?? FORMATS,
  });

  /** One recipient's action: shut while it runs, its notice its own, and the list read again after it. */
  const act = async (code, what, run) => {
    if (running.current.has(code) || bulk) return;
    running.current.add(code);
    setBusy((was) => ({ ...was, [code]: what }));
    say(code, null);
    try {
      say(code, await run());
    } finally {
      running.current.delete(code);
      setBusy((was) => ({ ...was, [code]: null }));
      read.reload();
    }
  };

  const produce = (row, again = false) => act(row.set.code, again ? 'again' : 'produce', async () => {
    try {
      await produceRegionPack(month, row.set.code, { again });
      return { tone: 'ok', message: again ? 'A new pack is produced, beside the one before.' : 'The pack is produced.' };
    } catch (error) {
      reportError('MonthEndRegionPacks.produce', error);
      return { message: unconfirmed(error) ? (again ? AGAIN_UNCONFIRMED : PRODUCE_UNCONFIRMED) : messageOf(error) };
    }
  });

  const download = (row, format) => act(row.set.code, `download-${format}`, async () => {
    try {
      saveFile(await downloadRegionPack(row.pack.id, format), `sasbo-month-end-${month}-${row.set.code}.${format.toLowerCase()}`);
      return { tone: 'ok', message: `The ${formatLabel(format)} file is downloaded.` };
    } catch (error) {
      reportError('MonthEndRegionPacks.download', error);
      return { message: `The ${formatLabel(format)} file was not downloaded. ${messageOf(error)}` };
    }
  });

  const email = (row) => act(row.set.code, 'email', async () => {
    try {
      return { tone: 'ok', message: `${howSaid(await emailRegionPack(row.pack.id, choiceOf(row).formats))}.` };
    } catch (error) {
      reportError('MonthEndRegionPacks.email', error);
      if (error?.body?.code === SEND_REFUSAL.MAIL_NOT_CONFIGURED) setMailRefused(true);
      return { message: unconfirmed(error) ? EMAIL_UNCONFIRMED : messageOf(error) };
    }
  });

  /** One call a recipient still without a pack, in turn: a refusal is said at its card and the rest go on. */
  const produceAll = async () => {
    const waiting = rows.filter((row) => !row.pack);
    if (!waiting.length || bulk || running.current.size) return;
    setBulk({ what: 'Producing', done: 0, of: waiting.length });
    for (const [index, row] of waiting.entries()) {
      try {
        await produceRegionPack(month, row.set.code);
        say(row.set.code, { tone: 'ok', message: 'The pack is produced.' });
      } catch (error) {
        reportError('MonthEndRegionPacks.produceAll', error);
        say(row.set.code, { message: unconfirmed(error) ? PRODUCE_UNCONFIRMED : messageOf(error) });
      }
      setBulk({ what: 'Producing', done: index + 1, of: waiting.length });
    }
    setBulk(null);
    read.reload();
  };

  /** Every produced pack whose recipient is e-mailed this month: one call for each choice of formats, each set's result its own. */
  const emailing = rows.filter((row) => row.pack && emails(choiceOf(row).delivery) && choiceOf(row).formats.length > 0);
  const emailAll = async () => {
    if (!emailing.length || bulk || running.current.size) return;
    const groups = new Map();
    for (const row of emailing) {
      const key = choiceOf(row).formats.join(',');
      groups.set(key, [...(groups.get(key) ?? []), row.set.code]);
    }
    setBulk({ what: 'E-mailing', done: 0, of: emailing.length });
    let done = 0;
    for (const [formats, sets] of groups) {
      try {
        const answered = await emailRegionPacks(month, sets, formats.split(','));
        for (const result of answered?.results ?? []) {
          if (result.code === SEND_REFUSAL.MAIL_NOT_CONFIGURED) setMailRefused(true);
          say(result.setCode, result.outcome === 'SENT'
            ? { tone: 'ok', message: `${howSaid(result.delivery ?? { channel: 'EMAIL', formats: formats.split(',') })}.` }
            : { message: result.message || outcomeSaid(result) });
        }
      } catch (error) {
        reportError('MonthEndRegionPacks.emailAll', error);
        for (const code of sets) say(code, { message: unconfirmed(error) ? EMAIL_UNCONFIRMED : messageOf(error) });
      }
      done += sets.length;
      setBulk({ what: 'E-mailing', done, of: emailing.length });
    }
    setBulk(null);
    read.reload();
  };

  const toProduce = rows.filter((row) => !row.pack).length;
  return (
    <div className="mt-6 grid gap-4" data-region-packs={read.refreshing ? 'refreshing' : 'ready'}>
      <div className="grid max-w-prose gap-1 text-sm text-ink-muted">
        <p>
          {`${takeSaid(answer.month, answer.take)}. Each pack holds its region’s figures, and three lists that name `
            + 'members: the new, the deleted and the suspended.'}
        </p>
        {!mailOn && <p id={MAIL_OFF_ID} data-mail="off">{MAIL_OFF}</p>}
        {!canProduce && <p id={UNAVAILABLE_ID} data-packs="unavailable">{PACKS_UNAVAILABLE}</p>}
        {uncoveredSaid(answer.uncovered) && <p>{uncoveredSaid(answer.uncovered)}</p>}
        {answer.unplaced > 0 && (
          <p>{`${formatInt(answer.unplaced)} member${answer.unplaced === 1 ? ' has' : 's have'} no workplace on record, so `
            + `${answer.unplaced === 1 ? 'is' : 'are'} in no region’s pack.`}</p>
        )}
        {read.failure && <p role="alert">{`The packs could not be read again: ${messageOf(read.failure)}`}</p>}
      </div>

      {rows.length === 0 ? (
        <SendState state="empty" title="No recipient is set up for your part of SASBO." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={produceAll} disabled={!toProduce || Boolean(bulk) || !canProduce}
              aria-describedby={canProduce ? undefined : UNAVAILABLE_ID}
              loading={bulk?.what === 'Producing'}>
              {produceAllLabel(toProduce, rows.length)}
            </Button>
            <Button onClick={emailAll} disabled={!emailing.length || !mailOn || Boolean(bulk)}
              loading={bulk?.what === 'E-mailing'} aria-describedby={mailOn ? undefined : MAIL_OFF_ID}>
              <Mail aria-hidden="true" className="size-4 shrink-0" />
              {`E-mail ${emailing.length ? formatInt(emailing.length) : 'the'} pack${emailing.length === 1 ? '' : 's'}`}
            </Button>
            {bulk && (
              <p role="status" className="text-sm text-ink-muted">{`${bulk.what} the packs: ${bulk.done} of ${bulk.of}…`}</p>
            )}
          </div>
          {rows.map((row) => (
            <RecipientCard
              key={row.set.code}
              row={row}
              choice={choiceOf(row)}
              onChoose={(change) => setChosen((was) => ({ ...was, [row.set.code]: { ...choiceOf(row), ...change } }))}
              mailOn={mailOn}
              canProduce={canProduce}
              busy={busy[row.set.code]}
              locked={Boolean(bulk)}
              notice={notices[row.set.code]}
              actions={{
                produce: () => produce(row),
                again: () => produce(row, true),
                download: (format) => download(row, format),
                email: () => email(row),
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

/** The route's page: the month, then the packs for a person who may send them -- and a sentence for anyone else. */
export default function MonthEndRegionPacks() {
  const taken = useTakenMonth('MonthEndRegionPacks.months');
  return (
    <Page>
      <PageTitle
        title="The regions’ packs"
        subtitle="Each Regional Secretary receives their own region’s figures and lists: six regions, Johannesburg twice. Produce a pack, then download it or have the system e-mail it, as PDF, Excel or both."
      />
      <TakenMonthCriteria taken={taken} />
      <RequirePermission permission={PERMISSIONS.MONTH_END_SEND}>
        <RegionPacks month={taken.month} noneTaken={taken.noneTaken} />
      </RequirePermission>
    </Page>
  );
}
