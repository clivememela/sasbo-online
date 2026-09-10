/**
 * The surfaces the matrix cannot reach by navigating. `05.1`.
 *
 * 🔴 A ROUTE MEASURED ON ARRIVAL IS NOT THE ROUTE. The matrix loads 25 routes at 7 widths
 * and finds no overflow — and the widest tables in this application are not on screen when
 * it looks. `LocationListing`'s ELEVEN-column table renders only after a search;
 * `AcbDebits`' results table only after a member is found; the date sheet and the member
 * dialog only after something is opened. Those are the surfaces most likely to overflow a
 * 390px phone, and the matrix's clean run says nothing whatsoever about them.
 *
 * ⚠️ THIS IS `07.2`'s PROBLEM ARRIVING EARLY. That unit is *"state-gated surfaces"* and it
 * exists because of exactly this gap. What is driven here is the subset `05.1` needs to
 * make its overflow claim honest — not the full journey set.
 *
 * 🔑 AND IT CLOSES A P3 BOX. *"The sheet at a real 390px"* was left unticked at P3 with the
 * reason *"jsdom has no layout; the sheet branch IS driven and asserted, but 'one-handed
 * reach' is not a jsdom question"* — and it was deferred here. This is the first time that
 * sheet has been laid out at 390 real pixels.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import { launch, sleep } from './cdp.mjs';

import { overflowProbe, pageReady, populationComplaints, storeTheme, themeDimensionComplaints, themeReadout } from './probe.mjs';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4319';
const shotsDir = process.argv[3];

/**
 * Press a control that opens on `mousedown`, and say whether it was found.
 *
 * 🔴 `element.click()` DISPATCHES A `click` EVENT AND NOTHING ELSE. It does not synthesise
 * the mouse sequence a real press produces, so a control wired to `onMouseDown` never
 * hears it. `DateField` is wired that way on purpose — *"the whole field is the trigger"*,
 * the owner's complaint about the control it replaces being that only the icon opened it —
 * and the driver reported the step as simply not landing, which reads exactly like a
 * missing control. It was the driver. Playwright's `page.click()` is unaffected; this is a
 * property of raw CDP `Runtime.evaluate`, so it bites here and not in the journeys.
 */
const mouseDownOn = (selector, pattern) => `(() => {
  const re = ${pattern};
  const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
    .find((n) => re.test((n.labels?.[0]?.textContent || n.getAttribute('aria-label') || '').trim()));
  if (!el) return false;
  for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  }
  return true;
})()`;

/** Click the first element whose visible text matches, and say whether anything matched. */
const clickByText = (selector, pattern) => `(() => {
  const re = ${pattern};
  const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
    .find((n) => re.test((n.getAttribute('aria-label') || n.textContent || '').trim()));
  if (!el) return false;
  el.click();
  return true;
})()`;

/**
 * Each state, and the drive that reaches it.
 *
 * 🔑 EVERY STEP RETURNS WHETHER IT LANDED, and a step that did not land FAILS the case
 * rather than being skipped. A driver that silently no-ops measures the page it was
 * already on and reports it clean — which is this arc's recurring species with a browser
 * attached.
 */
const STATES = [
  {
    name: 'members — record dialog open',
    route: '/members',
    ready: `document.querySelectorAll('tbody tr').length > 1`,
    steps: [
      { what: 'open the first member', run: clickByText('button', '/open the record for/i') },
      { what: 'the dialog is present', run: `!!document.querySelector('[role="dialog"]')` },
    ],
  },
  {
    name: 'members — record dialog, Sasbo Structures tab',
    route: '/members',
    ready: `document.querySelectorAll('tbody tr').length > 1`,
    steps: [
      { what: 'open the first member', run: clickByText('button', '/open the record for/i') },
      { what: 'switch to Structures', run: clickByText('button', '/Sasbo Structures/i') },
    ],
  },
  {
    name: 'capture — the date sheet (P3 deferral)',
    route: '/members/capture',
    ready: `[...document.querySelectorAll('button')].some(b => /Sasbo Structures/i.test(b.textContent || ''))`,
    steps: [
      { what: 'open the Structures tab', run: clickByText('button', '/Sasbo Structures/i') },
      // The sheet only exists once the flow that owns a date is switched on.
      { what: 'answer Shop Steward = Yes', run: `(() => {
          const sel = [...document.querySelectorAll('select')].find(s => /Shop Steward/i.test(s.labels?.[0]?.textContent || ''));
          if (!sel) return false;
          const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
          set.call(sel, 'Y'); sel.dispatchEvent(new Event('change', { bubbles: true })); return true;
        })()` },
      // The trigger is the FIELD, not a button beside it: the input carries
      // `role="combobox"`, and the calendar icon is `aria-hidden` with `tabIndex={-1}`
      // because it is decoration. Looking for a `<button>` here found the tab strip and
      // the save bar and nothing else.
      { what: 'open the date picker', run: mouseDownOn('input[aria-expanded]', '/Election Date/i') },
      // 🔑 THE SHEET, NOT MERELY A PANEL. `aria-modal` is `true` only on the bottom-sheet
      // branch — the popover sets it `false` — so this is what distinguishes "the picker
      // opened" from "the picker opened in its PHONE form", which is the P3 box.
      { what: 'the bottom sheet is up', run: `!!document.querySelector('[role="dialog"][aria-modal="true"]')` },
    ],
  },
  {
    name: 'locations — the 11-column listing',
    route: '/reports/locations',
    ready: `[...document.querySelectorAll('button')].some(b => /^Search$/i.test((b.textContent || '').trim()))`,
    steps: [
      { what: 'run the search', run: clickByText('button', '/^Search$/i') },
      { what: 'the listing rendered', run: `!!document.querySelector('table')` },
    ],
  },
  {
    name: 'acb debits — the results table',
    route: '/admin/acb/debits',
    ready: `!!document.querySelector('input')`,
    steps: [
      { what: 'type a surname', run: `(() => { const i = document.querySelector('input'); if (!i) return false; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,'Nkosi'); i.dispatchEvent(new Event('input',{bubbles:true})); return true; })()` },
      { what: 'run the search', run: clickByText('button', '/^Search$/i') },
      { what: 'results rendered', run: `document.querySelectorAll('tbody tr').length > 1` },
    ],
  },
  {
    name: 'recruiters — the member list dialog',
    route: '/recruiters',
    ready: `document.querySelectorAll('tbody tr').length > 1`,
    steps: [
      { what: 'open the first channel', run: clickByText('button', '/show the members recruited/i') },
      { what: 'the dialog is present', run: `!!document.querySelector('[role="dialog"]')` },
    ],
  },
];

const WIDTH = 390;
const results = [];
let cdp;

try {
  // The browser, the socket, the strict `evaluate`, the viewport rule and T23's identity
  // check all live in `cdp.mjs` -- see its header for the four defects six hand-copies of
  // this block had already drifted into.
  cdp = await launch('states');
  const { send, evaluate, metrics, waitFor, assertBuiltClient } = cdp;

  console.log('identity OK — entry script', await assertBuiltClient(baseUrl));
  if (shotsDir) mkdirSync(shotsDir, { recursive: true });

  /**
   * A row for a state that never became ready.
   *
   * 🔑 ONE BUILDER, SO THE TWO PATHS CANNOT DISAGREE. `elements: 0` is the load-bearing field:
   * `populationComplaints` keys off it, and a row without it is invisible to the canary rather
   * than caught by it. `0` is honest here — the state genuinely never rendered — and it is a
   * real number, so the check convicts the row instead of skipping it.
   */
  const unreachedRow = (state, theme, why) => ({
    ...state,
    theme,
    reached: false,
    missed: [why],
    overflows: false,
    offenders: [],
    offenderCount: 0,
    scrollWidth: 0,
    innerWidth: 0,
    requested: WIDTH,
    elements: 0,
  });

  // localStorage belongs to an ORIGIN, and the browser starts on about:blank -- which has
  // none. One throwaway navigation gives the first `storeTheme` somewhere to write.
  await send('Page.navigate', { url: baseUrl + '/' });
  await waitFor('document.readyState === "complete"', { tries: 60 });

  for (const state of STATES) {
    for (const theme of ['light', 'dark']) {
      // Through `cdp.mjs`'s one viewport rule, so this harness and the matrix agree about
      // what a 390px phone is.
      await metrics(WIDTH);
      // 🔴 THE THEME IS SET BEFORE THE NAVIGATION, NOT AFTER IT. Setting it after meant
      // setting it before React mounted, and `ThemeContext`'s mount effect then re-applied
      // the class from its own `localStorage`-seeded state -- so the dark half of every run
      // rendered light. `index.html`'s pre-paint script reads this key, so writing it first
      // makes the theme correct from the first frame. See `probe.mjs`.
      await evaluate(storeTheme(theme === 'dark'));
      await send('Page.navigate', { url: baseUrl + state.route });
      await waitFor(pageReady);

      // 🔴 WAIT FOR WHAT THIS STATE NEEDS, not for a fixed number of milliseconds.
      // The first run reached 4 of 12, and the pattern gave the cause away: two cases
      // beginning with the SAME click disagreed. That is a race — one ran while the
      // members request was still in flight, so there was no row to click. A fixed sleep
      // makes the result depend on how busy the machine is, which is the definition of a
      // flaky measurement.
      if (state.ready) {
        if (!await waitFor(state.ready)) {
          // No theme readout: a state that never became ready was never painted, and a row
          // with a placeholder colour would poison the theme canary below.
          //
          // 🔴 IT STILL CARRIES AN `elements` COUNT, AND IT USED NOT TO. This path hand-listed
          // eight fields and omitted that one — the single key `populationComplaints` reads —
          // so an unreached state fell straight out of the population canary and the run came
          // back clean about a row that had measured nothing. One row builder now, so a field
          // added to the measured row cannot go missing from this one.
          results.push(unreachedRow(state, theme, 'never became ready: ' + state.ready));
          continue;
        }
      }
      await sleep(300);

      const missed = [];
      for (const step of state.steps) {
        const ok = await evaluate(step.run);
        if (ok !== true) missed.push(step.what);
        await sleep(600);
      }

      // 🔑 READ THE THEME AT THE MOMENT THE PAGE IS MEASURED. Taken on arrival it read
      // `rgba(0, 0, 0, 0)` for both themes -- the stylesheet had not applied yet -- and the
      // canary correctly called that a dead dimension. Same tick as the probe, same tick as
      // the screenshot.
      const paint = await evaluate(themeReadout);
      const r = await evaluate(overflowProbe(WIDTH));
      const reached = missed.length === 0;
      const overflows = r.scrollWidth > WIDTH + 1 || r.offenderCount > 0;
      results.push({ ...state, theme, ...r, reached, missed, overflows, theme_dark: paint?.dark, theme_bg: paint?.bg });

      if (shotsDir && reached) {
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(`${shotsDir}/${state.name.replace(/\W+/g, '_')}-${theme}.png`, Buffer.from(data, 'base64'));
      }
    }
  }
} catch (e) {
  console.error('states failed:', e.message);
  process.exitCode = 1;
} finally {
  cdp?.close();
}

writeFileSync('reports/states.json', JSON.stringify(results, null, 2));

console.log(`\n${results.length} state×theme combinations at a real ${WIDTH}px\n`);
for (const r of results) {
  const flag = !r.reached ? 'NOT REACHED' : r.overflows ? 'OVERFLOWS' : 'ok';
  console.log(`  ${flag.padEnd(12)} ${r.theme.padEnd(5)} ${r.name}`);
  if (!r.reached) console.log(`      steps that did not land: ${r.missed.join(', ')}`);
  if (r.overflows) {
    console.log(`      scrollWidth=${r.scrollWidth} inner=${r.innerWidth} offenders=${r.offenderCount}`);
    for (const o of r.offenders) console.log(`      ${o}`);
  }
}

// 🔑 THE THEME DIMENSION IS PROVED, NOT ASSUMED. Every light/dark pair this harness
// produced was once byte-identical, because the theme was applied after React had already
// re-applied its own. A run that measured one theme twice must not report twelve
// combinations.
const populationIssues = populationComplaints(results);
for (const complaint of populationIssues) console.log(`  POPULATION  ${complaint}`);
const themeComplaints = themeDimensionComplaints(results);
for (const complaint of themeComplaints) console.log(`  THEME  ${complaint}`);
const themes = [...new Set(results.map((r) => `${r.theme}=${r.theme_bg}`))].sort();
console.log(`
body background by theme: ${themes.join('  ')}`);

const unreached = results.filter((r) => !r.reached);
const overflowing = results.filter((r) => r.reached && r.overflows);
console.log(`\nreached: ${results.length - unreached.length}/${results.length}   overflowing: ${overflowing.length}`);
// 🔴 A STATE THAT WAS NEVER REACHED IS NOT A PASS. It is a measurement that did not happen,
// and reporting it as clean is the failure this whole file is written against.
if (unreached.length || overflowing.length || themeComplaints.length || populationIssues.length) process.exitCode = 1;
