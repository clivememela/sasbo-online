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
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

import { overflowProbe, pageReady, storeTheme, themeDimensionComplaints, themeReadout } from './probe.mjs';

const CHROME = 'C:/Users/mfazl/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9700 + Math.floor(Math.random() * 80);
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/states-' + PORT, 'about:blank',
], { stdio: 'ignore' });

let ws;
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const msg = { id: ++id, method, params };
    pending.set(msg.id, { resolve, reject });
    ws.send(JSON.stringify(msg));
  });
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

const results = [];
try {
  let targets;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      if (targets.some((t) => t.type === 'page')) break;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  if (shotsDir) mkdirSync(shotsDir, { recursive: true });

  // localStorage belongs to an ORIGIN, and the browser starts on about:blank -- which has
  // none. One throwaway navigation gives the first `storeTheme` somewhere to write.
  await send('Page.navigate', { url: baseUrl + '/' });
  for (let i = 0; i < 60; i++) {
    if (await evaluate('document.readyState === "complete"') === true) break;
    await sleep(150);
  }

  for (const state of STATES) {
    for (const theme of ['light', 'dark']) {
      await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 844, deviceScaleFactor: 2, mobile: true });
      // 🔴 THE THEME IS SET BEFORE THE NAVIGATION, NOT AFTER IT. Setting it after meant
      // setting it before React mounted, and `ThemeContext`'s mount effect then re-applied
      // the class from its own `localStorage`-seeded state -- so the dark half of every run
      // rendered light. `index.html`'s pre-paint script reads this key, so writing it first
      // makes the theme correct from the first frame. See `probe.mjs`.
      await evaluate(storeTheme(theme === 'dark'));
      await send('Page.navigate', { url: baseUrl + state.route });
      for (let i = 0; i < 80; i++) {
        if (await evaluate(pageReady) === true) break;
        await sleep(150);
      }

      // 🔴 WAIT FOR WHAT THIS STATE NEEDS, not for a fixed number of milliseconds.
      // The first run reached 4 of 12, and the pattern gave the cause away: two cases
      // beginning with the SAME click disagreed. That is a race — one ran while the
      // members request was still in flight, so there was no row to click. A fixed sleep
      // makes the result depend on how busy the machine is, which is the definition of a
      // flaky measurement.
      if (state.ready) {
        let settled = false;
        for (let i = 0; i < 80; i++) {
          if (await evaluate(state.ready) === true) { settled = true; break; }
          await sleep(150);
        }
        if (!settled) {
          // No theme readout: a state that never became ready was never painted, and a row
          // with a placeholder colour would poison the theme canary below.
          results.push({ ...state, theme, reached: false, missed: ['never became ready: ' + state.ready], overflows: false, offenders: [], offenderCount: 0, scrollWidth: 0, innerWidth: 0, requested: WIDTH });
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
  try { ws && ws.close(); } catch { /* closed */ }
  chrome.kill();
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
if (unreached.length || overflowing.length || themeComplaints.length) process.exitCode = 1;
