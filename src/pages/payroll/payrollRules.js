import { dayLabel, monthLabel, monthsTo } from '../../config/monthEnd.js';
import { EMPTY, formatInt, formatZar, today } from '../../lib/format.js';

/**
 * Payroll Deductions and Reconciliation's small rules, named once -- the Files list, Load a file, a file's page and its
 * queries read them. The codes are the server's (`contracts/payroll-api.md`, its `api-vocabulary.json` "payroll"
 * section), held to it by `payrollRules.test.js`: a type the server adds reddens there rather than reaching a screen as
 * a row nobody named. The server says what to do about each discrepancy (`whatToDo`, from Stephne's answers) and why
 * this row is listed (`detail`); the screen shows its words, so the reports and the screen never disagree.
 *
 * ⚖️ Every frozen table is `@__PURE__`, as month end's are: a screen importing one word ships no table it never reads.
 */

/** Where the module's screens are. Every file has its own address, so it opens by a click or by its route. */
export const PAYROLL_HOME = '/admin/payroll';
export const LOAD_HREF = '/admin/payroll/load';
export const fileHref = (id) => `/admin/payroll/files/${encodeURIComponent(id)}`;
export const queriesHref = (id) => `${fileHref(id)}/queries`;

/** An id from an address: a positive whole number, or `null` -- what a person typed is never sent as one. */
export const idOf = (raw) => (/^[1-9]\d{0,17}$/.test(String(raw ?? '')) ? String(raw) : null);

/** An amount as the server sends it -- a decimal string, `"174.00"` -- as a number, or `null` when it is none. */
export const amountOf = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const number = Number(value);
  return value === '' || !Number.isFinite(number) ? null : number;
};

/** Rands as the screens print them; the em dash for anything that is not an amount. */
export const rands = (value) => (amountOf(value) == null ? EMPTY : formatZar(amountOf(value)));

/** A month and an employer, as a person names a file: "Absa — September 2026". */
export const fileTitle = (file) =>
  [file?.employer?.name, file?.period ? monthLabel(file.period) : null].filter(Boolean).join(' — ') || 'Payroll file';

export { EMPTY, dayLabel, monthLabel };

/**
 * The months a file is chosen for: this one and the twelve before it, newest first -- the year files are kept
 * (PAY-39). A choice, never a rule: the server refuses a month that has not begun by its own clock (PERIOD_IN_FUTURE).
 */
export const recentMonths = (now = today()) => monthsTo(`${now.y}-${String(now.m).padStart(2, '0')}`);

/**
 * The server's words for a file's and a discrepancy's state, named once: a screen compares by name, never by spelling
 * the word again (vocabulary.parity's scan reads a `status` compared with a quoted word as the member vocabulary).
 */
export const RECONCILED = 'RECONCILED';
export const SUPERSEDED = 'SUPERSEDED';
export const PURGED = 'PURGED';
export const RESOLVED = 'RESOLVED';

/**
 * The refusals a screen acts on, beyond saying the server's sentence -- each one a code the server publishes
 * (`payroll.refusalCodes`), held so by `payrollRules.test.js`. Every other refusal is shown in the server's words.
 */
export const REFUSAL = /* @__PURE__ */ Object.freeze({
  FILE_EXISTS_FOR_PERIOD: 'FILE_EXISTS_FOR_PERIOD',
  HEADING_ROW_NOT_FOUND: 'HEADING_ROW_NOT_FOUND',
  TYPED_ENTRY_REQUIRED: 'TYPED_ENTRY_REQUIRED',
  TYPED_ROWS_INVALID: 'TYPED_ROWS_INVALID',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_CHANGED_SINCE: 'FILE_CHANGED_SINCE',
  NOTHING_TO_QUERY: 'NOTHING_TO_QUERY',
  DISCREPANCY_CHANGED_SINCE: 'DISCREPANCY_CHANGED_SINCE',
  DISCREPANCY_ALREADY_RESOLVED: 'DISCREPANCY_ALREADY_RESOLVED',
});

/* ── the file ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * A file as the list says it. The server's `status` is RECONCILED, SUPERSEDED or PURGED; a reconciled file is then
 * read by its discrepancies, as administrators speak of it: processed with none, open, or all resolved.
 */
export const fileState = (file) => {
  if (file?.status === SUPERSEDED) return { label: 'Replaced by a later file', tone: 'unknown' };
  if (file?.status === PURGED) return { label: 'Contents deleted after a year', tone: 'unknown' };
  if (file?.status !== RECONCILED) return { label: file?.status ? String(file.status) : 'Unknown', tone: 'unknown' };
  if (file.openDiscrepancies > 0) return { label: `${formatInt(file.openDiscrepancies)} open`, tone: 'pending' };
  if (file.discrepancies > 0) return { label: 'All resolved', tone: 'active' };
  return { label: 'Processed, nothing to follow up', tone: 'active' };
};

/** The file statuses the list filters on, with what a person calls them. */
export const FILE_STATUS = /* @__PURE__ */ Object.freeze({
  RECONCILED: 'Compared',
  SUPERSEDED: 'Replaced',
  PURGED: 'Contents deleted',
});

/** How a file arrived. GBS sends a PDF and SA Reserve Bank a picture; their lines are typed in (PAY-03). */
export const ENTRY = /* @__PURE__ */ Object.freeze({
  UPLOAD: 'Loaded from the employer’s file',
  TYPED: 'Typed in from the employer’s notice',
});

/* ── loading a file ───────────────────────────────────────────────────────────────────────────────────────────── */

/** What the server reads (`vocabulary.accepted`), and its limits when the vocabulary has not answered. */
export const ACCEPTED_EXTENSIONS = /* @__PURE__ */ Object.freeze(['.xlsx', '.xls', '.csv']);
export const ACCEPT_ATTRIBUTE = '.xlsx,.xls,.csv';
export const DEFAULT_LIMITS = /* @__PURE__ */ Object.freeze({
  maxBytes: 10 * 1024 * 1024,
  maxTypedRows: 5000,
  noteMaxLength: 1000,
});

/** The server's limits, each one only where it gave a number. */
export const limitsOf = (vocabulary) => {
  const given = vocabulary?.limits ?? {};
  return Object.fromEntries(Object.entries(DEFAULT_LIMITS).map(([key, fallback]) =>
    [key, Number.isInteger(given[key]) && given[key] > 0 ? given[key] : fallback]));
};

/** `10485760` → `10 MB`, `18234` → `18 KB`: a size as a file chooser shows it. */
export const sizeLabel = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return EMPTY;
  if (bytes >= 1024 * 1024) return `${formatInt(Math.round((bytes / (1024 * 1024)) * 10) / 10)} MB`;
  return `${formatInt(Math.max(1, Math.round(bytes / 1024)))} KB`;
};

const extensionOf = (name) => /\.[a-z0-9]{1,8}$/i.exec(name ?? '')?.[0].toLowerCase() ?? '';

/** Kinds of file that are a page or a picture, never a spreadsheet: their lines are typed in instead. */
const UNREADABLE_KIND = /* @__PURE__ */ Object.freeze({ pdf: 'a PDF', picture: 'a picture' });
const UNREADABLE_EXTENSION = /* @__PURE__ */ Object.freeze({
  '.pdf': 'pdf', '.png': 'picture', '.jpg': 'picture', '.jpeg': 'picture', '.gif': 'picture', '.heic': 'picture',
  '.tif': 'picture', '.tiff': 'picture', '.bmp': 'picture', '.webp': 'picture',
});

/**
 * What a file's first bytes say it is -- only the kinds that settle a refusal: a PDF or a picture renamed `.xlsx` is
 * still one. Anything else is the server's to judge by its content (banks send "Excel" files that are web pages or
 * text), so this browser never refuses a spreadsheet on a guess.
 */
export const sniffKind = (bytes) => {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);
  const starts = (...signature) => signature.every((value, index) => b[index] === value);
  if (starts(0x25, 0x50, 0x44, 0x46)) return 'pdf';
  if (starts(0x89, 0x50, 0x4e, 0x47) || starts(0xff, 0xd8, 0xff) || starts(0x47, 0x49, 0x46, 0x38)) return 'picture';
  return null;
};

/** A chosen file's first bytes -- a slice, never the whole file. */
export const readHead = async (file, length = 8) => {
  const slice = file.slice(0, length);
  return new Uint8Array(typeof slice.arrayBuffer === 'function'
    ? await slice.arrayBuffer()
    : await new Response(slice).arrayBuffer());
};

/**
 * Why a chosen file cannot be sent, or `null` -- checked BEFORE anything is uploaded: its type by name and by its first
 * bytes, then its size. `typeIn` means the employer's lines are to be typed in instead (PAY-03).
 */
export const fileProblem = (file, { maxBytes = DEFAULT_LIMITS.maxBytes, head } = {}) => {
  if (!file) return { message: 'Choose the employer’s file first.' };
  const kind = (head && sniffKind(head)) ?? UNREADABLE_EXTENSION[extensionOf(file.name)];
  if (UNREADABLE_KIND[kind]) {
    return {
      typeIn: true,
      message: `This file is ${UNREADABLE_KIND[kind]}, which cannot be read. Type the lines in from it instead.`,
    };
  }
  const extension = extensionOf(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return {
      message: `Only Excel and CSV files can be loaded (${ACCEPTED_EXTENSIONS.join(', ')}); this one is `
        + `${extension ? `a ${extension} file` : 'of a type that is not recognised'}.`,
    };
  }
  if (file.size === 0) return { message: 'This file is empty. Choose the file the employer sent.' };
  if (file.size > maxBytes) {
    return { message: `This file is ${sizeLabel(file.size)}; files up to ${sizeLabel(maxBytes)} can be loaded.` };
  }
  return null;
};

/* ── the columns ──────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The fields a line is read into, and the heading the file prints for each. Every employer lays its file out
 * differently (PAY-03, PAY-08); a line is matched on the staff number, the ID number, and the initials with the surname
 * (PAY-10). `fullName` is for a file that prints the name in one column.
 */
export const COLUMN_FIELDS = /* @__PURE__ */ Object.freeze([
  { field: 'staffNumber', label: 'Staff number' },
  { field: 'idNumber', label: 'ID number' },
  { field: 'initials', label: 'Initials' },
  { field: 'surname', label: 'Surname' },
  { field: 'fullName', label: 'Full name, in one column' },
  { field: 'amount', label: 'Amount deducted' },
]);

/** A heading the server will look for is at most this long; a longer one cannot be a heading. */
export const HEADING_LIMIT = 80;

/** A mapping as it is sent: each field's heading trimmed, `null` where it is not on the file. */
export const mappingOf = (draft) => Object.fromEntries(COLUMN_FIELDS.map(({ field }) => {
  const heading = typeof draft?.[field] === 'string' ? draft[field].trim() : '';
  return [field, heading || null];
}));

/**
 * Why a mapping cannot be sent -- every reason, in order -- or `[]`: the amount, and at least one way to know who the
 * line is (the server's rule, `COLUMN_MAPPING_INVALID`), and no heading given to two fields.
 */
export const mappingProblems = (draft) => {
  const mapping = mappingOf(draft);
  const problems = [];
  if (!mapping.amount) problems.push('Give the heading of the column with the amount deducted.');
  if (!mapping.staffNumber && !mapping.idNumber && !mapping.surname && !mapping.fullName) {
    problems.push('Give the heading of the staff number, the ID number or the surname: a line is matched on one of them.');
  }
  const headings = Object.values(mapping).filter(Boolean).map((heading) => heading.toLowerCase());
  if (new Set(headings).size !== headings.length) problems.push('The same heading is given for two fields. Give each column once.');
  if (Object.values(mapping).some((heading) => heading && heading.length > HEADING_LIMIT)) {
    problems.push(`A heading is at most ${HEADING_LIMIT} characters.`);
  }
  return problems;
};

/* ── discrepancies ────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Each kind of discrepancy's short name -- for the filter, the summary's counts and the list. What it means and what to
 * do come from the server (`whatToDo`); `rule` is the question of Stephne's it rests on, as the server publishes it.
 */
export const DISCREPANCY_LABEL = /* @__PURE__ */ Object.freeze({
  NOT_A_MEMBER: 'Not a member',
  MEMBERSHIP_ENDED: 'Membership ended',
  MISSING_FROM_FILE: 'Missing from the file',
  AMOUNT_DIFFERS: 'Amount differs',
  DEDUCTED_TWICE: 'Deducted twice',
  POSSIBLE_CATCH_UP: 'Possible catch-up',
  EMPLOYEE_NUMBER_DIFFERS: 'Different employee number',
  NAME_DIFFERS: 'Name does not match',
  DETAILS_DIFFER: 'Other details differ',
  DEBIT_ORDER_MEMBER: 'Pays by debit order',
  UNREADABLE_ROW: 'Line could not be read',
  FILE_TOTAL_DIFFERS: 'File total differs',
  PAYMENT_DIFFERS: 'Payment differs',
});

/**
 * A type's short name: the vocabulary's label when it has answered, else this table's -- the same words, held so by
 * `payrollRules.test.js` -- so a page never says less because one read failed.
 */
export const discrepancyLabel = (type, vocabulary) =>
  vocabulary?.discrepancyTypes?.find((entry) => entry.type === type)?.label
  ?? DISCREPANCY_LABEL[type]
  ?? (type ? String(type) : 'Unknown');

/** A discrepancy stays open, with its notes, until resolved (PAY-20); on a query list it is queried. */
export const DISCREPANCY_STATUS = /* @__PURE__ */ Object.freeze({
  OPEN: { label: 'Open', tone: 'pending' },
  QUERIED: { label: 'Queried with the employer', tone: 'pending' },
  RESOLVED: { label: 'Resolved', tone: 'active' },
});

export const discrepancyStatusOf = (status) =>
  DISCREPANCY_STATUS[status] ?? { label: status ? String(status) : 'Unknown', tone: 'unknown' };

/** The two outcomes only the system sets, said in words when the vocabulary has none for them. */
const SYSTEM_OUTCOME = /* @__PURE__ */ Object.freeze({
  NO_LONGER_APPLIES: 'No longer found when compared again',
  SUPERSEDED: 'The file was replaced',
});

/** An outcome's words: the server's label, else the system's own, else its code. */
export const outcomeLabel = (outcome, vocabulary) =>
  vocabulary?.outcomes?.find((entry) => entry.outcome === outcome)?.label
  ?? SYSTEM_OUTCOME[outcome]
  ?? (outcome ? String(outcome).toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase()) : EMPTY);

/** Why a note cannot be saved yet, or `null` (the server's `NOTE_INVALID`: 1 to 1,000 characters). */
export const noteProblem = (text, limit = DEFAULT_LIMITS.noteMaxLength) => {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return 'Write what was done first.';
  if (trimmed.length > limit) return `Keep the note to ${formatInt(limit)} characters.`;
  return null;
};

/* ── the lines ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Which lines of the file to show (route 8's `show`). */
export const ROW_FILTER = /* @__PURE__ */ Object.freeze({
  ALL: 'Every line',
  MATCHED: 'Matched',
  NOT_MATCHED: 'Not matched',
  UNREADABLE: 'Could not be read',
});

/** How a line was matched to a member (PAY-10), as the end of "By …". */
export const MATCH_RULE = /* @__PURE__ */ Object.freeze({
  STAFF_NUMBER: 'staff number',
  ID_NUMBER: 'ID number',
  NAME: 'initials and surname',
});

/** What the amount on a matched line says. */
export const AMOUNT_STATUS = /* @__PURE__ */ Object.freeze({
  MATCHES: 'As expected',
  CATCH_UP: 'Catch-up of missed months',
  DIFFERS: 'Differs',
  LISTED_TWICE: 'Listed twice',
  RATE_UNKNOWN: 'No subscription on record for the month',
});

/**
 * A matched line's amount in words. A catch-up says how many months it covers; a rate unknown names the month with no
 * subscription on record -- the server never prices it at another month's rate, and neither does the screen.
 */
export const amountStatusLabel = (match) => {
  if (!match?.amountStatus) return EMPTY;
  if (match.amountStatus === 'CATCH_UP' && match.months > 1) return `Catch-up of ${formatInt(match.months)} months`;
  if (match.amountStatus === 'RATE_UNKNOWN' && match.rateUnknownFor) {
    return `No subscription on record for ${monthLabel(match.rateUnknownFor)}`;
  }
  return AMOUNT_STATUS[match.amountStatus] ?? String(match.amountStatus);
};

/* ── queries to the employer ──────────────────────────────────────────────────────────────────────────────────── */

/** What SASBO asks an employer to do for a line (PAY-21: "We send them the discrepancy queries - To add or delete."). */
export const QUERY_ACTION = /* @__PURE__ */ Object.freeze({
  ADD: { label: 'Add', ask: 'Start or resume deducting' },
  DELETE: { label: 'Delete', ask: 'Stop deducting' },
  CORRECT: { label: 'Correct', ask: 'Correct the amount' },
});

/** The download's password: it leaves SASBO for the employer, so it is protected (POPIA); 8 to 64 characters. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
export const passwordProblem = (password) => {
  const length = (password ?? '').length;
  if (length < PASSWORD_MIN) return `Choose a password of at least ${PASSWORD_MIN} characters.`;
  if (length > PASSWORD_MAX) return `Keep the password to ${PASSWORD_MAX} characters.`;
  return null;
};

/* ── money ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The payment check's verdict (PAY-28). Absa's 3% fee (PAY-27) is already out of what it is expected to pay. */
export const PAYMENT_STATUS = /* @__PURE__ */ Object.freeze({
  NOT_RECORDED: { label: 'No payment recorded yet', tone: 'unknown' },
  EXACT: { label: 'As expected', tone: 'active' },
  SHORT: { label: 'Short', tone: 'suspended' },
  OVER: { label: 'More than expected', tone: 'pending' },
});

export const paymentStatusOf = (status) => PAYMENT_STATUS[status] ?? PAYMENT_STATUS.NOT_RECORDED;

/** A difference as a sentence's end: `R 174,00 short`, `R 12,00 over`, or that there is none. */
export const differenceLabel = (value) => {
  const amount = amountOf(value);
  if (amount == null) return EMPTY;
  if (amount === 0) return 'None';
  return `${formatZar(Math.abs(amount))} ${amount < 0 ? 'short' : 'over'}`;
};

/** `"3.00"` → `3%`: a fee's rate as Stephne wrote it ("an admin fee of 3%"). */
export const percentLabel = (value) => {
  const amount = amountOf(value);
  return amount == null ? EMPTY : `${formatInt(Math.round(amount * 100) / 100)}%`;
};

/** A typed amount is rands and cents: `174`, `174.00`, `174,5` -- never more than two decimals, never negative. */
export const typedAmountOf = (text) => {
  const trimmed = (text ?? '').trim().replace(',', '.');
  return /^\d{1,7}(\.\d{1,2})?$/.test(trimmed) ? Number(trimmed).toFixed(2) : null;
};

/** The tone a state reads in -- the member statuses' token families, never a raw colour. */
export const TONE_CLASSES = /* @__PURE__ */ Object.freeze({
  active: { chip: 'bg-status-active-bg text-status-active', dot: 'bg-status-active-dot' },
  pending: { chip: 'bg-status-pending-bg text-status-pending', dot: 'bg-status-pending-dot' },
  suspended: { chip: 'bg-status-suspended-bg text-status-suspended', dot: 'bg-status-suspended-dot' },
  unknown: { chip: 'bg-surface-2 text-ink-muted', dot: 'bg-ink-faint' },
});
