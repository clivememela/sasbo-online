/**
 * WHAT MAY BE TYPED, AND WHAT MAY BE SAVED — one rule, one place.
 *
 * Two different questions, deliberately kept apart:
 *
 *   `sanitiseField`  runs on EVERY KEYSTROKE and decides what a field will accept at
 *                    all. A letter typed into Work Tel never appears.
 *   `validateField`  runs on SUBMIT and decides whether what is there is usable. It
 *                    can say "too short", which a keystroke filter cannot.
 *
 * 🔴 WHY THIS IS A MODULE AND NOT `if (field === …)` INSIDE EACH SCREEN.
 * Capture Member and Edit Member hold the SAME member. A rule that lives in both
 * `handleChange` and `handleEditChange` is two copies that drift — and this project
 * has four registered defects that are exactly that (`A6`, `A7`, `A17`, `A9`), plus a
 * fifth found this week where `applyIdentityNumberChange` already differed between the
 * two screens on a type change. The rules are here; both screens call them.
 *
 * ═══ 🔴 NAMES ARE NOT `[A-Za-z]`, AND GETTING THIS WRONG REJECTS REAL PEOPLE ═══
 *
 * South African names routinely carry things a naive letters-only filter destroys:
 *
 *   de Villiers · van der Merwe   spaces and lowercase particles
 *   O'Brien · N'wamitwa           apostrophes, straight AND typographic
 *   Smit-Nel · Anderson-Bekker    hyphens
 *   Müller · Naudé · Nkosikhona   diacritics — Afrikaans ê ë ô, and more besides
 *
 * So the name rules use the Unicode letter property `\p{L}`, not `A-Z`. A filter that
 * strips `é` tells a member their name is invalid; that is a worse defect than any
 * this file prevents, and it fails silently because the character simply never
 * appears as they type.
 */

import { validateEmail } from './validateSAID.js';
import { compareDates, parseDate, today, yearsBetween } from '../lib/format.js';

/** Digits, and the punctuation a South African phone number is written with. */
const PHONE_ALLOWED = /[^0-9+()\-\s]/g;

/** Unicode letters plus the joiners real names use. NOT `A-Za-z`. */
const NAME_DISALLOWED = /[^\p{L}\s'’.-]/gu;

/** Initials: letters and the separators people write them with. No digits. */
const INITIALS_DISALLOWED = /[^\p{L}\s.-]/gu;

/** An employee number is a reference, not a word: letters, digits, dash, slash. */
const EMPLOYEE_NO_DISALLOWED = /[^\p{L}0-9\-/]/gu;

const DIGITS_ONLY = /\D/g;

/** How many digits a value really carries, ignoring how it is punctuated. */
export const digitCount = (value) => String(value ?? '').replace(DIGITS_ONLY, '').length;

/**
 * Trim a value to what its field will accept, as it is typed.
 *
 * @param field the form key, e.g. `workTel`
 * @param value the raw value from the input
 * @param context `{ identityType }` — the identity field's rule depends on it
 * @returns the value to store; unchanged for any field with no typing rule
 */
export function sanitiseField(field, value, context = {}) {
    const raw = String(value ?? '');

    switch (field) {
        // ── Digits only. These are identifiers; nothing else can appear in them.
        case 'bankAccountNumber':
        case 'ibtNo':
        case 'employerCode':
            return raw.replace(DIGITS_ONLY, '');

        // ── Phone numbers keep their punctuation: the seed writes "+27 82 100 0001",
        //    and stripping the "+" would change the number's meaning, not tidy it.
        case 'phone':
        case 'workTel':
        case 'homeTel':
        case 'fax':
            return raw.replace(PHONE_ALLOWED, '');

        case 'initials':
            return raw.replace(INITIALS_DISALLOWED, '');

        case 'firstNames':
        case 'surname':
            return raw.replace(NAME_DISALLOWED, '');

        case 'employeeNumber':
            return raw.replace(EMPLOYEE_NO_DISALLOWED, '');

        // ── The identity field is two fields wearing one label.
        case 'identityNumber': {
            const isSaId = context.identityType && /I\.?D\.?/i.test(context.identityType);
            if (!isSaId) return raw;          // a passport is alphanumeric, and short
            return raw.replace(DIGITS_ONLY, '').slice(0, 13);
        }

        default:
            return raw;
    }
}

/**
 * Whether a filled-in value is usable. Returns a message, or `null` when it is fine.
 *
 * ⚠️ EMPTINESS IS NOT THIS FUNCTION'S JOB. Which fields are REQUIRED depends on the
 * screen and on other answers — a bank account number is required for a debit order
 * and meaningless for payroll — so requiredness stays with the screen that knows.
 * This answers only: given that something was entered, is it the right shape?
 */
export function validateField(field, value, context = {}) {
    // A date arrives from the API as [y, m, d]; String() would flatten it to "y,m,d".
    if (field === 'dateOfBirth' && Array.isArray(value)) return validateDateOfBirth(value);
    const raw = String(value ?? '').trim();
    if (raw === '') return null;

    switch (field) {
        case 'bankAccountNumber': {
            const n = digitCount(raw);
            // South African account numbers run from six digits (older building
            // society accounts) to eleven. Thirteen is the widest any local bank
            // issues, so outside 6-13 is a typo rather than an unusual bank.
            if (n < 6) return 'Bank Account Number looks too short — it should be 6 to 13 digits';
            if (n > 13) return 'Bank Account Number looks too long — it should be 6 to 13 digits';
            return null;
        }

        case 'phone':
        case 'workTel':
        case 'homeTel': {
            const n = digitCount(raw);
            // 9 digits is a national number without its leading 0 (821000001);
            // 15 is the E.164 ceiling, which "+27 82 100 0001" sits inside.
            if (n < 9) return 'This number looks too short — include the area or network code';
            if (n > 15) return 'This number looks too long';
            return null;
        }

        case 'initials':
            if (raw.replace(/[^\p{L}]/gu, '').length > 6) {
                return 'Initials look too long — six letters at most';
            }
            return null;

        case 'ibtNo':
            // Six digits is a South African branch code. Leading zeros are REAL and
            // are why this field is text: 152 of the 152 seeded values start with one.
            if (digitCount(raw) > 6) return 'IBT No. is at most 6 digits';
            return null;

        case 'identityNumber': {
            const isSaId = context.identityType && /I\.?D\.?/i.test(context.identityType);
            if (isSaId && digitCount(raw) !== 13) {
                return 'Identity Number must be exactly 13 digits when I.D. Number is selected';
            }
            return null;
        }

        // 🔴 Validated at SUBMIT, not only as it is typed. Both screens already check
        // an email on change -- but a member LOADED into Edit Member with a bad address
        // already stored fires no change event, so saving them unchanged never
        // challenged it. Editing is exactly where such a record surfaces.
        //
        // 🔑 The rule itself is `validateEmail`'s, imported rather than rewritten: a
        // second email regex beside the first is how A6, A7, A17 and A9 all happened.
        case 'personalEmail':
        case 'workEmail':
            return validateEmail(raw);

        // 🔴 A date of birth had NO bound of any kind. The field is `type="date"` for a
        // passport holder, which stops "hello" but not the year 1066 or next Tuesday --
        // and it is REQUIRED for passport holders, so it is a value somebody must type
        // by hand rather than one derived from an ID number.
        case 'dateOfBirth':
            return validateDateOfBirth(raw);

        default:
            return null;
    }
}

/**
 * Date of Birth: a real date, not in the future, 16 to 120 years ago.
 *
 * 🔴 Read with `lib/format.js`, never `new Date(raw)`: that parses an ISO date as
 * midnight UTC (main's R-ROB-N), reads Jackson's `[y, m, d]` as the string "y,m,d",
 * and cannot read the picker's day-first forms at all.
 */
function validateDateOfBirth(value) {
    const born = parseDate(value);
    if (!born) return 'Date of Birth is not a real date';
    const now = today();
    if (compareDates(born, now) > 0) return 'Date of Birth cannot be in the future';
    const years = yearsBetween(born, now);
    // 16 is the floor for employment in South Africa, so a member younger than that is
    // a typo. 120 is a plausibility ceiling, not a rule about people.
    if (years < 16) return 'Date of Birth makes this member under 16 — please check it';
    if (years > 120) return 'Date of Birth looks too far in the past — please check it';
    return null;
}

/** Every field this module has a typing rule for — used by the screens' tests. */
export const SANITISED_FIELDS = Object.freeze([
    'bankAccountNumber', 'ibtNo', 'employerCode',
    'phone', 'workTel', 'homeTel', 'fax',
    'initials', 'firstNames', 'surname', 'employeeNumber', 'identityNumber',
]);
