import { formatInt } from '../../lib/format.js';
import { monthLabel } from '../../config/monthEnd.js';
import { instantLabel, isYearMonth } from './monthEndRules.js';

/**
 * SENDING THE MONTH -- the regions' packs, the banks' and providers' files, and the record of what went to whom
 * (`contracts/monthend-api.md` §1-4; Stephne's Month end answers of 6 Oct: MEN-02, MEN-04, MEN-05, MEN-08, MEN-32 to
 * MEN-35). The words a person reads for the server's words, and the codes the screens branch on, named once and held
 * to the server's vocabulary by `monthEndSendRules.test.js`.
 *
 * ⚖️ Every frozen table is `@__PURE__`, as `monthEndRules.js`'s are: a screen importing one word ships no table it
 * never reads.
 */

/** The refusals these screens branch on -- each one the server publishes; the sentence read is always the server's. */
export const SEND_REFUSAL = /* @__PURE__ */ Object.freeze({
  MONTH_NOT_TAKEN: 'MONTH_NOT_TAKEN',
  MAIL_NOT_CONFIGURED: 'MAIL_NOT_CONFIGURED',
  SFTP_NOT_CONFIGURED: 'SFTP_NOT_CONFIGURED',
});

/**
 * Why a delivery was refused or failed, in words, by the code the record keeps (`MonthEndDeliveryDto.code`); a code the
 * browser has never heard of is shown as the server wrote it.
 */
export const DELIVERY_REASON = /* @__PURE__ */ Object.freeze({
  MAIL_NOT_CONFIGURED: 'no mail is set up on this server',
  RECIPIENT_HAS_NO_ADDRESS: 'no e-mail address is on record for the recipient',
  PACK_NOT_PRODUCED: 'its pack is not produced yet',
  MAIL_FAILED: 'the mail server refused it or could not be reached',
  SFTP_NOT_CONFIGURED: 'SFTP is not set up on this server',
  SFTP_FAILED: 'the SFTP server refused it or could not be reached',
});

/** The month reads under `/api/month-end/{month}/…` that are not statistics: the sending screens' own. */
export const SENDING_READS = /* @__PURE__ */ Object.freeze(['deliveries', 'files', 'region-packs']);

/* ── the regions' packs (MEN-02, MEN-04, MEN-05, MEN-08) ─────────────────────────────────────────────── */

/** A pack's two formats, as the server names them and as a person does. */
export const FORMATS = /* @__PURE__ */ Object.freeze(['PDF', 'XLSX']);
const FORMAT_LABEL = /* @__PURE__ */ Object.freeze({ PDF: 'PDF', XLSX: 'Excel' });
export const formatLabel = (format) => FORMAT_LABEL[format] ?? format;

/** `PDF and Excel` -- the formats as one phrase, in the order a person reads them. */
export const formatsSaid = (formats = []) => wordsSaid(formats.map(formatLabel));

/** `A, F, K and X`. */
export const wordsSaid = (words) =>
  (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);

/**
 * HOW A RECIPIENT'S PACK GOES THIS MONTH -- MEN-04: "A download per recipient, which we e-mail ourselves", "The system
 * e-mails each recipient directly", or "Both, chosen each month". Chosen on the screen, for this visit: nothing keeps it.
 */
export const DELIVERY = /* @__PURE__ */ Object.freeze({ DOWNLOAD: 'DOWNLOAD', EMAIL: 'EMAIL', BOTH: 'BOTH' });
export const DELIVERY_CHOICES = /* @__PURE__ */ Object.freeze([
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'BOTH', label: 'Both' },
]);
export const downloads = (choice) => choice !== DELIVERY.EMAIL;
export const emails = (choice) => choice !== DELIVERY.DOWNLOAD;

/** Said where this server sends no mail -- and downloading still works (MEN-04's first choice). */
export const MAIL_OFF = 'This server has no mail set up, so the packs cannot be e-mailed from here. Downloading works '
  + 'as usual: download a pack and e-mail it yourself.';
const NO_ADDRESS = 'No e-mail address is on record for this recipient, so its pack can only be downloaded.';

/** Why the system cannot e-mail this recipient -- `null` where it can. */
export const whyNoEmail = (set, mailOn) => (!mailOn ? MAIL_OFF : !set?.email ? NO_ADDRESS : null);

/** The choice a recipient opens on: both, where the system can e-mail them; a download otherwise. */
export const defaultDelivery = (set, mailOn) => (whyNoEmail(set, mailOn) ? DELIVERY.DOWNLOAD : DELIVERY.BOTH);

/**
 * Said where the server cannot make a pack at all (`available: false`): it does not hold SASBO's workplaces in full, so
 * no member can be placed in a region. Every Produce is shut with this sentence (`contracts/monthend-api.md` §2).
 */
export const PACKS_UNAVAILABLE = 'This server does not hold SASBO’s workplaces in full, so no member can be placed in a '
  + 'region and no pack can be made here.';

/** Areas with members that no recipient's pack covers -- each is in no region's pack until a recipient takes it. */
export const uncoveredSaid = (uncovered) => {
  const areas = uncovered?.areas ?? [];
  if (!areas.length) return '';
  const members = uncovered.members ?? 0;
  return `${areasSaid(areas)} ${areas.length === 1 ? 'has' : 'have'} ${formatInt(members)} member${members === 1 ? '' : 's'} `
    + 'on record whom no recipient’s pack covers.';
};

/** Payroll members in no bank's file: no workplace, or a workplace with no table code (`noTableCode`, §3). */
export const noTableCodeSaid = (noTableCode) => {
  const rows = noTableCode?.rows ?? 0;
  if (!rows) return '';
  return `${formatInt(rows)} member${rows === 1 ? ' who pays' : 's who pay'} by payroll deduction ${rows === 1 ? 'is' : 'are'} `
    + 'in no bank’s file: no workplace, or a workplace with no table code, is on record for them.';
};

/** The areas a recipient's pack covers -- `Areas A, F, K and X` -- or the whole region where the set names none. */
export const areasSaid = (letters = []) =>
  (letters.length ? `Area${letters.length === 1 ? '' : 's'} ${wordsSaid(letters)}` : 'The whole region');

/** A pack as made: when, by whom, and what it counted. */
export const packSaid = (pack) => {
  const counts = pack.counts ?? {};
  return `Produced on ${instantLabel(pack.producedAt)} by ${pack.producedBy}: ${formatInt(counts.joined)} joined, `
    + `${formatInt(counts.left)} left, ${formatInt(counts.suspended)} suspended.`;
};

/** The take a month's packs and files are made from: `September 2026, taken on … by seed` -- and again, where it was. */
export const takeSaid = (month, take) => {
  if (!take) return monthLabel(month);
  const again = take.takeNumber > 1 ? ` again (take ${take.takeNumber})` : '';
  return `${monthLabel(month)}, taken${again} on ${instantLabel(take.takenAt)}${take.takenBy ? ` by ${take.takenBy}` : ''}`;
};

/* ── what was sent (§4) ──────────────────────────────────────────────────────────────────────────── */

const KIND = /* @__PURE__ */ Object.freeze({
  REGION_PACK: 'Region’s pack',
  BANK_FILE: 'Bank’s file',
  PROVIDER_FILE: 'Provider’s list',
});
export const kindSaid = (kind) => KIND[kind] ?? kind;

/** How a delivery went: `E-mailed as PDF and Excel to …`, `Downloaded as PDF`, `Sent by SFTP to …`. */
export const howSaid = ({ channel, formats = [], address }) => {
  const as = formats.length ? ` as ${formatsSaid(formats)}` : '';
  const to = address ? ` to ${address}` : '';
  switch (channel) {
    case 'DOWNLOAD': return `Downloaded${as}`;
    case 'EMAIL': return `E-mailed${as}${to}`;
    case 'SFTP': return `Sent by SFTP${to}`;
    default: return channel ?? '';
  }
};

/** What came of it: done, or not sent -- or failed -- and why. */
export const outcomeSaid = ({ outcome, code }) => {
  if (outcome === 'SENT') return 'Done';
  const why = code ? DELIVERY_REASON[code] ?? code : '';
  const word = outcome === 'REFUSED' ? 'Not sent' : outcome === 'FAILED' ? 'Failed' : outcome ?? '';
  return why ? `${word}: ${why}` : word;
};

/* ── the banks' and providers' files (MEN-05, MEN-32 to MEN-35) ──────────────────────────────────────── */

/** What a bank receives each month -- a setting of the bank's (MEN-33). */
export const receivesSaid = (fullList) => (fullList ? 'The full list' : 'New and deleted members only');

/** A file's layout, as it reads inside a sentence -- `as an Excel workbook`; `sentence` starts one with it. */
const LAYOUT = /* @__PURE__ */ Object.freeze({
  ABSA_FIXED_WIDTH: 'Absa’s fixed-width text file',
  SHEET: 'an Excel workbook',
  CSV: 'a CSV text file',
  OLD_MUTUAL_FUNERAL: 'Old Mutual’s funeral benefit list',
  CRITICARE_LISTING: 'Criticare’s listing',
  PROVISIONAL_MEMBER_LIST: 'a member list',
});
export const layoutSaid = (layout) => LAYOUT[layout] ?? layout ?? '';
export const sentence = (text) => (text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '');

const PROTECTION = /* @__PURE__ */ Object.freeze({
  AES_256_ZIP: 'in a ZIP with a password: open it with 7-Zip, WinZip or WinRAR',
  EXCEL_AES_256: 'with a password Excel asks for when it opens',
});
export const protectionSaid = (protection) => PROTECTION[protection] ?? protection;

/** What a file made now would hold: `412 members`, or `3 new and 1 deleted`. */
export const previewSaid = (preview, fullList) => {
  if (!preview) return '';
  return fullList
    ? `${formatInt(preview.rows)} member${preview.rows === 1 ? '' : 's'}`
    : `${formatInt(preview.newRows)} new and ${formatInt(preview.deletedRows)} deleted`;
};

/** Members a layout cannot carry -- counted, never named. */
export const leftOutSaid = (leftOut) => (leftOut > 0
  ? `${formatInt(leftOut)} member${leftOut === 1 ? '' : 's'} could not be put in this layout and ${leftOut === 1 ? 'is' : 'are'} left out.`
  : '');

/** A file as made: its name, what it holds, and when and by whom. */
export const fileSaid = (file) => `${file.fileName}: ${formatInt(file.rows)} row${file.rows === 1 ? '' : 's'}, produced on `
  + `${instantLabel(file.producedAt)} by ${file.producedBy}. Downloaded ${formatInt(file.downloads)} time`
  + `${file.downloads === 1 ? '' : 's'}${file.lastDeliveredAt ? `, last on ${instantLabel(file.lastDeliveredAt)}` : ''}.`;

/**
 * THE ONE-TIME PASSWORD'S WARNING (MEN-05, POPIA): the password is in the answer that made the file and nowhere else --
 * the server keeps no copy -- so it is said once, here, and gone when the page is left.
 */
export const passwordWarning = (kind) =>
  `Give this password to the ${kind === 'BANK' ? 'bank' : 'provider'} by phone — it will not be shown again.`;

/** Where SFTP is not set up, a provider's file is downloaded and delivered by hand (MEN-35, "consult with IT"). */
export const SFTP_OFF = 'SFTP is not set up on this server: download the file and deliver it by hand.';

/* ── the answers' shapes (MV-36: an answer of another shape is not available, never an empty one) ────── */

export const regionPacksOf = (answer) => (answer && typeof answer === 'object' && isYearMonth(answer.month)
  && Array.isArray(answer.sets) && answer.sets.every((row) => typeof row?.set?.code === 'string') ? answer : null);

export const filesOf = (answer) => (answer && typeof answer === 'object' && isYearMonth(answer.month)
  && Array.isArray(answer.banks) && Array.isArray(answer.providers) ? answer : null);

export const deliveriesOf = (answer) => (answer && typeof answer === 'object' && Array.isArray(answer.items)
  && Number.isInteger(answer.total) ? answer : null);
