/**
 * Proves the matrix's overflow probe can SEE overflow. `05.1`.
 *
 * 🔴 350 COMBINATIONS CAME BACK WITH ZERO OFFENDERS, AND THAT IS EXACTLY WHEN TO STOP AND
 * CHECK. A probe whose `querySelectorAll` returned nothing, whose `getBoundingClientRect`
 * read a detached tree, or whose viewport was never actually 320px would report the same
 * clean zero — and a clean zero is also what success looks like. This arc has now hit that
 * shape eleven times.
 *
 * So: plant an element that is definitively wider than the viewport, run the SAME probe
 * expression the matrix runs, and require it to be caught. Then remove it and require the
 * page to come back clean, because a probe that reports overflow unconditionally is the
 * other way to be useless.
 */
import { spawn } from 'node:child_process';

// 🔑 THE SAME MODULE THE MEASURING TOOLS IMPORT. When this file carried its own copy, the
// three bodies had already drifted to three different hashes — so the canary was proving a
// probe nothing else ran. Importing it is what makes a pass here mean anything there.
import { overflowProbe, storeTheme, themeReadout } from './probe.mjs';

const CHROME = 'C:/Users/mfazl/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4319';
const WIDTH = 390;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9500 + Math.floor(Math.random() * 80);
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/canary-profile-' + PORT, 'about:blank',
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

let failed = false;
try {
  let targets;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      if (targets.some((t) => t.type === 'page')) break;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  const page = targets.find((t) => t.type === 'page');
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
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: baseUrl + '/members' });
  for (let i = 0; i < 60; i++) {
    if (await evaluate(`document.fonts.status === 'loaded' && document.body.children.length > 0`) === true) break;
    await sleep(150);
  }
  await sleep(400);

  // --- 1. the viewport is REALLY 390 (T14) -------------------------------
  const width = await evaluate('innerWidth');
  console.log(`viewport: innerWidth=${width} (requested ${WIDTH})`);
  if (width !== WIDTH) {
    console.error(`FAIL: asked for ${WIDTH}, got ${width}. Headless Chrome crops below ~500px rather than laying out (T14).`);
    failed = true;
  }

  // --- 2. clean before ----------------------------------------------------
  const before = await evaluate(overflowProbe(WIDTH));
  console.log(`before: scrollWidth=${before.scrollWidth} offenders=${before.offenderCount}`);

  // --- 3. plant overflow and require it to be caught ---------------------
  await evaluate(`(() => {
    const el = document.createElement('div');
    el.id = 'overflow-canary';
    el.style.cssText = 'width:1200px;height:20px;background:red';
    document.body.appendChild(el);
    return true;
  })()`);
  await sleep(200);
  const during = await evaluate(overflowProbe(WIDTH));
  const caught = during.offenders.some((o) => o.includes('div'));
  console.log(`planted 1200px div: scrollWidth=${during.scrollWidth} offenders=${during.offenderCount} caught=${caught}`);
  if (!caught || during.offenderCount === 0) {
    console.error('FAIL: the probe did not see a 1200px element in a 390px viewport. Every zero it has reported means nothing.');
    failed = true;
  }
  if (during.scrollWidth <= WIDTH) {
    console.error('FAIL: scrollWidth did not grow past the requested width, so the DoD assertion itself is blind.');
    failed = true;
  }

  // --- 4. and clean again after ------------------------------------------
  await evaluate(`document.getElementById('overflow-canary').remove()`);
  await sleep(200);
  const after = await evaluate(overflowProbe(WIDTH));
  console.log(`after removal: scrollWidth=${after.scrollWidth} offenders=${after.offenderCount}`);
  if (after.offenderCount !== before.offenderCount) {
    console.error('FAIL: the probe does not return to its prior reading, so it is not measuring the page.');
    failed = true;
  }

  // --- 5. the THEME actually changes what is painted ---------------------
  // 🔴 THIS IS THE CHECK THAT WAS MISSING, AND IT COST HALF OF EVERY RUN. Both harnesses
  // reported "× 2 themes" while applying the theme AFTER navigating — which is before React
  // mounts, so `ThemeContext`'s mount effect re-applied the class from its own state and the
  // dark half rendered light. All six light/dark screenshot pairs came out byte-identical.
  // Counting combinations cannot see this; comparing what was painted can.
  const painted = {};
  for (const theme of ['light', 'dark']) {
    await evaluate(storeTheme(theme === 'dark'));
    await send('Page.navigate', { url: baseUrl + '/members' });
    for (let i = 0; i < 60; i++) {
      if (await evaluate(`document.fonts.status === 'loaded' && document.body.children.length > 0`) === true) break;
      await sleep(150);
    }
    await sleep(400);
    painted[theme] = await evaluate(themeReadout);
  }
  console.log(
    `theme: light bg=${painted.light.bg} (.dark=${painted.light.dark})  ` +
    `dark bg=${painted.dark.bg} (.dark=${painted.dark.dark})`,
  );
  if (painted.dark.dark !== true || painted.light.dark !== false) {
    console.error('FAIL: the .dark class does not follow `storeTheme`, so the theme dimension is not being set at all.');
    failed = true;
  }
  if (painted.light.bg === painted.dark.bg) {
    console.error('FAIL: both themes paint the same background. Every dark row in every matrix is the light page measured twice.');
    failed = true;
  }
} catch (e) {
  console.error('canary failed to run:', e.message);
  failed = true;
} finally {
  try { ws && ws.close(); } catch { /* closed */ }
  chrome.kill();
}

console.log(failed ? '\nCANARY FAILED — the matrix result cannot be believed' : '\nCANARY PASSED — the probe sees overflow, and the 390px viewport is real');
if (failed) process.exitCode = 1;
