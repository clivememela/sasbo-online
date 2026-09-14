/**
 * `05.1`'s responsive matrix, in ONE browser. Overflow measured on every route at every
 * width; screenshots optional.
 *
 * 🔴 TRUE DEVICE METRICS, NOT A RESIZED WINDOW (T14). Headless Chrome will not lay out
 * below roughly 500px and silently CROPS instead — so `--window-size=390,844` renders a
 * wider page and cuts the right-hand side off, and every "390px" capture taken that way is
 * a 500px-plus page with a slice missing. It cost this arc two undetected defects in its
 * own mockups and invalidated five review passes. `Emulation.setDeviceMetricsOverride`
 * with `mobile: true` is the only thing that produces a real 390px viewport.
 *
 * 🔴 AND THE VIEWPORT IS ASSERTED, NOT ASSUMED. A navigation can drop the override, so
 * every measurement below carries the `innerWidth` it was actually taken at, and a
 * mismatch is reported rather than quietly averaged in. A matrix that says "390" and
 * measured 800 is worse than no matrix.
 *
 * 🔑 ONE CHROME FOR THE WHOLE RUN. `shot.mjs` launches one per capture, which is right for
 * a single shot and wrong for 27 routes × 6 widths: ~160 launches at several seconds each,
 * on a host that has been under 1 GB free.
 *
 *   node tools/matrix.mjs <baseUrl> [--shots <dir>] [--routes a,b,c] [--widths 320,390]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { launch } from './cdp.mjs';
import { ROUTES as ALL_ROUTES, SETTLED, overflowProbe, pageReady, populationComplaints, routeComplaints, storeTheme, themeDimensionComplaints, themeReadout } from './probe.mjs';

const args = process.argv.slice(2);
const baseUrl = args[0] ?? 'http://127.0.0.1:4319';
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const shotsDir = flag('--shots');

/**
 * The matrix, from `responsiveness.md`.
 *
 * ⚠️ 1349, NOT 1366. That is the 1366 laptop with its scrollbar taken off — emulated
 * Chromium has OVERLAY scrollbars, so asking for 1366 would give the page 1366 usable
 * pixels and reproduce a machine nobody owns.
 */
const WIDTHS = (flag('--widths') ?? '320,390,768,1024,1349,1440').split(',').map(Number);
const LANDSCAPE = { width: 844, height: 390, label: '844x390 landscape' };

// One list, shared with the edge sweep -- see probe.mjs.
const ROUTES = (flag('--routes') ?? ALL_ROUTES.join(',')).split(',');

const THEMES = ['light', 'dark'];

const rows = [];
let failures = 0;
let cdp;

try {
  // The browser, the socket, the strict `evaluate`, the viewport rule and T23's identity
  // check all live in `cdp.mjs` — see its header for the four defects six hand-copies of this
  // block had already drifted into.
  cdp = await launch('matrix');
  const { send, evaluate, metrics, waitFor, assertBuiltClient } = cdp;

  console.log('identity OK — entry script', await assertBuiltClient(baseUrl));

  if (shotsDir) mkdirSync(shotsDir, { recursive: true });

  const viewports = [
    ...WIDTHS.map((w) => ({ width: w, height: w < 500 ? 844 : 900, label: String(w) })),
    LANDSCAPE,
  ];

  for (const vp of viewports) {
    for (const theme of THEMES) {
      for (const route of ROUTES) {
        // Re-applied per route on purpose: a navigation can DROP the override, and a matrix
        // that says 390 while measuring 800 is worse than no matrix. `viewportHeld` below is
        // the assertion that it held.
        await metrics(vp.width, vp.height);
        const target = baseUrl + route;
        // 🔴 BEFORE THE NAVIGATION. Applied afterwards it landed before React mounted,
        // and `ThemeContext`'s mount effect re-applied the class from its own state -- so
        // every "dark" row in the 350 was the light page measured again. `probe.mjs`.
        await evaluate(storeTheme(theme === 'dark'));
        try {
          await send('Page.navigate', { url: target });
        } catch (e) {
          throw new Error(`navigate failed for ${JSON.stringify(target)} (route=${JSON.stringify(route)}): ${e.message}`);
        }
        // 🔴 A WAIT THAT GIVES UP MUST SAY SO. This loop used to run out of attempts and
        // then measure anyway, silently — and it did: `/members/capture` at 390, the
        // heaviest route in the application, exceeded the budget on a loaded host and was
        // measured with no stylesheet applied. An unstyled page has a different layout, so
        // its "no overflow" was a fact about a page nobody will ever see. It was one row in
        // 350, which is exactly the rate at which a timeout gets averaged into a clean
        // result. The budget is generous, and running out of it is now a REPORTED FAILURE
        // rather than a measurement.
        // Ready, and then STILL: a row's entrance or a panel's slide measured mid-flight is a
        // layout nobody sees (T5). This was a fixed 250ms -- a guess about the machine.
        const ready = await waitFor(pageReady, { tries: 120 }) && await waitFor(SETTLED, { tries: 120, awaitPromise: true });

        // 🔑 THE READOUT AND THE PROBE IN ONE EVALUATE, ON ONE TICK. They are two pure reads
        // of the same settled page, and taking them separately was both a wasted round-trip
        // per row (336 of them) and a window in which the page could change between the colour
        // and the layout. `states.mjs` states the rule this follows: same tick as the probe,
        // same tick as the screenshot.
        const { paint, r } = await evaluate(
          `({ paint: ${themeReadout}, r: ${overflowProbe(vp.width)} })`,
        );
        // Measured against the width we ASKED for, never against what the page
        // reports back — see the probe's own note, and [T25].
        const viewportHeld = r.innerWidth === vp.width;
        const overflows = r.scrollWidth > vp.width + 1 || r.offenderCount > 0;
        if (!viewportHeld || overflows || !ready) failures += 1;
        if (!ready) console.log(`  ⚠ NEVER READY  ${vp.label} ${theme} ${route} — not measured`);
        rows.push({ width: vp.label, theme, route, ...r, viewportHeld, overflows, ready, theme_dark: paint?.dark, theme_bg: paint?.bg });

        if (shotsDir) {
          const { data } = await send('Page.captureScreenshot', { format: 'png' });
          const name = `${vp.label}-${theme}-${route.replace(/\W+/g, '_') || 'root'}.png`;
          writeFileSync(join(shotsDir, name), Buffer.from(data, 'base64'));
        }
      }
    }
    console.log(`  ${vp.label}: ${ROUTES.length * THEMES.length} measured`);
  }
} catch (e) {
  console.error('matrix failed:', e.message);
  process.exitCode = 1;
} finally {
  cdp?.close();
}

writeFileSync('reports/matrix.json', JSON.stringify(rows, null, 2));

const bad = rows.filter((r) => r.overflows || !r.viewportHeld || !r.ready);
console.log(`\nmeasured ${rows.length} route×width×theme combinations`);
console.log(`viewport mismatches: ${rows.filter((r) => !r.viewportHeld).length}`);
console.log(`horizontal overflow: ${rows.filter((r) => r.overflows).length}`);
for (const r of bad.slice(0, 40)) {
  console.log(
    `  ${r.width.padEnd(16)} ${r.theme.padEnd(5)} ${r.route.padEnd(42)} ` +
    `asked=${r.requested} inner=${r.innerWidth} scroll=${r.scrollWidth}` +
    (r.viewportHeld ? '' : '  ⚠ VIEWPORT NOT HELD') +
    (r.offenders.length ? `\n      ${r.offenders.join('\n      ')}` : ''),
  );
}
// 🔑 THE THEME DIMENSION IS PROVED, NOT COUNTED. Half of this matrix claims to be the
// dark theme; until the two halves are shown to render differently, "350 combinations" is
// 175 measured twice.
const populationIssues = populationComplaints(rows);
for (const complaint of populationIssues) console.log(`  POPULATION  ${complaint}`);
// "Every route" is held against the router -- unless a subset was asked for by name.
const routeIssues = flag('--routes') ? [] : routeComplaints();
for (const complaint of routeIssues) console.log(`  ROUTES  ${complaint}`);
const themeComplaints = themeDimensionComplaints(rows);
for (const complaint of themeComplaints) console.log(`  THEME  ${complaint}`);
console.log(`body background by theme: ${[...new Set(rows.map((r) => `${r.theme}=${r.theme_bg}`))].sort().join('  ')}`);

if (failures || themeComplaints.length || populationIssues.length || routeIssues.length) process.exitCode = 1;
