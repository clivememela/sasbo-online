/**
 * `07.3` — LCP, INP and CLS PER ROUTE, BOTH THEMES (R-PERF-N). Recorded, not gated: the plan asks for the numbers.
 *
 * 🔴 LAB NUMBERS, AND SAID SO. A headless Chrome on this machine, a local stub answering in milliseconds, synthetic data.
 * They say which routes are heavier than others and whether a change moved one; they are not what a member on a phone
 * over mobile data will see. The phone row is throttled 4× on the CPU to be less flattering, not to be faithful.
 *
 * How each number is taken, in the page, by the browser's own observers (installed before any script of the app runs):
 *   LCP  the last `largest-contentful-paint` entry before the first input -- the browser stops reporting at input;
 *   CLS  the largest session window of `layout-shift` entries without recent input (1s gap, 5s cap), as web-vitals does;
 *   INP  the longest `event` entry with an `interactionId`, after ONE real click dispatched through CDP on the page's
 *        heading -- an interaction nobody performs is an INP nobody has, so a row without one is a failed row.
 *
 * 🔑 A ROW WITHOUT ITS NUMBERS IS A FAILED ROW, NOT A GOOD ONE. LCP 0 means nothing painted or the observer never ran;
 * an INP that never arrived means the click missed. Either fails the run (the population rule every tool here keeps).
 *
 *   node tools/vitals.mjs <baseUrl> [--routes a,b] [--widths 1440,390]
 */
import { writeFileSync } from 'node:fs';

import { launch } from './cdp.mjs';
import { ROUTES as ALL_ROUTES, SETTLED, pageReady, populationComplaints, storeTheme, themeDimensionComplaints, themeReadout } from './probe.mjs';

const args = process.argv.slice(2);
const baseUrl = args[0] ?? 'http://127.0.0.1:4319';
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const ROUTES = (flag('--routes') ?? ALL_ROUTES.join(',')).split(',');
const WIDTHS = (flag('--widths') ?? '1440,390').split(',').map(Number);
const THEMES = ['light', 'dark'];

const OBSERVE = `(() => {
  const v = { lcp: 0, cls: 0, inp: 0, interactions: 0, inputAt: null };
  window.__vitals = v;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (v.inputAt === null) v.lcp = e.renderTime || e.loadTime || e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    let session = 0; let first = 0; let last = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        if (session && e.startTime - last < 1000 && e.startTime - first < 5000) { session += e.value; } else { session = e.value; first = e.startTime; }
        last = e.startTime;
        v.cls = Math.max(v.cls, session);
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.interactionId) continue;
        v.interactions += 1;
        v.inp = Math.max(v.inp, e.duration);
      }
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    addEventListener('pointerdown', () => { if (v.inputAt === null) v.inputAt = performance.now(); }, { capture: true, once: true });
  } catch (e) { v.error = String(e); }
})()`;

const rows = [];
let cdp;
try {
  cdp = await launch('vitals');
  const { send, evaluate, metrics, waitFor, assertBuiltClient } = cdp;
  console.log('identity OK — entry script', await assertBuiltClient(baseUrl));
  await send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVE });

  for (const width of WIDTHS) {
    const phone = width < 700;
    await send('Emulation.setCPUThrottlingRate', { rate: phone ? 4 : 1 });
    for (const theme of THEMES) {
      for (const route of ROUTES) {
        await metrics(width);
        await send('Emulation.setTouchEmulationEnabled', phone ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
        await evaluate(storeTheme(theme === 'dark'));
        await send('Page.navigate', { url: baseUrl + route });
        const ready = await waitFor(pageReady, { tries: 160 }) && await waitFor(SETTLED, { tries: 160, awaitPromise: true });

        // One real click, on the page's heading: text a person would tap without it doing anything.
        const target = await evaluate(`(() => {
          const el = document.querySelector('main h1') || document.querySelector('h1');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 };
        })()`);
        let clicked = false;
        if (ready && target) {
          for (const type of ['mousePressed', 'mouseReleased']) {
            await send('Input.dispatchMouseEvent', { type, x: target.x, y: target.y, button: 'left', clickCount: 1 });
          }
          clicked = await waitFor('(window.__vitals?.interactions ?? 0) > 0', { tries: 40 });
        }
        const v = await evaluate('window.__vitals ?? null');
        const { paint, elements } = await evaluate(`({ paint: ${themeReadout}, elements: document.querySelectorAll('#root *').length })`);
        const row = {
          width, theme, route, ready, clicked, elements,
          lcp: Math.round(v?.lcp ?? 0), cls: Number((v?.cls ?? 0).toFixed(3)), inp: Math.round(v?.inp ?? 0),
          observerError: v?.error, theme_dark: paint?.dark, theme_bg: paint?.bg,
        };
        rows.push(row);
        const missing = [!ready && 'never ready', !target && 'no heading to click', !clicked && 'the click produced no interaction', !row.lcp && 'no LCP'].filter(Boolean);
        console.log(`  ${missing.length ? '✗' : '·'} ${String(width).padEnd(5)} ${theme.padEnd(5)} ${route.padEnd(42)} LCP ${String(row.lcp).padStart(5)}ms  INP ${String(row.inp).padStart(4)}ms  CLS ${row.cls}${missing.length ? `  — ${missing.join(', ')}` : ''}`);
      }
    }
  }
  await send('Emulation.setCPUThrottlingRate', { rate: 1 });
} catch (e) {
  console.error('vitals failed:', e.message);
  process.exitCode = 1;
} finally {
  cdp?.close();
}

writeFileSync('reports/vitals.json', JSON.stringify(rows, null, 2));

const failed = rows.filter((r) => !r.ready || !r.clicked || !r.lcp);
// Web-vitals' own "good" boundaries, reported beside the numbers so a reader does not have to remember them.
const poor = {
  lcp: rows.filter((r) => r.lcp > 2500),
  inp: rows.filter((r) => r.inp > 200),
  cls: rows.filter((r) => r.cls > 0.1),
};
const worst = (key) => rows.reduce((w, r) => (r[key] > (w?.[key] ?? -1) ? r : w), null);
console.log(`\n${rows.length} route×width×theme rows · ${failed.length} without their numbers`);
for (const key of ['lcp', 'inp', 'cls']) {
  const w = worst(key);
  console.log(`${key.toUpperCase()}: worst ${w?.[key]} (${w?.width} ${w?.theme} ${w?.route}) · over the "good" line: ${poor[key].length}`);
}
const population = populationComplaints(rows);
const themes = themeDimensionComplaints(rows);
for (const c of [...population, ...themes]) console.log(`  ${c}`);
if (failed.length || population.length || themes.length) process.exitCode = 1;
