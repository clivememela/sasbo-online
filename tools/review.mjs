/**
 * THE FINISH REVIEW'S CAPTURES, TAKEN IN A STATE THAT IS ASSERTED. `06.3`.
 *
 * `impeccable-finish-reviewer` has no browser. It judges the build from these files, and its first
 * check refuses a review built on a capture that is blank, mid-load or of the wrong state -- so a
 * shot here is not "navigate, wait, shoot". Each one is:
 *
 *   ① taken at the viewport it names, and the viewport is MEASURED before the shutter (T14, T25);
 *   ② in the theme it names, written BEFORE the navigation and read back off the painted ground
 *      (`storeTheme` / `themeReadout`, probe.mjs);
 *   ③ ready by `pageReady` AND by a condition of its own page -- real rows, never skeletons;
 *   ④ driven by steps that each report whether they landed, and a step that did not FAILS the
 *      shot instead of photographing the page it was already on;
 *   ⑤ SETTLED before the shutter: fonts, every visible image decoded (`complete` is metadata,
 *      not pixels), and no finite animation or transition still running -- the card's landing is
 *      580ms and its sweep ends at 1.35s, and a capture inside them reviews a frame nobody sees;
 *   ⑥ checked AFTER it settles for the thing its name claims. "The record is open" is a
 *      predicate on the panel, not a filename.
 *
 * 🔑 THE REGISTER'S FAILURE, EMPTINESS, LOADING AND PARTIAL STATES ARE REACHED BY INTERCEPTING
 * THE REQUEST IN THE BROWSER. The stub server answers every path the same way every time, and
 * those four are the states A27 and EH-D9 are about.
 *
 * ⚠️ SYNTHETIC DATA ONLY (R-SEC-H). The output directory syncs through OneDrive, so this runs
 * against `serve-dist.mjs`, never against a backend holding members.
 *
 *   node tools/review.mjs <baseUrl> <outDir> [--only members-open-desk,login-laptop]
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { launch } from './cdp.mjs';
import {
  SETTLED, clickByText, mouseDownOn, overflowProbe, pageReady, populationComplaints, storeTheme,
  themeDimensionComplaints, themeReadout,
} from './probe.mjs';

const args = process.argv.slice(2);
const [baseUrl, outDir] = args;
if (!baseUrl || !outDir || baseUrl.startsWith('--')) {
  console.error('usage: node tools/review.mjs <baseUrl> <outDir> [--only name,name]');
  process.exit(2);
}
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));

/**
 * The viewports. `laptop` is the owner's own screen -- a 150%-scaled panel is 1280 × 661 CSS
 * pixels once the browser's chrome is off it -- and it is the screen the rulings were made on.
 */
const VIEWPORTS = {
  desk: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
  laptop: { width: 1280, height: 661 },
};
const BOTH = ['light', 'dark'];
const LIGHT = ['light'];

/* ── what a page is ready for, beyond `pageReady` ──────────────────────────────────────────── */

/** Real rows. A skeleton row is `data-skeleton`, never `data-row` (Table.jsx). */
const ROWS = `document.querySelectorAll('tr[data-row]').length > 1`;
const HEADING = `!!document.querySelector('main h1')`;
const TEXT = (s) => `document.body.innerText.includes(${JSON.stringify(s)})`;
const PANEL_OPEN = `!!document.querySelector('[data-testid="member-panel"][data-open="true"] .mcard')`;
const PANEL_SHUT = `!document.querySelector('[data-testid="member-panel"][data-open="true"]')`;

/** Ruling ③: the breadcrumb is never under the search. */
const CRUMBS_CLEAR_OF_SEARCH = `(() => {
  const trail = document.querySelector('header nav');
  const search = document.querySelector('header input[type="search"]')?.closest('label');
  if (!trail || !search) return false;
  return trail.getBoundingClientRect().right <= search.getBoundingClientRect().left + 0.5;
})()`;

/*
 * 🔑 THE FINISH REVIEW'S FINDINGS, AS MEASUREMENTS (`06.3`). A reviewer reads a picture; these read
 * the page the picture was taken of, so a fix is proved by the capture rather than argued from it.
 */

/** Ruling ③: the current page's crumb is whole, never an ellipsis. */
const CRUMB_WHOLE = `(() => {
  const current = document.querySelector('header nav [aria-current="page"]');
  return !!current && current.scrollWidth <= current.clientWidth;
})()`;

/** Where the topbar has the room (1440 with a record open), "Home" is shown and whole too. */
const HOME_CRUMB_WHOLE = `(() => {
  const home = document.querySelector('header nav a.crumb-lead');
  return !!home && home.getClientRects().length > 0 && home.scrollWidth <= home.clientWidth;
})()`;

/** Ruling ③: no figure's label runs past its own column. */
const FIGURES_FIT = `[...document.querySelectorAll('[data-testid="figure-strip"] dt')].every((dt) => dt.scrollWidth <= dt.clientWidth)`;

/** No figure pretends to be a reading when the register was not read (K1). */
const NO_ZERO_FIGURES = `![...document.querySelectorAll('[data-testid="figure-strip"] dd')].some((dd) => dd.textContent.trim() === '0')`;

/** The comp's criteria row: every criterion, More criteria and Clear on one baseline. */
const CRITERIA_ONE_LINE = `(() => {
  const row = document.querySelector('main section[aria-label="Filter criteria"] [data-criteria-items]');
  if (!row) return false;
  const bottoms = [...row.children].filter((el) => el.getClientRects().length).map((el) => el.getBoundingClientRect().bottom);
  return bottoms.length > 1 && Math.max(...bottoms) - Math.min(...bottoms) < 4;
})()`;

/** The card's foot: Membership no. and Employer labels on the comp's one baseline. */
const CARD_FOOT_ONE_LINE = `(() => {
  const labels = [...document.querySelectorAll('[data-testid="membership-card"] small')];
  const number = labels.find((el) => /membership no/i.test(el.textContent));
  const employer = labels.find((el) => /^employer$/i.test(el.textContent.trim()));
  return !!number && !!employer && Math.abs(number.getBoundingClientRect().top - employer.getBoundingClientRect().top) < 2;
})()`;

/** The rail's foot sits at the bottom of the rail, on every screen. */
const RAIL_FOOT_PINNED = `(() => {
  const rail = document.querySelector('nav[aria-label="Main"]');
  const appearance = rail && [...rail.querySelectorAll('button')].find((el) => /appearance/i.test(el.textContent));
  return !!appearance && rail.getBoundingClientRect().bottom - appearance.getBoundingClientRect().bottom < 64;
})()`;

/** On a phone no member's second line is cut short by a neighbouring column. */
const MEMBER_LINES_WHOLE = `[...document.querySelectorAll('tr[data-row] td[data-col="member"] .truncate')].every((el) => el.scrollWidth <= el.clientWidth)`;

/** The date sheet's days span the sheet, in the approved picker's 44px targets. */
const DAYS_SPAN_SHEET = `(() => {
  const sheet = document.querySelector('[role="dialog"][aria-modal="true"]');
  const grid = sheet && sheet.querySelector('[role="grid"]');
  if (!grid) return false;
  const cells = [...grid.querySelectorAll('[role="gridcell"]')];
  return grid.getBoundingClientRect().width >= sheet.getBoundingClientRect().width - 40
    && cells.length >= 28 && cells.every((cell) => cell.getBoundingClientRect().height >= 44);
})()`;

/** Ruling ⑤: the footer sits below the login card, never on it. */
const FOOTER_CLEAR_OF_CARD = `(() => {
  const card = document.querySelector('form')?.closest('.rounded-card');
  const footer = document.querySelector('footer');
  if (!card || !footer) return false;
  return footer.getBoundingClientRect().top >= card.getBoundingClientRect().bottom;
})()`;

/**
 * What a page that never became ready WAS showing. A readiness failure is diagnosed from this,
 * never "fixed" by running the shot again (the owner's anti-flake rule).
 */
const PAGE_CENSUS = `(() => ({
  href: location.href,
  readyState: document.readyState,
  fonts: document.fonts.status,
  routePending: !!document.querySelector('[data-testid="route-pending"]'),
  rootChildren: document.getElementById('root')?.children.length ?? 0,
  rows: document.querySelectorAll('tr[data-row]').length,
  skeletons: document.querySelectorAll('tr[data-skeleton]').length,
  states: [...document.querySelectorAll('[data-state]')].map((n) => n.dataset.state),
  text: (document.body?.innerText || '').replace(/\\s+/g, ' ').slice(0, 240),
}))()`;

const typeInto = (selector, value) => `(() => {
  const input = document.querySelector(${JSON.stringify(selector)});
  if (!input) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;

const scrollIntoView = (selector) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  el.scrollIntoView({ block: 'start' });
  return true;
})()`;

/** A11's box: the designed fallback is up, the shell is still standing, and no build artefact shows. */
const BOUNDARY_SHOWN = `!!document.querySelector('[data-testid="route-error"]')`;
const SHELL_STANDING = `!!document.querySelector('nav[aria-label="Main"]') && !!document.querySelector('header input[type="search"]')`;
const NO_BUILD_ARTEFACT = `!/assets\\/|\\.js\\b|dynamically imported/i.test(document.querySelector('[data-testid="route-error"]')?.innerText || '')`;

/**
 * The stub register with its first member in the server's REAL wire shape for COSATU positions:
 * one comma-separated string, never unfolded on the way out (A37, open and pinned). The stub
 * server sends an array, which is why no capture had ever reached the throw.
 */
const a37Register = async () => {
  const members = await (await fetch(`${baseUrl}/api/members`)).json();
  return members.map((member, index) => (index === 0 ? { ...member, isCosatu: 'Y', cosatuPositions: 'PEC,CEC' } : member));
};

const OPEN_FIRST_MEMBER = {
  what: 'open the first member',
  run: clickByText('[data-row-action]', '/open the record for/i'),
  until: PANEL_OPEN,
};

/**
 * The set, named for what each shows; `-light` / `-dark` is appended per theme.
 *
 * The first block is the register -- the thesis screen -- at every width and in every state, with
 * the owner's rulings asserted where a predicate can hold them. The rest take the world by rule.
 */
const SHOTS = [
  // ── the thesis screen, and rulings ② ③ ④ ──────────────────────────────────────────────────
  { name: 'members-desk', vp: 'desk', themes: BOTH, route: '/members', ready: ROWS, expect: { PANEL_SHUT, CRUMB_WHOLE, FIGURES_FIT, CRITERIA_ONE_LINE, RAIL_FOOT_PINNED } },
  { name: 'members-open-desk', vp: 'desk', themes: BOTH, route: '/members', ready: ROWS, steps: [OPEN_FIRST_MEMBER], expect: { PANEL_OPEN, CRUMB_WHOLE, HOME_CRUMB_WHOLE, FIGURES_FIT, CRITERIA_ONE_LINE, CARD_FOOT_ONE_LINE } },
  { name: 'members-laptop', vp: 'laptop', themes: LIGHT, route: '/members', ready: ROWS, expect: { PANEL_SHUT, CRUMBS_CLEAR_OF_SEARCH, CRUMB_WHOLE, FIGURES_FIT, CRITERIA_ONE_LINE } },
  { name: 'members-open-laptop', vp: 'laptop', themes: BOTH, route: '/members', ready: ROWS, steps: [OPEN_FIRST_MEMBER], expect: { PANEL_OPEN, CRUMBS_CLEAR_OF_SEARCH, CRUMB_WHOLE, FIGURES_FIT, CRITERIA_ONE_LINE, CARD_FOOT_ONE_LINE } },
  { name: 'members-phone', vp: 'phone', themes: BOTH, route: '/members', ready: ROWS, expect: { PANEL_SHUT, MEMBER_LINES_WHOLE } },
  {
    name: 'members-rows-phone', vp: 'phone', themes: LIGHT, route: '/members', ready: ROWS,
    steps: [{ what: 'scroll to the register', run: scrollIntoView('section[aria-label="Member register"]') }],
  },
  { name: 'members-open-phone', vp: 'phone', themes: BOTH, route: '/members', ready: ROWS, steps: [OPEN_FIRST_MEMBER], expect: PANEL_OPEN },
  {
    name: 'members-edit-desk', vp: 'desk', themes: LIGHT, route: '/members', ready: ROWS,
    steps: [OPEN_FIRST_MEMBER, { what: 'edit the record in place', run: clickByText('button', '/^Edit Member$/'), until: TEXT('Save changes') }],
  },

  // ── A27's class: the register's other states, reached by interception ─────────────────────
  {
    name: 'members-error-desk', vp: 'desk', themes: LIGHT, route: '/members',
    intercept: { url: '*/api/members', mode: 'fail' },
    ready: TEXT('The register could not be reached'),
    expect: {
      ERROR_SHOWN: TEXT('The register could not be reached'),
      NO_EMPTY_COPY: `!${TEXT('No members match')}`,
      NO_ZERO_FIGURES,
    },
  },
  {
    name: 'members-empty-desk', vp: 'desk', themes: LIGHT, route: '/members',
    intercept: { url: '*/api/members', mode: 'empty' },
    ready: TEXT('No members match these criteria'),
  },
  {
    name: 'members-loading-desk', vp: 'desk', themes: LIGHT, route: '/members',
    intercept: { url: '*/api/members', mode: 'hang' },
    ready: `!!document.querySelector('tbody[aria-busy="true"] tr[data-skeleton]')`,
  },
  {
    name: 'members-partial-desk', vp: 'desk', themes: LIGHT, route: '/members',
    intercept: { url: '*/api/banks', mode: 'fail' },
    ready: `${ROWS} && ${TEXT('Some option lists are missing.')}`,
  },

  // ── ruling ⑤ ─────────────────────────────────────────────────────────────────────────────
  { name: 'login-desk', vp: 'desk', themes: BOTH, route: '/login', ready: TEXT('Welcome back'), expect: FOOTER_CLEAR_OF_CARD },
  { name: 'login-laptop', vp: 'laptop', themes: LIGHT, route: '/login', ready: TEXT('Welcome back'), expect: FOOTER_CLEAR_OF_CARD },
  { name: 'login-phone', vp: 'phone', themes: BOTH, route: '/login', ready: TEXT('Welcome back'), expect: FOOTER_CLEAR_OF_CARD },

  // ── the screens that take the world by rule ─────────────────────────────────────────────
  { name: 'home-desk', vp: 'desk', themes: BOTH, route: '/home', ready: HEADING, expect: RAIL_FOOT_PINNED },
  { name: 'home-phone', vp: 'phone', themes: LIGHT, route: '/home', ready: HEADING },
  { name: 'capture-desk', vp: 'desk', themes: BOTH, route: '/members/capture', ready: TEXT('Save Member') },
  { name: 'capture-phone', vp: 'phone', themes: LIGHT, route: '/members/capture', ready: TEXT('Save Member') },
  { name: 'recruiters-desk', vp: 'desk', themes: BOTH, route: '/recruiters', ready: ROWS },
  { name: 'recruiters-phone', vp: 'phone', themes: LIGHT, route: '/recruiters', ready: ROWS },
  {
    name: 'recruiters-dialog-desk', vp: 'desk', themes: LIGHT, route: '/recruiters', ready: ROWS,
    steps: [{ what: 'open a channel', run: clickByText('button', '/show the members recruited/i'), until: `!!document.querySelector('[role="dialog"]')` }],
  },
  { name: 'banks-desk', vp: 'desk', themes: BOTH, route: '/banks', ready: ROWS },
  { name: 'subscriptions-desk', vp: 'desk', themes: LIGHT, route: '/admin/maintenance/subscriptions', ready: `document.querySelectorAll('tbody tr:not([data-skeleton])').length > 1` },
  { name: 'organizer-desk', vp: 'desk', themes: LIGHT, route: '/reports/organizer-report', ready: HEADING },
  {
    name: 'date-sheet-phone', vp: 'phone', themes: LIGHT, route: '/reports/organizer-report', ready: HEADING,
    steps: [{ what: 'open a date field', run: mouseDownOn('input[aria-expanded]', '/date/i'), until: `!!document.querySelector('[role="dialog"][aria-modal="true"]')` }],
    expect: DAYS_SPAN_SHEET,
  },
  { name: 'forms-desk', vp: 'desk', themes: LIGHT, route: '/reports/forms', ready: HEADING },
  { name: 'apply-desk', vp: 'desk', themes: LIGHT, route: '/members/apply', ready: HEADING },
  {
    name: 'locations-desk', vp: 'desk', themes: LIGHT, route: '/reports/locations', ready: HEADING,
    steps: [{ what: 'run the search', run: clickByText('button', '/^Search$/'), until: `!!document.querySelector('main table tbody tr')` }],
  },
  {
    name: 'acb-debits-desk', vp: 'desk', themes: LIGHT, route: '/admin/acb/debits', ready: `!!document.querySelector('main input')`,
    steps: [
      { what: 'type a surname', run: typeInto('main input', 'Nkosi') },
      { what: 'run the search', run: clickByText('button', '/^Search$/'), until: ROWS },
    ],
  },
  { name: 'finance-houses-desk', vp: 'desk', themes: LIGHT, route: '/archives/finance-houses', ready: HEADING },
  { name: 'admin-desk', vp: 'desk', themes: LIGHT, route: '/admin', ready: HEADING },

  // ── A11's box: the designed fallback, proven by a DELIBERATE throw on a real route ─────────
  {
    // The failure `03.1` introduced: a route chunk that never arrives -- a stale index.html after
    // a deploy. It throws during render on an application that is otherwise healthy.
    name: 'boundary-chunk-desk', vp: 'desk', themes: LIGHT, route: '/members',
    intercept: { url: '*/assets/Members-*.js', mode: 'fail' },
    ready: BOUNDARY_SHOWN,
    expect: `${BOUNDARY_SHOWN} && ${SHELL_STANDING} && ${NO_BUILD_ARTEFACT}`,
  },
  {
    // A render throw from data: the record's Structures tab calls `.join` on the string A37 says
    // the server really sends. Not a fixture component written to throw -- the register's own code.
    name: 'boundary-render-desk', vp: 'desk', themes: LIGHT, route: '/members',
    intercept: { url: '*/api/members', mode: 'fulfill', body: a37Register },
    ready: ROWS,
    steps: [
      OPEN_FIRST_MEMBER,
      { what: 'open the Structures tab', run: clickByText('[data-testid="member-panel"] button', '/Sasbo Structures/i'), until: BOUNDARY_SHOWN },
    ],
    expect: `${BOUNDARY_SHOWN} && ${SHELL_STANDING}`,
  },
];

/** The reviewer's own required names (its check 0), and the owner's screen. */
const ALIASES = [
  ['members-open-desk-light.png', 'desktop.png'],
  ['members-phone-light.png', 'mobile.png'],
  ['members-open-laptop-light.png', 'user-1280.png'],
];

const selected = SHOTS.filter((s) => !only || only.has(s.name));
if (only) {
  const unknown = [...only].filter((n) => !SHOTS.some((s) => s.name === n));
  if (unknown.length) {
    console.error(`--only names ${unknown.join(', ')}, and no shot is called that`);
    process.exit(2);
  }
}

mkdirSync(outDir, { recursive: true });

const rows = [];
let entry = null;
let cdp;

try {
  cdp = await launch('review');
  const { send, evaluate, metrics, waitFor, assertBuiltClient, on } = cdp;

  entry = await assertBuiltClient(baseUrl);
  console.log('identity OK — entry script', entry);

  /**
   * Make one request pattern fail, hang or come back empty for the length of one shot, and return
   * the teardown. Anything held is released on the way out, so no shot inherits a request the
   * previous one left hanging. A CDP call that fails here is RETURNED, and it fails the shot.
   */
  const intercept = async ({ url, mode, body }) => {
    const held = [];
    const problems = [];
    // `empty` answers `[]`; `fulfill` answers with the shot's own payload.
    const payload = mode === 'empty' ? [] : mode === 'fulfill' ? await body() : null;
    const off = on('Fetch.requestPaused', ({ requestId }) => {
      if (mode === 'hang') { held.push(requestId); return; }
      const answer = mode === 'fail'
        ? send('Fetch.failRequest', { requestId, errorReason: 'ConnectionRefused' })
        : send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [{ name: 'content-type', value: 'application/json' }],
          body: Buffer.from(JSON.stringify(payload)).toString('base64'),
        });
      answer.catch((e) => problems.push(e.message));
    });
    // 🔑 THE CACHE IS OFF FOR AN INTERCEPTED SHOT. A route chunk an earlier shot already loaded is
    // served from memory without ever reaching the network -- so an interception of it would pause
    // nothing, and the "failed chunk" shot would photograph a page that loaded perfectly.
    await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Fetch.enable', { patterns: [{ urlPattern: url, requestStage: 'Request' }] });
    return async () => {
      off();
      for (const requestId of held) {
        // The page that held it may already be gone; an unknown request id is the expected answer.
        await send('Fetch.failRequest', { requestId, errorReason: 'Aborted' }).catch(() => {});
      }
      await send('Fetch.disable');
      await send('Network.setCacheDisabled', { cacheDisabled: false });
      await send('Network.disable');
      return problems;
    };
  };

  for (const shot of selected) {
    const vp = VIEWPORTS[shot.vp];
    const phone = vp.width < 700;

    for (const theme of shot.themes) {
      const name = `${shot.name}-${theme}`;
      const row = { name, file: `${name}.png`, route: shot.route, width: vp.width, height: vp.height, theme, missed: [], elements: 0 };

      await metrics(vp.width, vp.height);
      // Touch as well as width on a phone: `pointer: coarse` is what turns the 16px field rule and
      // the 44px targets on, and an emulated width alone keeps a desktop pointer (T6).
      await send('Emulation.setTouchEmulationEnabled', phone ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
      await evaluate(storeTheme(theme === 'dark'));
      const release = shot.intercept ? await intercept(shot.intercept) : null;

      await send('Page.navigate', { url: baseUrl + shot.route });
      if (!await waitFor(pageReady, { tries: 120 })) {
        row.missed.push('pageReady never held');
        row.diagnosis = await evaluate(PAGE_CENSUS).catch((e) => `the census threw: ${e.message}`);
      } else if (shot.ready && !await waitFor(shot.ready, { tries: 120 })) {
        row.missed.push(`never ready: ${shot.ready}`);
        row.diagnosis = await evaluate(PAGE_CENSUS).catch((e) => `the census threw: ${e.message}`);
      } else {
        for (const step of shot.steps ?? []) {
          if (await evaluate(step.run) !== true) { row.missed.push(`step did not land: ${step.what}`); break; }
          if (step.until && !await waitFor(step.until)) { row.missed.push(`step landed but never took effect: ${step.what}`); break; }
        }
      }

      if (!row.missed.length && !await waitFor(SETTLED, { tries: 120, awaitPromise: true })) {
        row.missed.push('never settled: a finite animation was still running after 18s');
      }

      // 🔑 A PAGE IN THE RIGHT STATE THAT BREAKS THE RULE ITS NAME CLAIMS IS STILL PHOTOGRAPHED --
      // that capture is the evidence of the break, and the row still fails. A page that never
      // reached its state is not photographed at all: there is nothing true in that frame.
      //
      // 🔑 A CLAIM IS A SET OF NAMED PREDICATES, so a failure says WHICH. Six conditions joined
      // with `&&` reported "does not show what it claims" and nothing more, and the one that failed
      // had to be found by hand (`06.3`).
      const reached = !row.missed.length;
      if (reached && shot.expect) {
        const claims = typeof shot.expect === 'string' ? { CLAIM: shot.expect } : shot.expect;
        const broken = [];
        for (const [claim, expression] of Object.entries(claims)) {
          if (await evaluate(expression) !== true) broken.push(claim);
        }
        if (broken.length) row.missed.push(`does not show what it claims (captured as the evidence): ${broken.join(', ')}`);
      }

      if (reached) {
        // The readout, the probe and the shutter on one settled page (states.mjs's rule).
        const { paint, probe } = await evaluate(`({ paint: ${themeReadout}, probe: ${overflowProbe(vp.width)} })`);
        Object.assign(row, {
          innerWidth: probe.innerWidth,
          viewportHeld: probe.innerWidth === vp.width,
          elements: probe.elements,
          offenderCount: probe.offenderCount,
          offenders: probe.offenders,
          theme_dark: paint.dark,
          theme_bg: paint.bg,
        });
        if (!row.viewportHeld) row.missed.push(`viewport not held: asked for ${vp.width}, the page is ${probe.innerWidth} wide`);
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(outDir, row.file), Buffer.from(data, 'base64'));
        row.captured = true;
      }

      if (release) for (const problem of await release()) row.missed.push(`interception failed: ${problem}`);

      row.ok = row.missed.length === 0;
      rows.push(row);
      console.log(`  ${row.ok ? 'ok  ' : 'FAIL'}  ${name}${row.ok ? '' : `  — ${row.missed.join('; ')}`}`);
      if (row.diagnosis) console.log(`        the page was showing: ${JSON.stringify(row.diagnosis)}`);
    }
  }
} catch (e) {
  console.error('review failed:', e.message);
  process.exitCode = 1;
} finally {
  cdp?.close();
}

// 🔴 AN ALIAS FOLLOWS THE CAPTURE, NOT THE VERDICT. Copied only for a passing row, `user-1280.png`
// kept the PRE-fix frame the moment its shot failed a claim -- and the reviewer's verdict pass
// re-reads exactly that file (`06.3`). A capture that breaks a claim is still the page as it is.
for (const [from, to] of ALIASES) {
  if (rows.some((r) => r.file === from && r.captured)) copyFileSync(join(outDir, from), join(outDir, to));
}

const commit = (() => {
  try {
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain', '--', 'src', 'index.html'], { encoding: 'utf8' }).trim();
    return dirty ? `${sha} + uncommitted changes under src/ or index.html` : sha;
  } catch {
    return 'unknown';
  }
})();

/*
 * 🔑 A RECAPTURE MERGES; IT DOES NOT REPLACE. The finish reviewer's verdict pass re-reads the
 * same files, so `--only` is how a fixed shot is retaken -- and the first `--only` run here wrote
 * its rows over a 43-row manifest. Each row now carries its own commit and time, and a run that
 * captured nothing leaves the manifest exactly as it was.
 */
const manifestPath = join(outDir, 'manifest.json');
if (rows.length) {
  const stamp = { capturedAt: new Date().toISOString(), commit, entry, baseUrl };
  let kept = [];
  try {
    kept = JSON.parse(readFileSync(manifestPath, 'utf8')).shots ?? [];
  } catch {
    kept = [];
  }
  const shots = [...kept.filter((old) => !rows.some((row) => row.name === old.name)), ...rows.map((row) => ({ ...row, ...stamp }))];
  writeFileSync(manifestPath, JSON.stringify({ updatedAt: stamp.capturedAt, shots }, null, 2));
} else {
  console.log(`nothing was captured, so ${manifestPath} is left as it was`);
}

const population = populationComplaints(rows);
const themes = themeDimensionComplaints(rows);
for (const complaint of population) console.log(`  POPULATION  ${complaint}`);
for (const complaint of themes) console.log(`  THEME  ${complaint}`);

const failed = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - failed.length} of ${rows.length} captured in the state they claim · commit ${commit}`);
if (failed.length || population.length || themes.length || rows.length !== selected.reduce((n, s) => n + s.themes.length, 0)) {
  process.exitCode = 1;
}
