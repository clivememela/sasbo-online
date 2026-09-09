/**
 * ONE HOME FOR DATES, MONEY AND NUMBERS. `03.2b`, R-SCALE-G.
 *
 * The Card mock already has `fmtDate`, `fmtZar` and `fmtInt` (`mockups/design/core.js:32-38`)
 * and the application has none of them: `Subscriptions.jsx:27` calls
 * `new Date(d).toLocaleDateString()`, which renders in whatever locale the browser
 * happens to be in, and everything else prints raw. P4 rebuilds 27 routes; without one
 * home this becomes 27 answers.
 *
 * ---
 *
 * 🔴 **A DATE-ONLY VALUE NEVER PASSES THROUGH `Date` OR `toISOString` HERE. R-ROB-N.**
 *
 * A member's date of birth is a **calendar date**, not an instant. `new Date("1988-06-15")`
 * parses as **midnight UTC**, and `new Date(...).toISOString().split("T")[0]` converts back
 * through UTC — so in South Africa (UTC+2) any date-only value handled that way can come out
 * a day earlier than it went in.
 *
 * It is not hypothetical in this repository. `CaptureMember.jsx:85` computes today as
 * `new Date().toISOString().split("T")`, so **a member captured between 00:00 and 01:59 SAST
 * is dated yesterday** — CM-38, the Capture Member arc's, fixed in their `01.1`. This module
 * is the reason the next one does not happen: `today()` reads the local calendar fields
 * directly, and every function here works on `{ y, m, d }` or on strings, never on a
 * timestamp.
 *
 * ⚠️ **The `toISOString` scan `03.3` adds is SYNTACTIC**, not semantic — it looks for
 * `toISOString()` followed by `.split("T")`, `.slice(0, 10)` or `.substring(0, 10)` — because
 * "is this value date-only?" is not decidable by a scanner and a bare ban would redden a
 * perfectly correct instant.
 *
 * ---
 *
 * 🔑 **`en-ZA` IS NAMED, NOT INHERITED.** `toLocaleString()` with no locale uses the
 * browser's, so the same subscription renders `R 1 234,56` for one administrator and
 * `R 1,234.56` for another — and a back office comparing two screens has no way to tell
 * which is right. The locale is a decision this application makes once.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** What a missing value renders as, everywhere. One em dash, not "N/A", not blank. */
export const EMPTY = '—';

/** @typedef {{ y: number, m: number, d: number }} CalendarDate */

const pad2 = (n) => String(n).padStart(2, '0');

/** Days in a month, 1-indexed, with February resolved against the actual year. */
function daysInMonth(y, m) {
  return [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    m - 1
  ];
}

/** Is this a real calendar date? 31 February is not, and neither is month 13. */
export function isValidDate(date) {
  if (!date) return false;
  const { y, m, d } = date;
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12) return false;
  return d >= 1 && d <= daysInMonth(y, m);
}

/**
 * Today, as a LOCAL calendar date.
 *
 * 🔴 The whole point of this function is the three lines it is not: `getFullYear`,
 * `getMonth` and `getDate` read the fields in the user's own zone, where
 * `toISOString().split('T')[0]` reads them in UTC and is a day out for two hours every
 * night in South Africa.
 */
export function today(now = new Date()) {
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

/**
 * Parse the four typed forms the approved date picker accepts (conventions §15):
 * `15 Jun 1988` · `15/06/1988` · `1988-06-15` · `19880615`. Plus `1988/06/15`, because it
 * is what this application STORES and a field must be able to read back what it wrote.
 *
 * Returns a `CalendarDate` or `null`. Never throws, never guesses: an ambiguous or
 * impossible input is `null`, and the caller says so in plain words under the field
 * rather than silently reverting — which is the mock's explicit contract.
 */
export function parseDate(input) {
  if (input == null) return null;
  if (typeof input === 'object') return isValidDate(input) ? input : null;

  const text = String(input).trim();
  if (!text) return null;

  let match;

  // 1988-06-15 or 1988/06/15 — year first, unambiguous.
  match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const date = { y: +match[1], m: +match[2], d: +match[3] };
    return isValidDate(date) ? date : null;
  }

  // 15/06/1988 or 15-06-1988 — day first, which is the South African convention and the
  // one the mock names. Deliberately NOT month-first: guessing between the two is how a
  // birth date silently becomes a different birth date.
  match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const date = { y: +match[3], m: +match[2], d: +match[1] };
    return isValidDate(date) ? date : null;
  }

  // 19880615 — eight digits, year first.
  match = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) {
    const date = { y: +match[1], m: +match[2], d: +match[3] };
    return isValidDate(date) ? date : null;
  }

  // 15 Jun 1988 / 15 June 1988 — the display form, read back.
  match = text.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (match) {
    const monthIndex = MONTHS.findIndex(
      (name) => name.toLowerCase() === match[2].slice(0, 3).toLowerCase(),
    );
    if (monthIndex === -1) return null;
    const date = { y: +match[3], m: monthIndex + 1, d: +match[1] };
    return isValidDate(date) ? date : null;
  }

  return null;
}

/**
 * The STORED and displayed form: `yyyy/mm/dd`. conventions §15.
 * Anything unparseable renders as the em dash rather than as the raw input, so a broken
 * value is visible as missing instead of leaking a timestamp into a table cell.
 */
export function formatDate(value) {
  const date = parseDate(value);
  if (!date) return EMPTY;
  return `${date.y}/${pad2(date.m)}/${pad2(date.d)}`;
}

/** The long form, for prose and for the picker's readout: `15 Jun 1988`. */
export function formatDateLong(value) {
  const date = parseDate(value);
  if (!date) return EMPTY;
  return `${pad2(date.d)} ${MONTHS[date.m - 1]} ${date.y}`;
}

/** `yyyy-mm-dd` — the wire form, for a request body. Never via `toISOString`. */
export function toWireDate(value) {
  const date = parseDate(value);
  if (!date) return '';
  return `${date.y}-${pad2(date.m)}-${pad2(date.d)}`;
}

/**
 * Whole years between two calendar dates — the picker's age readout.
 * Computed on the fields, so it is not off by one for anybody born after today's date in
 * the current year, and not off by a day for anyone near midnight.
 */
export function yearsBetween(from, to = today()) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end) return null;

  let years = end.y - start.y;
  if (end.m < start.m || (end.m === start.m && end.d < start.d)) years -= 1;
  return years;
}

/** Rands, always two decimals, always `en-ZA`. `null`/`undefined` render as the em dash. */
export function formatZar(value) {
  if (value == null || value === '') return EMPTY;
  const number = Number(value);
  if (!Number.isFinite(number)) return EMPTY;
  return `R ${number.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Counts and quantities, `en-ZA` grouping. */
export function formatInt(value) {
  if (value == null || value === '') return EMPTY;
  const number = Number(value);
  if (!Number.isFinite(number)) return EMPTY;
  return number.toLocaleString('en-ZA');
}

/**
 * The one place "there is nothing here" is rendered.
 *
 * 🔑 It handles the empty ARRAY as well as the empty string, because
 * `[].join(', ')` is `''` and an empty cell reads as a bug rather than as "none".
 */
export function dash(value) {
  if (value === '' || value == null) return EMPTY;
  if (Array.isArray(value)) return value.length === 0 ? EMPTY : value.join(', ');
  return String(value);
}
