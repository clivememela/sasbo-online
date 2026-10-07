import { useRef, useState } from 'react';
import { Copy, Download, KeyRound, Upload } from 'lucide-react';

import RequirePermission from '../../auth/RequirePermission.jsx';
import { PERMISSIONS } from '../../auth/permissions.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import Button from '../../components/form/Button.jsx';
import useFocusOn from '../../hooks/useFocusOn.js';
import reportError from '../../lib/reportError.js';
import saveFile from '../../lib/saveFile.js';
import {
  downloadFile, getFiles, produceBankFile, produceProviderFile, sendFileBySftp,
} from '../../services/monthEndSendService.js';
import { messageOf, writeMayHaveLanded } from '../../services/parseApiError.js';
import {
  SEND_REFUSAL, SFTP_OFF, fileSaid, filesOf, layoutSaid, leftOutSaid, passwordWarning, previewSaid, protectionSaid,
  receivesSaid, sentence, takeSaid,
} from './monthEndSendRules.js';
import { ActionNotice, NoMonthTaken, SendState, TakenMonthCriteria } from './MonthEndSendParts.jsx';
import useTakenMonth, { useMonthAnswer } from './useTakenMonth.js';

/**
 * THE FILES THAT LEAVE SASBO -- each bank's monthly list and the providers' lists, item 3 of the 14 Oct Show & Tell:
 * every one PASSWORD-PROTECTED (Stephne, MEN-05: "We would need Bank reports to have a password access as this is a
 * requirement for POPIA"), each bank's file built to its own layout (MEN-20, MEN-34), the full list or only the month's
 * new and deleted members as each bank's setting says (MEN-33), and the providers' lists that still go out -- Old
 * Mutual's funeral list and Law Call's, by SFTP where it is set up (MEN-35).
 *
 *   produce     a new file, and with it its password -- IN THAT ANSWER ONLY: the server keeps no copy and logs none.
 *               So it is shown here once, with a button to copy it and the warning to give it to the bank by phone,
 *               and it is gone when the page is left or the panel hidden. Lost, the file is produced again: a new file,
 *               a new password. Nothing here writes it anywhere -- no storage, no address bar, no log.
 *   download    FETCHED, never linked (the route is held by `MONTH_END_SEND`); the file is already encrypted.
 *   SFTP        a provider delivered by SFTP is sent from here -- refused, and said, where this server has none set
 *               up (`SFTP_NOT_CONFIGURED`, the default): the file is then downloaded and delivered by hand.
 *
 * Bank and provider files carry members of every region, so the server answers them to scope ALL only, and anyone else
 * hears its own sentence (`SCOPE_TOO_NARROW`).
 */

const NOT_AVAILABLE = 'The banks’ and providers’ files are not available from this server yet.';
const PRODUCE_UNCONFIRMED = 'The file could not be confirmed, and its password cannot be shown. Look at the files '
  + 'below: if a new one is there, produce it again for a password you can give.';

/** A failure the server never answered, rather than one it refused in its own words. */
const unconfirmed = (error) => writeMayHaveLanded(error) && !error?.body?.code;

/**
 * THE ONE-TIME PASSWORD, as it is answered: shown once, copied with one press, and gone when hidden. Focus comes here
 * when it appears, so a screen reader reads the warning with it. `data-one-time-password` marks the one element a
 * slide or a screenshot must mask.
 */
function PasswordPanel({ secret, onHide, onDownload, downloading }) {
  const ref = useFocusOn(secret.file.id);
  const [copied, setCopied] = useState(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret.password);
      setCopied('Copied. Paste it nowhere the file goes.');
    } catch (error) {
      reportError('MonthEndFiles.copy', error);
      setCopied('Copying is not available here: select the password and copy it.');
    }
  };
  const id = `password-${secret.file.id}`;
  return (
    <div ref={ref} tabIndex={-1} role="group" aria-labelledby={id} data-password-panel=""
      className="grid gap-2 rounded-lg border border-status-pending-dot bg-status-pending-bg p-4 text-sm text-status-pending focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring">
      <p id={id} className="flex items-center gap-2 font-semibold">
        <KeyRound aria-hidden="true" className="size-4 shrink-0" />
        {`The password for ${secret.file.fileName}`}
      </p>
      <p className="select-all break-all font-mono text-lg font-semibold tracking-wider text-ink" data-one-time-password="">
        {secret.password}
      </p>
      <p className="font-medium">{passwordWarning(secret.kind)}</p>
      {secret.passwordNote && <p>{secret.passwordNote}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={copy}>
          <Copy aria-hidden="true" className="size-4 shrink-0" />
          Copy the password
        </Button>
        <Button size="sm" onClick={onDownload} loading={downloading}>
          <Download aria-hidden="true" className="size-4 shrink-0" />
          Download the file
        </Button>
        <Button size="sm" variant="ghost" onClick={onHide}>Hide the password</Button>
        {copied && <span role="status" className="text-ink">{copied}</span>}
      </div>
    </div>
  );
}

/**
 * A bank or a provider: what it receives, what a file made now would hold, its files this month, and its actions. The
 * passwords it was answered this visit are drawn from those answers, never from the list read after them -- a list
 * that could not be read again must not take the one copy of a password with it.
 */
function RecipientRow({ kind, row, sftpOn, busy, notice, passwords, actions }) {
  const recipient = kind === 'BANK' ? row.bank : row.provider;
  const working = Boolean(busy);
  const id = `${kind.toLowerCase()}-${recipient.code}`;
  const files = row.files ?? [];
  const bySftp = kind === 'PROVIDER' && recipient.delivery === 'SFTP';
  return (
    <li data-recipient={recipient.code} className="grid gap-2 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id={id} className="text-base font-semibold text-ink">{recipient.name}</h3>
        {kind === 'BANK' && (
          <span className="text-sm text-ink-muted">{`Table codes ${(recipient.tableCodes ?? []).join(', ')}`}</span>
        )}
      </div>
      {recipient.active === false ? (
        <p className="text-sm text-ink-muted">Suspended for now: nothing is made for it, and it can be used again.</p>
      ) : (
        <>
          <p className="text-sm text-ink" data-receives="">
            {kind === 'BANK'
              ? `${receivesSaid(recipient.fullList)}, as ${layoutSaid(recipient.layout)}. `
                + `Now: ${previewSaid(row.preview, recipient.fullList)}.`
              : `${sentence(layoutSaid(recipient.layout))}${recipient.provisional ? ', provisional until SASBO confirms it' : ''}. `
                + `Now: ${previewSaid(row.preview, true)}.`}
          </p>
          {bySftp && <p className="text-sm text-ink-muted">{sftpOn ? 'Delivered by SFTP.' : SFTP_OFF}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={files.length ? 'default' : 'primary'} onClick={actions.produce} loading={busy === 'produce'}
              disabled={working}>
              {files.length ? 'Produce the file again' : 'Produce the file'}
            </Button>
          </div>
        </>
      )}
      <ActionNotice notice={notice} />
      {passwords.map((secret) => (
        <PasswordPanel key={secret.file.id} secret={secret} onHide={() => actions.hide(secret.file.id)}
          onDownload={() => actions.download(secret.file)} downloading={busy === `download-${secret.file.id}`} />
      ))}
      {files.map((file) => (
        <div key={file.id} className="grid gap-2" data-file={file.id}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
            <p className="min-w-0 flex-1 basis-80">
              {`${fileSaid(file)} Password-protected, ${protectionSaid(file.protection)}.`}
              {file.leftOut > 0 && ` ${leftOutSaid(file.leftOut)}`}
            </p>
            <Button size="sm" onClick={() => actions.download(file)} loading={busy === `download-${file.id}`}
              disabled={working} aria-label={`Download ${file.fileName}`}>
              <Download aria-hidden="true" className="size-4 shrink-0" />
              Download
            </Button>
            {bySftp && (
              <Button size="sm" onClick={() => actions.sftp(file)} loading={busy === `sftp-${file.id}`}
                disabled={working || !sftpOn} aria-label={`Send ${file.fileName} by SFTP`}>
                <Upload aria-hidden="true" className="size-4 shrink-0" />
                Send by SFTP
              </Button>
            )}
          </div>
        </div>
      ))}
    </li>
  );
}

function MonthFiles({ month, noneTaken }) {
  const read = useMonthAnswer(getFiles, month, filesOf, 'MonthEndFiles.read', NOT_AVAILABLE);
  const { answer } = read;
  const [sftpRefused, setSftpRefused] = useState(false);
  const sftpOn = Boolean(answer?.sftp?.configured) && !sftpRefused;
  // The passwords this visit was answered, by file -- never written anywhere, and gone with the page.
  const [secrets, setSecrets] = useState({});
  const [notices, setNotices] = useState({});
  const [busy, setBusy] = useState({});
  const running = useRef(new Set());

  if (noneTaken) return <NoMonthTaken why="The banks’ and providers’ files are made from a taken month." />;
  if (!month) return null;
  if (read.pending) return <SendState state="loading" title="Reading the month’s files…" />;
  if (!answer) return <SendState state="error" error={read.failure} onRetry={read.reload} />;

  const say = (key, notice) => setNotices((was) => ({ ...was, [key]: notice }));
  const act = async (key, what, run, { reload = true } = {}) => {
    if (running.current.has(key)) return;
    running.current.add(key);
    setBusy((was) => ({ ...was, [key]: what }));
    say(key, null);
    try {
      say(key, await run());
    } finally {
      running.current.delete(key);
      setBusy((was) => ({ ...was, [key]: null }));
      if (reload) read.reload();
    }
  };

  const actionsFor = (kind, recipient) => {
    const key = `${kind}:${recipient.code}`;
    return {
      produce: () => act(key, 'produce', async () => {
        try {
          const made = await (kind === 'BANK' ? produceBankFile : produceProviderFile)(month, recipient.code);
          // Kept with the row it was asked from: the answer's own `kind` is the file's, and is not trusted to match.
          setSecrets((was) => ({ ...was, [made.file.id]: { ...made, kind } }));
          return { tone: 'ok', message: `${made.file.fileName} is produced. Its password is below, this once.` };
        } catch (error) {
          reportError('MonthEndFiles.produce', error);
          return { message: unconfirmed(error) ? PRODUCE_UNCONFIRMED : messageOf(error) };
        }
      }),
      download: (file) => act(key, `download-${file.id}`, async () => {
        try {
          saveFile(await downloadFile(file.id), file.fileName);
          return { tone: 'ok', message: `${file.fileName} is downloaded.` };
        } catch (error) {
          reportError('MonthEndFiles.download', error);
          return { message: `${file.fileName} was not downloaded. ${messageOf(error)}` };
        }
      }),
      sftp: (file) => act(key, `sftp-${file.id}`, async () => {
        try {
          await sendFileBySftp(file.id);
          return { tone: 'ok', message: `${file.fileName} is sent by SFTP.` };
        } catch (error) {
          reportError('MonthEndFiles.sftp', error);
          if (error?.body?.code === SEND_REFUSAL.SFTP_NOT_CONFIGURED) setSftpRefused(true);
          return { message: unconfirmed(error) ? `${file.fileName} could not be confirmed as sent. Look at what was sent `
            + 'before sending it again.' : messageOf(error) };
        }
      }),
      hide: (fileId) => setSecrets((was) => {
        const { [fileId]: gone, ...rest } = was;
        return gone ? rest : was;
      }),
    };
  };

  const list = (kind, rows, heading, empty) => (
    <section aria-labelledby={`files-${kind}`} className="grid gap-2">
      <h2 id={`files-${kind}`} className="text-lg font-semibold text-ink">{heading}</h2>
      {rows.length ? (
        <Sheet>
          <ul className="divide-y divide-line">
            {rows.map((row) => {
              const recipient = kind === 'BANK' ? row.bank : row.provider;
              const key = `${kind}:${recipient.code}`;
              const passwords = Object.values(secrets)
                .filter((secret) => secret.kind === kind && secret.file.recipientCode === recipient.code);
              return (
                <RecipientRow key={recipient.code} kind={kind} row={row} sftpOn={sftpOn} busy={busy[key]}
                  notice={notices[key]} passwords={passwords} actions={actionsFor(kind, recipient)} />
              );
            })}
          </ul>
        </Sheet>
      ) : <SendState state="empty" title={empty} />}
    </section>
  );

  return (
    <div className="mt-6 grid gap-6" data-files={read.refreshing ? 'refreshing' : 'ready'}>
      <div className="grid max-w-prose gap-1 text-sm text-ink-muted">
        <p>
          {`${takeSaid(answer.month, answer.take)}. Every file that leaves SASBO is password-protected, and each `
            + 'password is shown once, when its file is produced.'}
        </p>
        {read.failure && <p role="alert">{`The files could not be read again: ${messageOf(read.failure)}`}</p>}
      </div>
      {list('BANK', answer.banks, 'Banks', 'No bank’s file is set up.')}
      {list('PROVIDER', answer.providers, 'Providers', 'No provider’s list is set up.')}
    </div>
  );
}

/** The route's page: the month, then the files for a person who may send them -- and a sentence for anyone else. */
export default function MonthEndFiles() {
  const taken = useTakenMonth('MonthEndFiles.months');
  return (
    <Page>
      <PageTitle
        title="Files for the banks and providers"
        subtitle="Each bank’s list, and the providers’ lists, password-protected. Produce a file, give the bank its password by phone, then download the file and send it."
      />
      <TakenMonthCriteria taken={taken} />
      <RequirePermission permission={PERMISSIONS.MONTH_END_SEND}>
        <MonthFiles month={taken.month} noneTaken={taken.noneTaken} />
      </RequirePermission>
    </Page>
  );
}
