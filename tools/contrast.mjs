/**
 * Contrast on RENDERED PIXELS, every route, both themes. `05.1`'s last measurement box, and
 * the one MobiZone ticked for a whole arc without ever taking.
 *
 * 🔴 WHY NOT jsdom, WHICH IS WHERE THE SUITE'S axe RUNS. jsdom has no canvas, so axe cannot
 * compute contrast at all -- and, crucially, it does not FAIL when it cannot: it silently
 * reports nothing. `expectNoA11yViolations` disables `color-contrast` for exactly that
 * reason and says so. A rule that always passes because it never ran is worse than an absent
 * rule, because it reads as coverage. This is the run that actually looks.
 *
 * 🔴 T1 -- A PROBE THAT MISSES GRADIENTS PASSES EVERYTHING. MobiZone's first contrast probe
 * passed their entire application because it walked `background-color` up the tree while the
 * shell's background was a gradient; it fell through to white and reported dark-on-dark as
 * `11.37:1 PASS`. Their conclusion is this file's design rule: *"a measurement tool that
 * reports what you hope to see is worse than none."*
 *
 * So this does not walk `background-color`. It runs axe-core IN A REAL BROWSER, where axe
 * composites the actual painted backdrop -- and it treats axe's THIRD bucket as a first-class
 * result rather than a pass:
 *
 *   violations  a computed ratio below the AA threshold           -> a finding
 *   passes      a computed ratio at or above it                   -> fine
 *   incomplete  axe COULD NOT COMPUTE the backdrop (image,        -> REPORTED, never counted
 *               gradient, transform, overlap)                        as a pass
 *
 * ⚠️ `incomplete` IS THE WHOLE OF T1 IN ONE WORD. It is the case where a hand-rolled probe
 * would have guessed white and printed PASS. Every incomplete node is listed with the reason
 * axe gave, so a human decides rather than a default.
 *
 * 🔴 AND THE PROBE IS PROVED BEFORE ITS RESULTS ARE TRUSTED (P7 DoD, T1). Before the sweep,
 * a deliberately unreadable element is planted on a real page and the probe must report it.
 * If the canary does not go red the run ABORTS -- a green sweep from an unproven probe is
 * the failure this whole file exists to avoid.
 *
 *   node tools/contrast.mjs <baseUrl> [--widths 1440,390] [--routes a,b]
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

import { ROUTES as ALL_ROUTES, pageReady, storeTheme, themeDimensionComplaints, themeReadout } from './probe.mjs';

const CHROME = 'C:/Users/mfazl/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';

const args = process.argv.slice(2);
const baseUrl = args[0] ?? 'http://127.0.0.1:4319';
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

/**
 * 1440 and 390.
 *
 * 🔑 CONTRAST IS MEASURED AT TWO WIDTHS BECAUSE IT IS NOT WIDTH-INDEPENDENT, however much it
 * looks it. A colour that only appears in a layout a breakpoint gates -- a mobile drawer, a
 * card that replaces a table row below `md` -- is simply absent from a desktop-only sweep, and
 * "every route, both themes" would be true and still have missed it.
 */
const WIDTHS = (flag('--widths') ?? '1440,390').split(',').map(Number);
const ROUTES = (flag('--routes') ?? ALL_ROUTES.join(',')).split(',');
const THEMES = ['light', 'dark'];

const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9500 + Math.floor(Math.random() * 80);
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/contrast-profile-' + PORT, 'about:blank',
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
/** Long-running expressions need the await; axe takes seconds on a heavy route. */
const evaluate = async (expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'evaluate threw');
  return r.result.value;
};

/**
 * Run axe with ONLY `color-contrast` on, and return all three buckets.
 *
 * The pass count is how this run proves it examined anything: zero violations out of zero
 * examined nodes is the vacuous green every guard in this repository carries a floor against.
 *
 * 🔴 AND `resultTypes` IS DELIBERATELY ABSENT, HAVING BEEN THERE ONCE AND LIED. The first
 * version passed `resultTypes: ['violations', 'incomplete']` as an optimisation. That option
 * does not merely choose what to REPORT -- for every bucket not listed, axe keeps **one node
 * and discards the rest**. So `passCount` came back as exactly 1 per combination, 100 across
 * 100 runs, and the non-vacuity floor below fired on a number that was an artefact of the
 * caller's own option rather than a fact about the pages.
 *
 * 🔑 THE FLOOR CAUGHT IT, WHICH IS THE ONLY REASON IT WAS SEEN -- and it caught a defect in
 * the INSTRUMENT, not in the application, which is the third time this arc has had that exact
 * result. Without the floor the run would have reported 100 combinations swept and one
 * violation found, and the missing 4,000-odd examined nodes would have gone unnoticed
 * entirely, because a small number and a large one both read as "it ran".
 */
const RUN_AXE = `(async () => {
  const r = await window.axe.run(document, {
    runOnly: { type: 'rule', values: ['color-contrast'] },
  });
  const node = (n) => ({
    target: Array.isArray(n.target) ? n.target.join(' ') : String(n.target),
    summary: (n.failureSummary || '').replace(/\\s+/g, ' ').slice(0, 300),
    data: (n.any || []).map((c) => c.data).filter(Boolean),
  });
  return {
    violations: r.violations.flatMap((v) => v.nodes.map(node)),
    incomplete: r.incomplete.flatMap((v) => v.nodes.map(node)),
    passCount: r.passes.reduce((n, p) => n + p.nodes.length, 0),
  };
})()`;

const rows = [];

/** Navigate, settle, inject axe. Shared by the canary and the sweep so both use one path. */
const openForMeasurement = async (route, theme, width) => {
  const mobile = width < 700;
  await send('Emulation.setDeviceMetricsOverride', {
    width, height: mobile ? 844 : 900, deviceScaleFactor: 1, mobile,
  });
  // Before the navigation -- see probe.mjs. Applied after, it lands before React mounts and
  // ThemeContext's mount effect puts it back, so every "dark" row is the light page again.
  await evaluate(storeTheme(theme === 'dark'));
  await send('Page.navigate', { url: baseUrl + route });

  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (await evaluate(pageReady) === true) { ready = true; break; }
    await sleep(150);
  }
  // 🔴 T5: NEVER MEASURE MID-TRANSITION. The shell animates the drawer and the theme swap
  // over 300ms, and a colour sampled halfway through a transition is a colour that exists
  // for one frame and is on no design's palette.
  await sleep(500);
  await evaluate(AXE + '\n;window.__axeReady = typeof window.axe === "object";');
  const injected = await evaluate('window.__axeReady === true');
  if (!injected) throw new Error(`axe did not inject on ${route}`);
  return ready;
};

try {
  let targets;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      if (targets.some((t) => t.type === 'page')) break;
    } catch { /* chrome not up yet */ }
    await sleep(250);
  }
  const page = targets && targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target on port ' + PORT);
  ws = new WebSocket(page.webSocketDebuggerUrl);
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

  // T23: prove the server is the built client before believing a single colour off it.
  await send('Page.navigate', { url: baseUrl + '/login' });
  await sleep(800);
  const identity = await evaluate(`document.querySelector('script[type=module]')?.src || location.href`);
  if (!/\/assets\/index-[A-Za-z0-9_-]+\.js$/.test(identity)) {
    throw new Error(`the server at ${baseUrl} is not the built client (entry script: ${identity})`);
  }
  console.log('identity OK — entry script', identity.split('/').pop());

  // ── THE CANARY, AND THE RUN DOES NOT PROCEED WITHOUT IT ─────────────────────────────
  //
  // A known-broken case, planted on a real page in the real theme, measured through the
  // same `RUN_AXE` the sweep uses. Two halves, because either alone can be satisfied by a
  // broken probe: the deliberate failure must be SEEN, and the page's own nodes must still
  // be examined (a probe that reports one violation and looked at nothing else is equally
  // useless).
  await openForMeasurement('/home', 'light', 1440);
  await evaluate(`(() => {
    const el = document.createElement('p');
    el.id = '__contrast_canary';
    // #777 on #888: a ratio of about 1.4:1, unambiguously below AA's 4.5:1, and chosen
    // rather than a token so the canary cannot be fixed by a palette change.
    el.style.cssText = 'background:#888;color:#777;font-size:14px;padding:8px;position:relative;z-index:9999';
    el.textContent = 'deliberately unreadable canary text';
    document.body.appendChild(el);
    return true;
  })()`);
  const canary = await evaluate(RUN_AXE, true);
  const caughtCanary = canary.violations.some((n) => n.target.includes('__contrast_canary'));
  console.log(
    `canary: ${caughtCanary ? 'CAUGHT' : 'MISSED'} — ` +
    `${canary.violations.length} violation(s), ${canary.passCount} node(s) passed`,
  );
  if (!caughtCanary) {
    throw new Error(
      'the contrast probe did not report a 1.4:1 element that was planted for it. Its ' +
      'results are worthless -- a probe that reports what you hope to see is worse than none (T1).',
    );
  }
  if (canary.passCount === 0) {
    throw new Error(
      'the probe caught the canary and examined nothing else. It is not sweeping the page.',
    );
  }

  // ── THE SWEEP ───────────────────────────────────────────────────────────────────────
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      for (const route of ROUTES) {
        const ready = await openForMeasurement(route, theme, width);
        const paint = await evaluate(themeReadout);
        const r = await evaluate(RUN_AXE, true);
        rows.push({
          width, theme, route, ready,
          violations: r.violations, incomplete: r.incomplete, passCount: r.passCount,
          theme_dark: paint?.dark, theme_bg: paint?.bg,
        });
        if (!ready) console.log(`  ⚠ NEVER READY  ${width} ${theme} ${route}`);
      }
      console.log(`  ${width} ${theme}: ${ROUTES.length} routes measured`);
    }
  }
} catch (e) {
  console.error('contrast failed:', e.message);
  process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch { /* already closed */ }
  chrome.kill();
}

writeFileSync('reports/contrast.json', JSON.stringify(rows, null, 2));

const failing = rows.filter((r) => r.violations.length);
const unclear = rows.filter((r) => r.incomplete.length);
const examined = rows.reduce((n, r) => n + r.passCount, 0);

console.log(`\nmeasured ${rows.length} route×width×theme combinations on rendered pixels`);
console.log(`text nodes examined and PASSING: ${examined}`);
console.log(`combinations with a violation:   ${failing.length}`);
console.log(`combinations axe could not fully compute: ${unclear.length}`);

for (const r of failing.slice(0, 40)) {
  console.log(`\n  ✗ ${r.width} ${r.theme} ${r.route}`);
  for (const n of r.violations.slice(0, 6)) {
    const d = n.data[0];
    console.log(
      `      ${d ? `${d.contrastRatio}:1 (needs ${d.expectedContrastRatio}) ${d.fgColor} on ${d.bgColor}` : n.summary}` +
      `\n        ${n.target}`,
    );
  }
}
// Listed, never counted as a pass. This is the bucket a hand-rolled probe would have
// guessed white for and printed PASS -- which is T1 exactly.
for (const r of unclear.slice(0, 10)) {
  console.log(`\n  ? ${r.width} ${r.theme} ${r.route} — axe could not compute the backdrop for:`);
  for (const n of r.incomplete.slice(0, 4)) console.log(`        ${n.target}  ${n.summary.slice(0, 140)}`);
}

const themeComplaints = themeDimensionComplaints(rows);
for (const complaint of themeComplaints) console.log(`  THEME  ${complaint}`);
console.log(`body background by theme: ${[...new Set(rows.map((r) => `${r.theme}=${r.theme_bg}`))].sort().join('  ')}`);

// 🔑 A NON-VACUITY FLOOR ON THE SWEEP ITSELF. Zero violations across 100 combinations is
// only good news if the combinations contained text. axe examining fewer than a few hundred
// nodes across 25 routes means it ran against shells, not pages.
if (examined < 200) {
  console.log(`\n  ⚠ VACUOUS: only ${examined} text nodes were examined across ${rows.length} combinations.`);
  process.exitCode = 1;
}
if (failing.length || rows.some((r) => !r.ready) || themeComplaints.length) process.exitCode = 1;
