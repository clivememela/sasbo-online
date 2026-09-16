/**
 * THE STATE-GATED SURFACES `surfaces.mjs` DRIVES, AND THE GUARD THAT HOLDS THE LIST AGAINST THE SOURCE. `07.2`.
 *
 * Its own module so the suite can hold the catalogue against `src/` on every run
 * (`src/test/stateGatedSurfaces.structural.test.js`) without launching a browser; the browser run is `surfaces.mjs`.
 * A dialog added tomorrow is a red suite tomorrow, not a surface nobody opened.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { BOUNDARY_SHOWN, clickByText, dialogNamed, mouseDownOn, scrollIntoView, typeInto, typeIntoLabelled } from './probe.mjs';

/* ── predicates ──────────────────────────────────────────────────────────────────────────────────── */

export const ROWS = `document.querySelectorAll('tr[data-row]').length > 1`;
export const HEADING = `!!document.querySelector('main h1')`;
/**
 * Visible text, case-insensitively. `innerText` is the text AS RENDERED, so a heading styled uppercase reads
 * "SASBO STRUCTURES" and an exact match on "SASBO structures" never held (record-structures' first run). Still
 * `innerText`, never `textContent`: text that is hidden must not count as present.
 */
const TEXT = (s) => `document.body.innerText.toLowerCase().includes(${JSON.stringify(s.toLowerCase())})`;
const STATE = (s) => `!!document.querySelector('[data-state="${s}"]')`;
const PANEL = '[data-testid="member-panel"]';
const PANEL_OPEN = `!!document.querySelector('${PANEL}[data-open="true"] .mcard')`;
export const ANY_DIALOG = `!!document.querySelector('[role="dialog"]')`;
/** The date field says it is open AND a picker is on screen -- the field's own `aria-expanded`, not a guess. */
/**
 * A date picker OPEN, AND ON SCREEN. "Open" alone once passed a calendar placed below the bottom of the viewport: Add
 * Recruiter's Election Date sits below the fold of the dialog's scrolling body, the calendar opened under it, and the
 * sweep photographed a dialog with no calendar in it -- a surface "reached" and never seen. The whole panel must lie
 * inside the viewport.
 */
const DATE_PICKER_OPEN = `!!document.querySelector('[aria-haspopup="dialog"][aria-expanded="true"]') && [...document.querySelectorAll('[role="dialog"][aria-modal]')].some((d) => {
  const r = d.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
})`;
const BANNER = (offline, copy) => `!!document.querySelector('[data-testid="offline-banner"][data-offline="${offline}"]') && ${TEXT(copy)}`;
const EXPANDED = (scope) => `!!document.querySelector(${JSON.stringify(`${scope} [aria-expanded="true"]`)})`;

/* ── drivers used here only ─────────────────────────────────────────────────────────────────────── */

/** Answer Yes in the Yes/No fieldset whose legend matches (Recruiters' `YesNo`). */
const answerYes = (legend) => `(() => {
  const re = ${legend};
  const set = [...document.querySelectorAll('fieldset')].find((f) => re.test(f.querySelector('legend')?.textContent || ''));
  const yes = set && [...set.querySelectorAll('button')].find((b) => /^Yes$/.test(b.textContent.trim()));
  if (!yes) return false;
  yes.click();
  return true;
})()`;

/** Choose a value in the native select whose label matches, inside a scope, the way React hears it. */
const chooseOption = (scope, labelPattern, value) => `(() => {
  const re = ${labelPattern};
  const scope = ${JSON.stringify(scope)};
  const select = [...document.querySelectorAll(scope + ' select')].find((s) => re.test(s.labels?.[0]?.textContent || s.getAttribute('aria-label') || ''));
  if (!select) return false;
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, ${JSON.stringify(value)});
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`;

/** Click the n-th element matching a selector, and say whether it existed. */
const clickNth = (selector, n) => `(() => {
  const el = document.querySelectorAll(${JSON.stringify(selector)})[${n}];
  if (!el) return false;
  el.click();
  return true;
})()`;

export const step = (what, run, until) => ({ what, run, until });
/** Bring a dialog's date field into view before it is opened, as a person scrolls to a field before pressing it. */
const DIALOG_DATE_IN_VIEW = step('bring Election Date into view', scrollIntoView('[role="dialog"] input[aria-haspopup="dialog"]'), `(() => {
  const r = document.querySelector('[role="dialog"] input[aria-haspopup="dialog"]').getBoundingClientRect();
  return r.top >= 0 && r.bottom <= innerHeight;
})()`);
/** A step that is a CDP call rather than a page expression (the network's condition). */
const network = (what, offline, until) => ({ what, network: offline, until });

const OPEN_FIRST_MEMBER = step('open the first member', clickByText('[data-row-action]', '/open the record for/i'), PANEL_OPEN);
/**
 * A member whose record can be SAVED. The stub's first member is flagged BEC with no primary committee, so its edit stops
 * at the app's own validation ("Please select an active primary BEC Committee") before any confirmation can ask -- a
 * fact about the synthetic data, not a defect. The second is neither BEC nor COSATU.
 */
const OPEN_EDITABLE_MEMBER = step('open a member whose record validates', clickNth('[data-row-action]', 1), PANEL_OPEN);
const EDIT_RECORD = step('edit the record', clickByText(`${PANEL} button`, '/^Edit Member$/'), TEXT('Save changes'));
const CHANGE_PHONE = step('change the cellphone number', typeIntoLabelled(PANEL, '/^Cellphone Number/', '0829990001'));
export const OPEN_CHANNEL = step('open the first channel', clickByText('button', '/show the members recruited/i'), ANY_DIALOG);
const IN_DIALOG = '[role="dialog"] button';

/* ── the catalogue ───────────────────────────────────────────────────────────────────────────────── */

/**
 * `covers` names the source sites a surface drives, as `<path under src>#<kind>@<which>`. The guard counts distinct
 * `@which` per `path#kind` against the sites in the source. `widths` narrows a surface that only exists at one.
 */
export const SURFACES = [
  // ── the register (A27's class) ────────────────────────────────────────────────────────────────
  { name: 'members-more-criteria', route: '/members', ready: ROWS,
    steps: [step('open More criteria', clickByText('main button', '/More criteria/'), EXPANDED('main'))],
    present: { EXPANDED: EXPANDED('main') }, covers: ['pages/members/Members.jsx#aria-expanded@more criteria'] },
  { name: 'members-error', route: '/members', intercept: { url: '*/api/members', mode: 'fail' },
    ready: TEXT('The register could not be reached'),
    present: { ERROR: TEXT('The register could not be reached'), BANNER: BANNER('true', 'could not reach its server') },
    covers: ['components/table/Table.jsx#DataState@error', 'components/common/OfflineBanner.jsx#banner@unreachable'] },
  { name: 'members-empty', route: '/members', intercept: { url: '*/api/members', mode: 'empty' },
    ready: TEXT('No members match these criteria'), present: { EMPTY: STATE('empty') },
    covers: ['components/table/Table.jsx#DataState@empty'] },
  { name: 'members-loading', route: '/members', intercept: { url: '*/api/members', mode: 'hang' },
    ready: `!!document.querySelector('tbody[aria-busy="true"] tr[data-skeleton]')`,
    present: { SKELETON: `!!document.querySelector('tr[data-skeleton]')` }, covers: ['components/table/Table.jsx#DataState@loading'] },
  { name: 'members-partial', route: '/members', intercept: { url: '*/api/banks', mode: 'fail' },
    ready: `${ROWS} && ${TEXT('Some option lists are missing.')}`,
    present: { PARTIAL: TEXT('Some option lists are missing.'), SELECT_FAILED: TEXT('could not be loaded.') },
    covers: ['pages/members/Members.jsx#DataState@refs', 'components/form/LoadFailureFrame.jsx#DataState@loadError'] },

  // ── the record ────────────────────────────────────────────────────────────────────────────────
  { name: 'record-open', route: '/members', ready: ROWS, steps: [OPEN_FIRST_MEMBER], present: { PANEL_OPEN } },
  { name: 'record-structures', route: '/members', ready: ROWS,
    steps: [OPEN_FIRST_MEMBER, step('open Structures', clickByText(`${PANEL} button`, '/Structures/i'), TEXT('SASBO structures'))],
    present: { TAB: TEXT('SASBO structures') } },
  { name: 'record-edit', route: '/members', ready: ROWS, steps: [OPEN_FIRST_MEMBER, EDIT_RECORD], present: { EDITING: TEXT('Save changes') } },
  { name: 'record-save-confirm', route: '/members', ready: ROWS,
    steps: [OPEN_EDITABLE_MEMBER, EDIT_RECORD, CHANGE_PHONE,
      step('save', clickByText(`${PANEL} button`, '/Save changes$/'), dialogNamed('/^Save these changes\\?$/'))],
    present: { DIALOG: dialogNamed('/^Save these changes\\?$/') }, covers: ['pages/members/Members.jsx#ConfirmDialog@save'] },
  { name: 'record-discard-confirm', route: '/members', ready: ROWS,
    steps: [OPEN_EDITABLE_MEMBER, EDIT_RECORD, CHANGE_PHONE,
      step('close the record', clickByText(`${PANEL} button`, '/^Close member details$/'), dialogNamed('/^Discard your changes\\?$/'))],
    present: { DIALOG: dialogNamed('/^Discard your changes\\?$/') }, covers: ['pages/members/Members.jsx#ConfirmDialog@discard'] },
  { name: 'record-date-of-birth', route: '/members', ready: ROWS,
    // For an I.D. Number the date of birth is COMPUTED from the number and shown read-only (Members.jsx), so the picker
    // exists only for another identity type -- and every stub member holds an I.D. Number. The step makes it a passport.
    steps: [OPEN_EDITABLE_MEMBER, EDIT_RECORD,
      step('make the identity a passport', chooseOption(PANEL, '/^Identity Type/', 'Passport Number'), `!!document.querySelector('${PANEL} input[aria-haspopup="dialog"]')`),
      step('open Date of Birth', mouseDownOn(`${PANEL} input[aria-haspopup="dialog"]`, '/^Date of Birth/'), DATE_PICKER_OPEN)],
    present: { DATE_PICKER_OPEN }, covers: ['pages/members/Members.jsx#DateField@Date of Birth', 'components/form/DateField.jsx#aria-expanded@field'] },
  { name: 'record-shop-steward-date', route: '/members', ready: ROWS,
    steps: [OPEN_FIRST_MEMBER, EDIT_RECORD,
      step('open Structures', clickByText(`${PANEL} button`, '/Structures/i'), TEXT('Shop Steward?')),
      step('answer Shop Steward: Yes', chooseOption(PANEL, '/Shop Steward\\?/', 'Yes'), `!!document.querySelector('${PANEL} input[aria-haspopup="dialog"]')`),
      step('open its election date', mouseDownOn(`${PANEL} input[aria-haspopup="dialog"]`, '/Shop Steward Election Date/'), DATE_PICKER_OPEN)],
    present: { DATE_PICKER_OPEN }, covers: ['pages/members/Members.jsx#DateField@Shop Steward Election Date'] },

  // ── Capture Member ────────────────────────────────────────────────────────────────────────────
  { name: 'capture-discard', route: '/members/capture', ready: TEXT('Save Member'),
    steps: [step('type a surname', typeIntoLabelled('main', '/^Surname/', 'Synthetic')),
      step('cancel', clickByText('main button', '/^Cancel$/'), dialogNamed('/^Discard this member\\?$/'))],
    present: { DIALOG: dialogNamed('/^Discard this member\\?$/') }, covers: ['pages/members/CaptureMember.jsx#ConfirmDialog@discard'] },
  { name: 'capture-refs-error', route: '/members/capture', intercept: { url: ['*/api/banks*', '*/api/job-grades*', '*/api/provinces*', '*/api/recruitment-channels*', '*/api/representatives*', '*/api/members/userRoles*', '*/api/members/structures/tree*', '*/api/branches*', '*/api/districts*', '*/api/areas*'], mode: 'fail' },
    ready: `${STATE('error')}`, present: { ERROR: STATE('error') },
    covers: ['pages/members/CaptureMember.jsx#DataState@refs', 'components/form/LoadFailureFrame.jsx#DataState@loadError'] },
  { name: 'capture-listbox', route: '/members/capture', ready: TEXT('Save Member'),
    // `SearchableSelect` opens on MOUSEDOWN (the whole field toggles it), and `el.click()` dispatches no mousedown (T30).
    // Its fields are on Employment & Bank; the first combobox on the default tab is the address search, a different control.
    // ENABLED, not merely present: the field is `disabled` while its bank list loads, and a mousedown on a disabled input
    // does nothing -- the third sweep's light rows raced that load and failed while its dark rows passed.
    steps: [step('open Employment & Bank', clickByText('main button', '/^Employment/'), `[...document.querySelectorAll('main [role="combobox"]')].some((c) => !c.disabled && /^Bank Where Employed/.test(c.labels?.[0]?.textContent || ''))`),
      step('open Bank Where Employed', mouseDownOn('main [role="combobox"]', '/^Bank Where Employed/'), `!!document.querySelector('[role="listbox"]')`)],
    present: { LISTBOX: `!!document.querySelector('[role="listbox"]')` }, covers: ['components/form/SearchableSelect.jsx#aria-expanded@listbox'] },

  // ── Recruiters ────────────────────────────────────────────────────────────────────────────────
  { name: 'recruiters-channel', route: '/recruiters', ready: ROWS, steps: [OPEN_CHANNEL], present: { DIALOG: ANY_DIALOG },
    covers: ['pages/members/Recruiters.jsx#Modal@channel'] },
  { name: 'recruiters-add-member', route: '/recruiters', ready: ROWS,
    steps: [OPEN_CHANNEL, step('Add Member', clickByText(IN_DIALOG, '/^Add Member$/'), dialogNamed('/^Add member to recruiter$/'))],
    present: { DIALOG: dialogNamed('/^Add member to recruiter$/') }, covers: ['pages/members/Recruiters.jsx#Modal@add member'] },
  { name: 'recruiters-member-details', route: '/recruiters', ready: ROWS,
    steps: [OPEN_CHANNEL, step('open a member', clickByText(IN_DIALOG, '/open the record for/i'), dialogNamed('/^Member details$/'))],
    present: { DIALOG: dialogNamed('/^Member details$/') }, covers: ['pages/members/Recruiters.jsx#Modal@member details'] },
  { name: 'recruiters-remove-member', route: '/recruiters', ready: ROWS,
    steps: [OPEN_CHANNEL, step('remove a member', clickByText(IN_DIALOG, '/from this recruiter$/'), dialogNamed('/^Remove this member from the recruiter\\?$/'))],
    present: { DIALOG: dialogNamed('/^Remove this member from the recruiter\\?$/') }, covers: ['pages/members/Recruiters.jsx#ConfirmDialog@remove member'] },
  { name: 'recruiters-remove-recruiter', route: '/recruiters', ready: ROWS,
    steps: [OPEN_CHANNEL, step('Remove recruiter', clickByText(IN_DIALOG, '/^Remove recruiter$/'), dialogNamed('/^Remove this recruiter\\?$/'))],
    present: { DIALOG: dialogNamed('/^Remove this recruiter\\?$/') }, covers: ['pages/members/Recruiters.jsx#ConfirmDialog@remove recruiter'] },
  { name: 'recruiters-recruiter-details-date', route: '/recruiters', ready: ROWS,
    steps: [OPEN_CHANNEL,
      step('view recruiter details', clickByText(IN_DIALOG, '/^View recruiter details$/'), dialogNamed('/^Recruiter details$/')),
      step('edit', clickByText(IN_DIALOG, '/^Edit$/'), `[...document.querySelectorAll('[role="dialog"] legend')].some((l) => /Elected Recruiter/.test(l.textContent))`),
      step('answer Elected Recruiter: Yes', answerYes('/Elected Recruiter/'), `!!document.querySelector('[role="dialog"] input[aria-haspopup="dialog"]')`),
      DIALOG_DATE_IN_VIEW,
      step('open Election Date', mouseDownOn('[role="dialog"] input[aria-haspopup="dialog"]', '/Election Date/'), DATE_PICKER_OPEN)],
    present: { DETAILS: dialogNamed('/^Recruiter details$/'), DATE_PICKER_OPEN },
    covers: ['pages/members/Recruiters.jsx#Modal@recruiter details', 'pages/members/Recruiters.jsx#DateField@recruiter details'] },
  { name: 'recruiters-add-recruiter-date', route: '/recruiters', ready: ROWS,
    // The recruiter's details -- Elected Recruiter among them -- render only once a member has been chosen (Recruiters.jsx).
    steps: [step('Add Recruiter', clickByText('main button', '/^Add Recruiter$/'), dialogNamed('/^Add Recruiter$/')),
      step('choose a member', clickByText('[role="dialog"] button', '/^Choose .* as the recruiter$/'), `[...document.querySelectorAll('[role="dialog"] legend')].some((l) => /Elected Recruiter/.test(l.textContent))`),
      step('answer Elected Recruiter: Yes', answerYes('/Elected Recruiter/'), `!!document.querySelector('[role="dialog"] input[aria-haspopup="dialog"]')`),
      DIALOG_DATE_IN_VIEW,
      step('open Election Date', mouseDownOn('[role="dialog"] input[aria-haspopup="dialog"]', '/Election Date/'), DATE_PICKER_OPEN)],
    present: { DIALOG: dialogNamed('/^Add Recruiter$/'), DATE_PICKER_OPEN },
    covers: ['pages/members/Recruiters.jsx#Modal@add recruiter', 'pages/members/Recruiters.jsx#DateField@add recruiter'] },
  { name: 'recruiters-refs-partial', route: '/recruiters', intercept: { url: '*/api/banks*', mode: 'fail' },
    ready: `${ROWS} && (${STATE('partial')} || ${STATE('error')})`, present: { NOTICE: `${STATE('partial')} || ${STATE('error')}` },
    covers: ['pages/members/Recruiters.jsx#DataState@refs'] },

  // ── maintenance ───────────────────────────────────────────────────────────────────────────────
  { name: 'channels-delete', route: '/admin/maintenance/recruitment-channel', ready: `!!document.querySelector('main table tbody tr button')`,
    steps: [step('delete the first', clickByText('main button', '/^Delete /'), dialogNamed('/^Delete recruiter type$/'))],
    present: { DIALOG: dialogNamed('/^Delete recruiter type$/') }, covers: ['pages/maintainance/RecruitmentChannel.jsx#ConfirmDialog@delete'] },
  { name: 'channels-add', route: '/admin/maintenance/recruitment-channel', ready: HEADING,
    steps: [step('Add a channel', clickByText('main button', '/Add a channel$/'), `!!document.querySelector('input[aria-label="New recruitment channel name"]')`)],
    present: { FORM: `!!document.querySelector('input[aria-label="New recruitment channel name"]')` } },
  { name: 'channels-rename', route: '/admin/maintenance/recruitment-channel', ready: `!!document.querySelector('main table tbody tr button')`,
    steps: [step('rename the first', clickByText('main button', '/^Rename /'), `!!document.querySelector('main input[aria-label^="Rename "]')`)],
    present: { FORM: `!!document.querySelector('main input[aria-label^="Rename "]')` } },
  { name: 'channels-loading', route: '/admin/maintenance/recruitment-channel', intercept: { url: '*/api/recruitment-channels*', mode: 'hang' },
    ready: STATE('loading'), present: { LOADING: STATE('loading') }, covers: ['pages/maintainance/RecruitmentChannel.jsx#DataState@loading'] },
  { name: 'channels-error', route: '/admin/maintenance/recruitment-channel', intercept: { url: '*/api/recruitment-channels*', mode: 'fail' },
    ready: TEXT('We could not load the recruiter types.'), present: { ERROR: STATE('error') }, covers: ['pages/maintainance/RecruitmentChannel.jsx#DataState@error'] },
  { name: 'channels-empty', route: '/admin/maintenance/recruitment-channel', intercept: { url: '*/api/recruitment-channels*', mode: 'empty' },
    ready: TEXT('No recruiter types found.'), present: { EMPTY: STATE('empty') }, covers: ['pages/maintainance/RecruitmentChannel.jsx#DataState@empty'] },
  { name: 'subscriptions-edit', route: '/admin/maintenance/subscriptions', ready: `document.querySelectorAll('tbody tr:not([data-skeleton])').length > 1`,
    steps: [step('edit the first', clickByText('main button', '/^Edit the subscription for/'), `!!document.querySelector('main input[aria-label^="Subscription amount for"]')`)],
    present: { EDITING: `!!document.querySelector('main input[aria-label^="Subscription amount for"]')` } },
  { name: 'subscriptions-loading', route: '/admin/maintenance/subscriptions', intercept: { url: '*/api/subscriptions*', mode: 'hang' },
    ready: TEXT('Retrieving subscriptions…'), present: { LOADING: STATE('loading') }, covers: ['pages/maintainance/Subscriptions.jsx#DataState@loading'] },
  { name: 'subscriptions-error', route: '/admin/maintenance/subscriptions', intercept: { url: '*/api/subscriptions*', mode: 'fail' },
    ready: STATE('error'), present: { ERROR: STATE('error') }, covers: ['pages/maintainance/Subscriptions.jsx#DataState@list error'] },
  { name: 'subscriptions-refs-error', route: '/admin/maintenance/subscriptions', intercept: { url: '*/api/banks*', mode: 'fail' },
    ready: STATE('error'), present: { ERROR: STATE('error') }, covers: ['pages/maintainance/Subscriptions.jsx#DataState@refs error'] },

  // ── banks ─────────────────────────────────────────────────────────────────────────────────────
  { name: 'bank-details', route: '/banks', ready: ROWS,
    steps: [step('open a branch', clickByText('main button', '/open the .* record$/'), dialogNamed('/^Bank Details$/'))],
    present: { DIALOG: dialogNamed('/^Bank Details$/') },
    covers: ['pages/bank_branch/BankBranch.jsx#BankBranchModal@selected', 'pages/bank_branch/BankBranchModal.jsx#Modal@read'] },
  { name: 'bank-edit', route: '/banks', ready: ROWS,
    steps: [step('open a branch', clickByText('main button', '/open the .* record$/'), dialogNamed('/^Bank Details$/')),
      step('edit', clickByText(IN_DIALOG, '/^Edit$/'), dialogNamed('/^Edit Bank\\/Branch Details$/'))],
    present: { DIALOG: dialogNamed('/^Edit Bank\\/Branch Details$/') }, covers: ['pages/bank_branch/BankBranchModal.jsx#Modal@edit'] },
  { name: 'bank-add', route: '/banks', ready: HEADING,
    steps: [step('Add Bank / Branch', clickByText('main button', '/Add Bank \\/ Branch$/'), dialogNamed('/^Add Bank\\/Branch Details$/'))],
    present: { DIALOG: dialogNamed('/^Add Bank\\/Branch Details$/') },
    covers: ['pages/bank_branch/BankBranch.jsx#BankBranchModal@add', 'pages/bank_branch/BankBranchModal.jsx#Modal@add'] },
  { name: 'bank-row-details', route: '/banks', widths: [390], ready: ROWS,
    steps: [step('show a row\'s details', clickByText('main button', '/^Show details$/'), EXPANDED('main'))],
    present: { EXPANDED: EXPANDED('main') }, covers: ['components/table/Table.jsx#aria-expanded@row details'] },
  { name: 'bank-listing-partial', route: '/banks/listing', intercept: { url: '*/api/banks', mode: 'fail' },
    ready: STATE('partial'), present: { PARTIAL: STATE('partial') }, covers: ['pages/bank_branch/BankListing.jsx#DataState@partial'] },

  // ── ACB ───────────────────────────────────────────────────────────────────────────────────────
  { name: 'acb-edit-banking', route: '/admin/acb/debits', ready: `!!document.querySelector('main input')`,
    steps: [step('type a surname', typeInto('main input', 'Nkosi')),
      step('search', clickByText('main button', '/^Search$/'), ROWS),
      step('load a member', clickByText('main button', '/load banking details for/'), TEXT('Confirm Details')),
      step('Edit Details', clickByText('main button', '/^Edit Details$/'), dialogNamed('/^Update Banking Details$/'))],
    present: { DIALOG: dialogNamed('/^Update Banking Details$/') }, covers: ['pages/acb/AcbDebits.jsx#Modal@update banking'] },

  // ── reports and archives ──────────────────────────────────────────────────────────────────────
  { name: 'organiser-date', route: '/reports/organizer-report', ready: `!!document.querySelector('input[aria-haspopup="dialog"]')`,
    steps: [step('open a date field', mouseDownOn('input[aria-haspopup="dialog"]', '/date/i'), DATE_PICKER_OPEN)],
    present: { DATE_PICKER_OPEN }, covers: ['pages/reports/OrganizerReport.jsx#DateField@date'] },
  { name: 'organiser-date-months', route: '/reports/organizer-report', ready: `!!document.querySelector('input[aria-haspopup="dialog"]')`,
    steps: [step('open a date field', mouseDownOn('input[aria-haspopup="dialog"]', '/date/i'), DATE_PICKER_OPEN),
      step('show the months', clickNth('[role="dialog"][aria-modal] button[aria-expanded]', 0), `!!document.querySelector('[role="dialog"][aria-modal] button[aria-expanded="true"]')`)],
    present: { VIEW: `!!document.querySelector('[role="dialog"][aria-modal] button[aria-expanded="true"]')` }, covers: ['components/form/DateField.jsx#aria-expanded@months'] },
  { name: 'organiser-date-years', route: '/reports/organizer-report', ready: `!!document.querySelector('input[aria-haspopup="dialog"]')`,
    steps: [step('open a date field', mouseDownOn('input[aria-haspopup="dialog"]', '/date/i'), DATE_PICKER_OPEN),
      step('show the years', clickNth('[role="dialog"][aria-modal] button[aria-expanded]', 1), `!!document.querySelector('[role="dialog"][aria-modal] button[aria-expanded="true"]')`)],
    present: { VIEW: `!!document.querySelector('[role="dialog"][aria-modal] button[aria-expanded="true"]')` }, covers: ['components/form/DateField.jsx#aria-expanded@years'] },
  { name: 'locations-results', route: '/reports/locations', ready: HEADING,
    steps: [step('search', clickByText('main button', '/^Search$/'), `!!document.querySelector('main table tbody tr')`)], present: { ROWS: `!!document.querySelector('main table tbody tr')` } },
  { name: 'locations-loading', route: '/reports/locations', intercept: { url: '*/api/branches*', mode: 'hang' }, ready: HEADING,
    steps: [step('search', clickByText('main button', '/^Search$/'), TEXT('Searching locations…'))], present: { LOADING: STATE('loading') },
    covers: ['pages/reports/Locations.jsx#DataState@loading'] },
  { name: 'locations-error', route: '/reports/locations', intercept: { url: '*/api/branches*', mode: 'fail' }, ready: HEADING,
    steps: [step('search', clickByText('main button', '/^Search$/'), TEXT('We could not run that search.'))], present: { ERROR: STATE('error') },
    covers: ['pages/reports/Locations.jsx#DataState@error'] },
  { name: 'locations-empty', route: '/reports/locations', intercept: { url: '*/api/branches*', mode: 'empty' }, ready: HEADING,
    steps: [step('search', clickByText('main button', '/^Search$/'), STATE('empty'))], present: { EMPTY: STATE('empty') },
    covers: ['pages/reports/Locations.jsx#DataState@empty'] },
  ...[
    ['finance-houses', '/archives/finance-houses', 'pages/archives/FinanceHouses.jsx'],
    ['research', '/archives/research-information', 'pages/archives/ResearchInformation.jsx'],
    ['affiliations', '/archives/affiliations-other-trade-unions', 'pages/archives/AffiliationsOtherTradeUnions.jsx'],
  ].flatMap(([slug, route, file]) => [
    { name: `${slug}-folder`, route, ready: `!!document.querySelector('main button[aria-expanded="false"]')`,
      steps: [step('open the first folder', clickNth('main button[aria-expanded="false"]', 0), EXPANDED('main'))],
      present: { EXPANDED: EXPANDED('main') }, covers: [`${file}#aria-expanded@folder`] },
    { name: `${slug}-empty`, route, ready: HEADING,
      steps: [step('search for nothing', typeIntoLabelled('main', '/^Search/', 'zz-no-such-document'), STATE('empty'))],
      present: { EMPTY: STATE('empty') }, covers: ['components/archives/ArchiveEmpty.jsx#DataState@empty'] },
  ]),
  { name: 'finance-houses-category', route: '/archives/finance-houses', ready: `!!document.querySelector('main button[aria-expanded="false"]')`,
    steps: [step('open the first bank', clickNth('main button[aria-expanded="false"]', 0), EXPANDED('main')),
      step('open its first category', clickNth('main [aria-expanded="true"] ~ * button[aria-expanded="false"], main li button[aria-expanded="false"]', 0), `document.querySelectorAll('main [aria-expanded="true"]').length > 1`)],
    present: { NESTED: `document.querySelectorAll('main [aria-expanded="true"]').length > 1` }, covers: ['pages/archives/FinanceHouses.jsx#aria-expanded@category'] },
  { name: 'forms-empty', route: '/reports/forms', ready: HEADING,
    steps: [step('filter to nothing', typeIntoLabelled('main', '/^Random access number/', '000000000'), STATE('empty'))],
    present: { EMPTY: STATE('empty') }, covers: ['pages/forms/Forms.jsx#DataState@empty'] },

  // ── the shell ─────────────────────────────────────────────────────────────────────────────────
  { name: 'shell-drawer', route: '/home', widths: [390], ready: HEADING,
    steps: [step('open the navigation', clickByText('header button', '/^Open navigation menu$/'), EXPANDED('header'))],
    present: { EXPANDED: EXPANDED('header') }, covers: ['components/Header.jsx#aria-expanded@drawer'] },
  { name: 'shell-section', route: '/home', widths: [1440], ready: HEADING,
    steps: [step('open a rail section', clickNth('nav[aria-label="Main"] button[aria-expanded="false"]', 0), EXPANDED('nav[aria-label="Main"]'))],
    present: { EXPANDED: EXPANDED('nav[aria-label="Main"]') }, covers: ['components/common/SidebarItem.jsx#aria-expanded@section'] },
  { name: 'shell-offline', route: '/members', ready: ROWS,
    steps: [network('go offline', true, BANNER('true', 'You are offline.'))],
    present: { BANNER: BANNER('true', 'You are offline.') }, covers: ['components/common/OfflineBanner.jsx#banner@offline'] },
  { name: 'shell-back-online', route: '/members', ready: ROWS,
    steps: [network('go offline', true, BANNER('true', 'You are offline.')), network('come back', false, TEXT('The connection is back.'))],
    present: { BANNER: TEXT('The connection is back.') }, covers: ['components/common/OfflineBanner.jsx#banner@back'] },
  { name: 'route-boundary', route: '/members', intercept: { url: '*/assets/Members-*.js', mode: 'fail' },
    ready: BOUNDARY_SHOWN, present: { BOUNDARY: BOUNDARY_SHOWN } },
];

/**
 * Sites no person can reach, named with the reason -- counted by the guard, never driven, and printed in every run so
 * the reason is re-read rather than remembered.
 */
export const UNREACHABLE = [
  { site: 'pages/members/CaptureMember.jsx#DateField@Election Date',
    why: 'behind `form.electedRep === "Y"`, and nothing on the form sets `electedRep` since main removed its question (F-P48)' },
  { site: 'pages/members/CaptureMember.jsx#DateField@Date Joined',
    why: 'rendered `disabled` -- a date nobody can open' },
  { site: 'components/form/AddressAutocomplete.jsx#aria-expanded@suggestions',
    why: 'its suggestions come from Google Places; the stub cannot answer Google and a measurement sends nothing to it (R-SEC-H)' },
];

/* ── the guard: the catalogue against the source ─────────────────────────────────────────────────── */

const SITE_KINDS = [
  { kind: 'Modal', re: /<Modal\b/g, skip: ['components/overlay/Modal.jsx'] },
  { kind: 'ConfirmDialog', re: /<ConfirmDialog\b/g, skip: ['components/overlay/Modal.jsx'] },
  { kind: 'BankBranchModal', re: /<BankBranchModal\b/g, skip: [] },
  { kind: 'DataState', re: /<DataState\b/g, skip: ['components/common/DataState.jsx'] },
  { kind: 'DateField', re: /<DateField\b/g, skip: [] },
  // The ATTRIBUTE, not the attribute selector: `[aria-expanded="true"]` in a query names no control (Modal.jsx, R2-F1).
  { kind: 'aria-expanded', re: /(?<!\[)aria-expanded=/g, skip: [] },
];

/** How many sites of one kind a source text holds. Exported so the guard's own patterns carry canaries. */
export const siteCount = (text, kind) => (text.match(SITE_KINDS.find((k) => k.kind === kind).re) || []).length;

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});

/** Returns complaints; empty means every state-gated site in `src/` is driven or excused. */
export function coverageComplaints(surfaces = SURFACES, unreachable = UNREACHABLE) {
  const sources = new Map();
  for (const path of walk('src').filter((p) => /\.jsx$/.test(p) && !/\.test\.jsx$/.test(p))) {
    const file = relative('src', path).replaceAll('\\', '/');
    const text = readFileSync(path, 'utf8');
    for (const { kind, skip } of SITE_KINDS) {
      if (skip.includes(file)) continue;
      const count = siteCount(text, kind);
      if (count) sources.set(`${file}#${kind}`, count);
    }
  }
  const total = [...sources.values()].reduce((a, b) => a + b, 0);
  // The lowest honest reading at `8d01904` was 55 sites; far under it, the scan is not seeing the source.
  if (total < 40) return [`read only ${total} state-gated sites under src/ -- the scan is not seeing the source`];

  const claimed = new Map();
  for (const site of [...surfaces.flatMap((s) => s.covers ?? []), ...unreachable.map((u) => u.site)]) {
    const [key, which] = site.split('@');
    if (!claimed.has(key)) claimed.set(key, new Set());
    claimed.get(key).add(which);
  }
  const complaints = [];
  for (const [key, count] of [...sources].sort()) {
    const named = claimed.get(key)?.size ?? 0;
    if (named < count) complaints.push(`${key}: ${count} site(s) in the source, ${named} driven or excused -- a surface nobody drives`);
  }
  for (const key of claimed.keys()) {
    // The banner is counted by its states, not by JSX sites.
    if (!sources.has(key) && !key.endsWith('#banner')) complaints.push(`${key} is claimed and no longer exists in the source -- drop the claim`);
  }
  return complaints;
}

