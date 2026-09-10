/**
 * The four conditions the width matrix cannot express. `05.1`.
 *
 * The matrix measures 25 routes at six widths and finds nothing. That is a statement about
 * six numbers. This file covers the rest of what `05.1` asks for:
 *
 *   ① THE EDGE SWEEP — every breakpoint ±1px, on every route. Assert only, no screenshots.
 *      🔴 A LAYOUT BUG LIVES ON ONE SIDE OF A BREAKPOINT, AND THE MATRIX SAMPLES NEITHER
 *      SIDE. Its widths are 320 · 390 · 768 · 1024 · 1349 · 1440. Two of those sit exactly
 *      ON a breakpoint, where the rule being tested has just switched — so the matrix reads
 *      the state AFTER the change and never the state 1px BEFORE it, which is where a
 *      three-column grid with no `sm:` prefix is still three columns in 639px.
 *
 *   ② 125% ROOT FONT — WCAG 1.4.4 in its cheapest form. Every `rem` grows by a quarter and
 *      the viewport does not, so a row that fitted at 100% has 25% more text in the same
 *      box. Nothing in the matrix moves the root font.
 *
 *   ③ `forced-colors: active` — Windows High Contrast. The token layer is the whole design
 *      here, and forced colours REPLACE it wholesale. What matters is not that it looks the
 *      same (it will not) but that nothing DISAPPEARS: a control whose only affordance is a
 *      background colour becomes invisible, and this app has several.
 *
 *   ④ RESIZE MID-DIALOG — the state check. A dialog laid out at 1440 and then dragged to
 *      390 is not the same as a dialog opened at 390: the second is what every test does,
 *      and the first is what a user with a phone in landscape does when they rotate it.
 *
 *   node tools/edges.mjs <baseUrl>
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import { ROUTES, overflowProbe, pageReady, populationComplaints, storeTheme } from './probe.mjs';

const CHROME = 'C:/Users/mfazl/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4319';

/**
 * The breakpoints this design actually has, each ±1.
 *
 * ⚠️ 760 IS THIS APP'S OWN, not Tailwind's. `index.css` carries
 * `@media (max-width: 760px)` for the 16px field rule and the touch-target pseudo-element,
 * and a bare-`@media` breakpoint is exactly the kind that gets forgotten — it is in none of
 * Tailwind's tooling and matches no `sm:`/`md:` prefix anyone greps for.
 */
const BREAKPOINTS = [640, 760, 768, 1024, 1280, 1536];
const EDGE_WIDTHS = BREAKPOINTS.flatMap((bp) => [bp - 1, bp + 1]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9600 + Math.floor(Math.random() * 80);
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/edges-' + PORT, 'about:blank',
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

const metrics = (width, height = 900) =>
  send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: width < 500 ? 2 : 1, mobile: width < 500,
  });

/** Navigate and wait until the page is genuinely ready to measure. */
async function land(route) {
  await send('Page.navigate', { url: baseUrl + route });
  for (let i = 0; i < 80; i++) {
    if (await evaluate(pageReady) === true) return true;
    await sleep(150);
  }
  return false;
}

const findings = [];
const record = (kind, where, r, extra = {}) => {
  const overflows = r.scrollWidth > r.requested + 1 || r.offenderCount > 0;
  findings.push({ kind, where, ...r, ...extra, overflows });
  return overflows;
};

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

  // Establish the origin so `storeTheme` has somewhere to write, then stay in light: an
  // edge is a LAYOUT fact, and the matrix has already covered both themes at six widths.
  await metrics(1024);
  await land('/');
  await evaluate(storeTheme(false));

  // ---------------------------------------------------------------- ① edge sweep
  console.log(`\n① edge sweep — ${ROUTES.length} routes × ${EDGE_WIDTHS.length} widths (${BREAKPOINTS.join(', ')} ±1)`);
  let swept = 0;
  let missed = 0;
  for (const width of EDGE_WIDTHS) {
    await metrics(width);
    for (const route of ROUTES) {
      if (!await land(route)) { missed += 1; continue; }
      record('edge', `${width}px ${route}`, await evaluate(overflowProbe(width)));
      swept += 1;
    }
    process.stdout.write(`  ${width}: ${ROUTES.length} routes\n`);
  }
  // 🔴 A ROUTE THAT NEVER BECAME READY WAS NOT SWEPT, and counting it as clean is the
  // failure this whole family of tools is written against.
  if (missed) console.log(`  ⚠ ${missed} route×width combinations never became ready`);
  console.log(`  swept ${swept}`);

  // ------------------------------------------------------- ② 125% root font-size
  console.log('\n② root font-size 125% — WCAG 1.4.4');
  for (const width of [390, 1024]) {
    await metrics(width);
    for (const route of ROUTES) {
      if (!await land(route)) { missed += 1; continue; }
      await evaluate(`document.documentElement.style.fontSize = '125%'; true`);
      await sleep(120);
      record('125%', `${width}px ${route}`, await evaluate(overflowProbe(width)));
    }
    console.log(`  ${width}: ${ROUTES.length} routes`);
  }

  // ------------------------------------------------- ③ forced-colors: active
  console.log('\n③ forced-colors: active — Windows High Contrast');
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'forced-colors', value: 'active' }],
  });
  await metrics(1024);
  const invisible = [];
  let controlsSeen = 0;
  for (const route of ROUTES) {
    if (!await land(route)) { missed += 1; continue; }
    record('forced-colors', `1024px ${route}`, await evaluate(overflowProbe(1024)));
    // 🔑 THE POINT IS NOT THAT IT LOOKS THE SAME. Forced colours replace the token layer
    // outright; what must not happen is a control losing its only affordance. A button
    // whose shape came entirely from a background colour becomes an invisible hit area.
    const seen = await evaluate(`(() => {
      const bad = [];
      let examined = 0;
      for (const el of document.querySelectorAll('button, a, [role="button"]')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        examined += 1;
        const s = getComputedStyle(el);
        const named = (el.getAttribute('aria-label') || el.textContent || '').trim();
        // No text, no border, no outline: nothing is left to see.
        const hasEdge = s.borderStyle !== 'none' || s.outlineStyle !== 'none';
        if (!named && !hasEdge) bad.push(el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.split(/\\s+/)[0] : ''));
      }
      return { bad: bad.slice(0, 6), examined };
    })()`);
    controlsSeen += seen.examined;
    if (seen.bad.length) invisible.push(`${route}: ${seen.bad.join(', ')}`);
  }
  await send('Emulation.setEmulatedMedia', { features: [] });
  // 🔴 THE POPULATION, NOT JUST THE VERDICT. "0 offenders" and "the selector matched
  // nothing" print identically, and this arc has now been caught by that shape a dozen
  // times. If `controlsSeen` is small, the zero below is about an empty query.
  console.log(`  ${ROUTES.length} routes; ${controlsSeen} visible controls examined; with no name and no edge: ${invisible.length}`);
  for (const line of invisible) console.log(`    ${line}`);
  if (controlsSeen < 100) {
    console.log('  ⚠ too few controls examined for that zero to mean anything — check the selector');
    missed += 1;
  }
  // ⚠️ WHAT THIS DOES *NOT* PROVE. `Emulation.setEmulatedMedia` makes the
  // `forced-colors: active` media query MATCH; it does not install the Windows High
  // Contrast palette, so the colours on screen here are still this design's own. What is
  // being checked is therefore the STRUCTURE the app falls back to — that no control's
  // only affordance was a background fill — and not the rendered result. The rendered
  // result needs a real Windows session, and that is P8's, on `devicePass.md`.

  // ------------------------------------------------------ ④ resize mid-dialog
  console.log('\n④ resize mid-dialog — laid out wide, then narrowed');
  await metrics(1440, 900);
  const resized = [];
  if (await land('/members')) {
    for (let i = 0; i < 80; i++) {
      if (await evaluate(`document.querySelectorAll('tbody tr').length > 1`) === true) break;
      await sleep(150);
    }
    const opened = await evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find((n) => /open the record for/i.test(n.getAttribute('aria-label') || ''));
      if (!b) return false;
      b.click();
      return true;
    })()`);
    await sleep(600);
    const isOpen = await evaluate(`!!document.querySelector('[role="dialog"]')`);
    if (!opened || !isOpen) {
      resized.push('the dialog never opened at 1440, so nothing was resized');
    } else {
      // 🔴 THE RESIZE IS THE TEST. React does not re-mount on a viewport change, so any
      // layout the dialog computed once — a measured position, a captured width — survives
      // into a viewport it was never meant for.
      await metrics(390, 844);
      await sleep(700);
      const r = await evaluate(overflowProbe(390));
      const stillOpen = await evaluate(`!!document.querySelector('[role="dialog"]')`);
      const reachable = await evaluate(`(() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return false;
        const box = d.getBoundingClientRect();
        // Its top-left must be on screen, and it must not be wider than the phone.
        return box.left >= -1 && box.top >= -1 && box.width <= 391;
      })()`);
      record('resize', '1440 → 390 /members dialog', r, { stillOpen, reachable });
      if (!stillOpen) resized.push('the dialog vanished when the viewport narrowed');
      if (!reachable) resized.push('the dialog is off-screen or wider than the viewport after the resize');
    }
  } else {
    resized.push('/members never became ready');
  }
  for (const line of resized) console.log(`  ⚠ ${line}`);
  if (!resized.length) console.log('  the dialog survived the resize, on screen and within the viewport');

  writeFileSync('reports/edges.json', JSON.stringify(findings, null, 2));

  // ------------------------------------------------------------------ verdict
  // 🔴 THE POPULATION CHECK, AND THIS TOOL IS WHY IT EXISTS. Its forced-colors sweep
  // reported 25 clean rows over three pages where React had not rendered at all. Every row
  // now carries its own element count and a blank one is a FAILURE rather than a clean
  // measurement -- see `pageReady` in probe.mjs for the five conditions a bare shell met.
  const populationIssues = populationComplaints(findings);
  for (const complaint of populationIssues) console.log(`  POPULATION  ${complaint}`);
  const bad = findings.filter((f) => f.overflows);
  console.log(`\n${findings.length} measurements, ${bad.length} overflowing`);
  for (const f of bad.slice(0, 30)) {
    console.log(`  ${f.kind.padEnd(14)} ${f.where}`);
    console.log(`      scroll=${f.scrollWidth} asked=${f.requested} offenders=${f.offenderCount}`);
    for (const o of f.offenders.slice(0, 4)) console.log(`      ${o}`);
  }
  if (bad.length || invisible.length || resized.length || missed || populationIssues.length) process.exitCode = 1;
} catch (e) {
  console.error('edges failed:', e.message);
  process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch { /* closed */ }
  chrome.kill();
}
